-- Staff access management. Existing administrators can grant/revoke staff roles by
-- verified Auth email; the first administrator is claimed only from a trusted SQL
-- bootstrap allowlist.

alter table public.staff_members
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists granted_by uuid references auth.users(id) on delete set null;

create table if not exists public.staff_admin_bootstrap (
  email text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
  note text not null default '',
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  check (length(email) between 3 and 320)
);
alter table public.staff_admin_bootstrap enable row level security;
revoke all on public.staff_admin_bootstrap from anon, authenticated;

create schema if not exists staff_private;
revoke all on schema staff_private from public;
grant usage on schema staff_private to authenticated;

create or replace function staff_private.normalized_email(p_email text)
returns text language sql immutable set search_path = '' as $$
  select nullif(lower(trim(p_email)), '');
$$;

create or replace function staff_private.require_admin()
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid;
begin
  actor_id := (select auth.uid());
  if actor_id is null or not exists (
    select 1 from public.staff_members sm
    where sm.user_id = actor_id and sm.role = 'administrator'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return actor_id;
end;
$$;

create or replace function staff_private.lock_admin_invariants()
returns void language sql set search_path = '' as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('heal-edutech-staff-admin-invariants', 0));
$$;

create or replace function staff_private.ensure_valid_role(p_role text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p_role not in ('librarian', 'administrator') then
    raise exception 'Staff role must be librarian or administrator' using errcode = '22023';
  end if;
  return p_role;
end;
$$;

create or replace function staff_private.find_user_by_email(p_email text)
returns table(user_id uuid, email text) language plpgsql security definer set search_path = '' as $$
declare norm_email text;
begin
  norm_email := staff_private.normalized_email(p_email);
  if norm_email is null or length(norm_email) > 320 or position('@' in norm_email) <= 1 then
    raise exception 'A valid account email is required' using errcode = '22023';
  end if;
  return query
    select u.id, u.email::text
    from auth.users u
    where lower(u.email) = norm_email
    limit 1;
end;
$$;

create or replace function staff_private.assert_admin_will_remain(p_target_user_id uuid, p_next_role text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.staff_members sm
    where sm.user_id = p_target_user_id and sm.role = 'administrator'
  )
  and coalesce(p_next_role, '') <> 'administrator'
  and not exists (
    select 1 from public.staff_members sm
    where sm.role = 'administrator' and sm.user_id <> p_target_user_id
  ) then
    raise exception 'At least one administrator must remain' using errcode = '55000';
  end if;
end;
$$;

create or replace function staff_private._staff_access_status()
returns table(
  current_user_email text,
  current_staff_role text,
  has_administrator boolean,
  can_claim_initial_admin boolean
) language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  actor_email text;
  actor_role text;
  administrator_exists boolean;
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select u.email::text into actor_email
  from auth.users u
  where u.id = actor_id;

  select sm.role into actor_role
  from public.staff_members sm
  where sm.user_id = actor_id;

  administrator_exists := exists (
    select 1 from public.staff_members sm
    where sm.role = 'administrator'
  );

  return query select
    actor_email,
    actor_role,
    administrator_exists,
    (
      not administrator_exists
      and actor_email is not null
      and exists (
        select 1 from public.staff_admin_bootstrap b
        where b.email = staff_private.normalized_email(actor_email)
          and b.used_at is null
      )
    );
end;
$$;

create or replace function staff_private._claim_initial_admin()
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  actor_email text;
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  perform staff_private.lock_admin_invariants();
  if exists (select 1 from public.staff_members sm where sm.role = 'administrator') then
    raise exception 'Initial administrator has already been claimed' using errcode = '55000';
  end if;

  select u.email::text into actor_email
  from auth.users u
  where u.id = actor_id and u.email_confirmed_at is not null;
  if actor_email is null then
    raise exception 'A confirmed email account is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.staff_admin_bootstrap b
    where b.email = staff_private.normalized_email(actor_email)
      and b.used_at is null
  ) then
    raise exception 'This account is not approved to claim initial administrator access' using errcode = '42501';
  end if;

  insert into public.staff_members(user_id, role, granted_by, updated_at)
  values (actor_id, 'administrator', actor_id, now())
  on conflict on constraint staff_members_pkey do update
  set role = 'administrator',
      granted_by = excluded.granted_by,
      updated_at = now();

  update public.staff_admin_bootstrap as b
  set used_at = now(), used_by = actor_id
  where b.email = staff_private.normalized_email(actor_email)
    and b.used_at is null;

  return query
    select sm.user_id, actor_email, sm.role, sm.created_at, sm.updated_at, sm.granted_by, actor_email
    from public.staff_members sm
    where sm.user_id = actor_id;
end;
$$;

create or replace function staff_private._list_staff_members()
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language plpgsql security definer set search_path = '' as $$
begin
  perform staff_private.require_admin();
  return query
    select sm.user_id,
           u.email::text,
           sm.role,
           sm.created_at,
           sm.updated_at,
           sm.granted_by,
           gu.email::text
    from public.staff_members sm
    join auth.users u on u.id = sm.user_id
    left join auth.users gu on gu.id = sm.granted_by
    order by case sm.role when 'administrator' then 0 else 1 end, lower(u.email);
end;
$$;

create or replace function staff_private._set_staff_access(p_email text, p_role text)
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  target_id uuid;
  target_email text;
  next_role text;
begin
  actor_id := staff_private.require_admin();
  next_role := staff_private.ensure_valid_role(p_role);
  select f.user_id, f.email into target_id, target_email
  from staff_private.find_user_by_email(p_email) f;
  if target_id is null then
    raise exception 'No Auth account exists for that email' using errcode = '23503';
  end if;

  perform staff_private.lock_admin_invariants();
  perform staff_private.assert_admin_will_remain(target_id, next_role);

  insert into public.staff_members(user_id, role, granted_by, updated_at)
  values (target_id, next_role, actor_id, now())
  on conflict on constraint staff_members_pkey do update
  set role = excluded.role,
      granted_by = excluded.granted_by,
      updated_at = now();

  return query
    select sm.user_id,
           target_email,
           sm.role,
           sm.created_at,
           sm.updated_at,
           sm.granted_by,
           gu.email::text
    from public.staff_members sm
    left join auth.users gu on gu.id = sm.granted_by
    where sm.user_id = target_id;
end;
$$;

create or replace function staff_private._revoke_staff_access(p_email text)
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  target_email text;
  removed public.staff_members%rowtype;
begin
  perform staff_private.require_admin();
  select f.user_id, f.email into target_id, target_email
  from staff_private.find_user_by_email(p_email) f;
  if target_id is null then
    raise exception 'No Auth account exists for that email' using errcode = '23503';
  end if;

  perform staff_private.lock_admin_invariants();
  perform staff_private.assert_admin_will_remain(target_id, null);

  delete from public.staff_members as sm
  where sm.user_id = target_id
  returning * into removed;
  if removed.user_id is null then
    raise exception 'That account does not have staff access' using errcode = '23503';
  end if;

  return query
    select removed.user_id,
           target_email,
           removed.role,
           removed.created_at,
           removed.updated_at,
           removed.granted_by,
           gu.email::text
    from (select 1) anchor
    left join auth.users gu on gu.id = removed.granted_by;
end;
$$;

create or replace function staff_private.assign_staff_from_dashboard(
  p_email text,
  p_role text,
  p_granted_by_email text default null
) returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  target_email text;
  next_role text;
  granter_id uuid;
  granter_email text;
begin
  next_role := staff_private.ensure_valid_role(p_role);

  select f.user_id, f.email into target_id, target_email
  from staff_private.find_user_by_email(p_email) f;
  if target_id is null then
    raise exception 'No Auth account exists for that email' using errcode = '23503';
  end if;

  if staff_private.normalized_email(p_granted_by_email) is not null then
    select f.user_id, f.email into granter_id, granter_email
    from staff_private.find_user_by_email(p_granted_by_email) f;
    if granter_id is null then
      raise exception 'No Auth account exists for the granting email' using errcode = '23503';
    end if;
  end if;

  perform staff_private.lock_admin_invariants();
  perform staff_private.assert_admin_will_remain(target_id, next_role);

  insert into public.staff_members(user_id, role, granted_by, updated_at)
  values (target_id, next_role, granter_id, now())
  on conflict on constraint staff_members_pkey do update
  set role = excluded.role,
      granted_by = excluded.granted_by,
      updated_at = now();

  return query
    select sm.user_id,
           target_email,
           sm.role,
           sm.created_at,
           sm.updated_at,
           sm.granted_by,
           granter_email
    from public.staff_members sm
    where sm.user_id = target_id;
end;
$$;

revoke all on all functions in schema staff_private from public;
grant execute on function staff_private._staff_access_status() to authenticated;
grant execute on function staff_private._claim_initial_admin() to authenticated;
grant execute on function staff_private._list_staff_members() to authenticated;
grant execute on function staff_private._set_staff_access(text,text) to authenticated;
grant execute on function staff_private._revoke_staff_access(text) to authenticated;
revoke all on function staff_private.assign_staff_from_dashboard(text,text,text) from public, anon, authenticated;

create or replace function public.staff_access_status()
returns table(
  current_user_email text,
  current_staff_role text,
  has_administrator boolean,
  can_claim_initial_admin boolean
) language sql security invoker set search_path = public, staff_private, pg_temp as $$
  select * from staff_private._staff_access_status();
$$;

create or replace function public.claim_initial_admin()
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language sql security invoker set search_path = public, staff_private, pg_temp as $$
  select * from staff_private._claim_initial_admin();
$$;

create or replace function public.list_staff_members()
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language sql security invoker set search_path = public, staff_private, pg_temp as $$
  select * from staff_private._list_staff_members();
$$;

create or replace function public.set_staff_access(p_email text, p_role text)
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language sql security invoker set search_path = public, staff_private, pg_temp as $$
  select * from staff_private._set_staff_access(p_email, p_role);
$$;

create or replace function public.revoke_staff_access(p_email text)
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  granted_by uuid,
  granted_by_email text
) language sql security invoker set search_path = public, staff_private, pg_temp as $$
  select * from staff_private._revoke_staff_access(p_email);
$$;

revoke all on function public.staff_access_status() from public, anon;
revoke all on function public.claim_initial_admin() from public, anon;
revoke all on function public.list_staff_members() from public, anon;
revoke all on function public.set_staff_access(text,text) from public, anon;
revoke all on function public.revoke_staff_access(text) from public, anon;
grant execute on function public.staff_access_status() to authenticated;
grant execute on function public.claim_initial_admin() to authenticated;
grant execute on function public.list_staff_members() to authenticated;
grant execute on function public.set_staff_access(text,text) to authenticated;
grant execute on function public.revoke_staff_access(text) to authenticated;

insert into public.staff_admin_bootstrap(email, note)
values ('gsharsh11235@gmail.com', 'Initial HealEduTech application administrator')
on conflict (email) do update
set note = excluded.note;
