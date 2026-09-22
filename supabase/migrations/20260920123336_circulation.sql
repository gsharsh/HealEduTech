-- S03 circulation foundation. Lending stays disabled until EVG approves policy.
create table public.circulation_policy (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  max_active_loans integer not null default 1 check (max_active_loans between 1 and 100),
  timezone text not null default 'Asia/Ho_Chi_Minh' check (length(trim(timezone)) between 1 and 80),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.circulation_policy (id) values (1);
alter table public.circulation_policy enable row level security;
revoke all on public.circulation_policy from anon, authenticated;
grant select on public.circulation_policy to authenticated;
create policy circulation_policy_read on public.circulation_policy
  for select to authenticated
  using (true);

alter table public.book_copies add column condition text not null default 'usable'
  check (condition in ('usable', 'damaged', 'lost', 'withdrawn'));
alter table public.book_copies add column shelf_location text not null default ''
  check (length(shelf_location) <= 120);

create table public.circulation_borrowers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  eligible boolean not null default true,
  created_at timestamptz not null default now(),
  registered_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);
alter table public.circulation_borrowers enable row level security;
revoke all on public.circulation_borrowers from anon, authenticated;
grant select on public.circulation_borrowers to authenticated;
create policy borrower_read_own_or_staff on public.circulation_borrowers
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.staff_members where user_id = (select auth.uid()))
  );

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  borrower_user_id uuid not null references public.circulation_borrowers(user_id) on delete restrict,
  copy_id uuid not null references public.book_copies(id) on delete restrict,
  checked_out_at timestamptz not null default now(),
  due_date date not null,
  resolved_at timestamptz,
  resolution text check (resolution is null or resolution in ('returned', 'lost')),
  return_condition text check (return_condition is null or return_condition in ('usable', 'damaged')),
  checked_out_by uuid not null references auth.users(id) on delete restrict,
  resolved_by uuid references auth.users(id) on delete restrict,
  check (
    (resolved_at is null and resolution is null and return_condition is null)
    or (
      resolved_at is not null
      and resolution is not null
      and (
        (resolution = 'returned' and return_condition is not null)
        or (resolution = 'lost' and return_condition is null)
      )
    )
  )
);
alter table public.loans enable row level security;
revoke all on public.loans from anon, authenticated;
grant select on public.loans to authenticated;
create policy loans_read_own_or_staff on public.loans
  for select to authenticated
  using (
    borrower_user_id = (select auth.uid())
    or exists (select 1 from public.staff_members where user_id = (select auth.uid()))
  );
create unique index loans_one_active_per_copy_idx on public.loans(copy_id) where resolved_at is null;
create index loans_borrower_active_idx on public.loans(borrower_user_id) where resolved_at is null;
create index loans_due_date_idx on public.loans(due_date) where resolved_at is null;

create table public.circulation_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  loan_id uuid not null references public.loans(id) on delete restrict,
  event_type text not null check (event_type in ('checkout', 'returned', 'lost', 'correction')),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.circulation_events enable row level security;
revoke all on public.circulation_events from anon, authenticated;
grant select on public.circulation_events to authenticated;
create policy circulation_events_read_own_or_staff on public.circulation_events
  for select to authenticated
  using (
    exists (
      select 1 from public.loans l
      where l.id = loan_id and l.borrower_user_id = (select auth.uid())
    )
    or exists (select 1 from public.staff_members where user_id = (select auth.uid()))
  );

-- Public catalogue code needs an availability count, not loan or borrower rows.
create or replace view public.book_availability as
select
  b.id as book_id,
  count(c.id)::integer as total_copies,
  count(c.id) filter (where c.condition = 'usable' and l.id is null)::integer as available_copies
from public.books b
left join public.book_copies c on c.book_id = b.id
left join public.loans l on l.copy_id = c.id and l.resolved_at is null
group by b.id;
revoke all on public.book_availability from anon, authenticated;
grant select on public.book_availability to anon, authenticated;

create schema if not exists circulation_private;
revoke all on schema circulation_private from public;
grant usage on schema circulation_private to authenticated;

create function circulation_private.require_staff()
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare actor_id uuid;
begin
  actor_id := (select auth.uid());
  if actor_id is null or not exists (select 1 from public.staff_members where user_id = actor_id) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  return actor_id;
end;
$$;

create function circulation_private.require_admin()
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare actor_id uuid;
begin
  actor_id := (select auth.uid());
  if actor_id is null or not exists (select 1 from public.staff_members where user_id = actor_id and role = 'administrator') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return actor_id;
end;
$$;

create function circulation_private.validate_resolution(p_resolution text, p_return_condition text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_resolution is null or p_resolution not in ('returned', 'lost') then
    raise exception 'Valid resolution is required' using errcode = '22023';
  end if;
  if p_resolution = 'returned' and (p_return_condition is null or p_return_condition not in ('usable', 'damaged')) then
    raise exception 'Returned condition is required' using errcode = '22023';
  end if;
  if p_resolution = 'lost' and p_return_condition is not null then
    raise exception 'Lost resolution cannot have a return condition' using errcode = '22023';
  end if;
end;
$$;

create function circulation_private._configure_circulation(p_enabled boolean, p_max_active_loans integer, p_timezone text)
returns public.circulation_policy language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.circulation_policy;
begin
  actor_id := circulation_private.require_admin();
  if p_enabled is null then
    raise exception 'Policy enabled flag is required' using errcode = '22023';
  end if;
  if p_max_active_loans is null or p_max_active_loans < 1 or p_max_active_loans > 100 then
    raise exception 'Maximum active loans must be between 1 and 100' using errcode = '22023';
  end if;
  if p_timezone is null or length(trim(p_timezone)) = 0 or length(trim(p_timezone)) > 80 then
    raise exception 'Timezone is required' using errcode = '22023';
  end if;
  perform now() at time zone trim(p_timezone);
  update public.circulation_policy
  set enabled = p_enabled,
      max_active_loans = p_max_active_loans,
      timezone = trim(p_timezone),
      updated_at = now(),
      updated_by = actor_id
  where id = 1
  returning * into result;
  return result;
end;
$$;

create function circulation_private._register_circulation_borrower(p_user_id uuid, p_display_name text)
returns public.circulation_borrowers language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.circulation_borrowers;
begin
  actor_id := circulation_private.require_staff();
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Borrower account is required' using errcode = '23503';
  end if;
  if p_display_name is null or length(trim(p_display_name)) not between 1 and 120 then
    raise exception 'Display name is required' using errcode = '22023';
  end if;

  insert into public.circulation_borrowers(user_id, display_name, registered_by)
  values (p_user_id, trim(p_display_name), actor_id)
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      eligible = true,
      updated_at = now(),
      registered_by = actor_id
  returning * into result;
  return result;
end;
$$;

create function circulation_private._set_circulation_borrower_eligibility(p_user_id uuid, p_eligible boolean)
returns public.circulation_borrowers language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.circulation_borrowers;
begin
  perform circulation_private.require_staff();
  if p_user_id is null or p_eligible is null then
    raise exception 'Borrower and eligibility are required' using errcode = '22023';
  end if;
  update public.circulation_borrowers
  set eligible = p_eligible, updated_at = now()
  where user_id = p_user_id
  returning * into result;
  if result.user_id is null then
    raise exception 'Borrower is not registered' using errcode = '23503';
  end if;
  return result;
end;
$$;

create function circulation_private._checkout_circulation_copy(p_request_id uuid, p_borrower_user_id uuid, p_copy_id uuid, p_due_date date)
returns public.loans language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.loans;
  policy_row public.circulation_policy;
  copy_condition text;
  checkout_payload jsonb;
begin
  actor_id := circulation_private.require_staff();
  if p_request_id is null or p_borrower_user_id is null or p_copy_id is null or p_due_date is null then
    raise exception 'Request, borrower, copy and due date are required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  checkout_payload := jsonb_build_object('borrower_user_id', p_borrower_user_id, 'copy_id', p_copy_id, 'due_date', p_due_date);

  select * into result from public.loans where request_id = p_request_id;
  if result.id is not null then
    if result.borrower_user_id <> p_borrower_user_id or result.copy_id <> p_copy_id or result.due_date <> p_due_date then
      raise exception 'Checkout request conflicts with an existing request' using errcode = '23505';
    end if;
    return result;
  end if;
  if exists (select 1 from public.circulation_events where request_id = p_request_id) then
    raise exception 'Request id was already used by another circulation action' using errcode = '23505';
  end if;

  select * into policy_row from public.circulation_policy where id = 1 for update;
  if not policy_row.enabled then
    raise exception 'Circulation is not enabled' using errcode = '55000';
  end if;

  perform 1 from public.circulation_borrowers where user_id = p_borrower_user_id and eligible for update;
  if not found then
    raise exception 'Borrower is not eligible' using errcode = '42501';
  end if;

  select condition into copy_condition from public.book_copies where id = p_copy_id for update;
  if copy_condition is null then
    raise exception 'Copy not found' using errcode = '23503';
  end if;
  if copy_condition <> 'usable' then
    raise exception 'Copy is not usable' using errcode = '55000';
  end if;
  if p_due_date < ((now() at time zone policy_row.timezone)::date) then
    raise exception 'Due date cannot be before today' using errcode = '22023';
  end if;
  if (select count(*) from public.loans where borrower_user_id = p_borrower_user_id and resolved_at is null) >= policy_row.max_active_loans then
    raise exception 'Borrower has reached the active loan limit' using errcode = '55000';
  end if;

  insert into public.loans(request_id, borrower_user_id, copy_id, due_date, checked_out_by)
  values (p_request_id, p_borrower_user_id, p_copy_id, p_due_date, actor_id)
  returning * into result;
  insert into public.circulation_events(request_id, loan_id, event_type, actor_user_id, payload)
  values (p_request_id, result.id, 'checkout', actor_id, checkout_payload);
  return result;
end;
$$;

create function circulation_private._resolve_circulation_loan(p_request_id uuid, p_loan_id uuid, p_resolution text, p_return_condition text default null)
returns public.loans language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.loans;
  existing_event public.circulation_events;
  resolution_payload jsonb;
begin
  actor_id := circulation_private.require_staff();
  if p_request_id is null or p_loan_id is null then
    raise exception 'Resolution request is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  perform circulation_private.validate_resolution(p_resolution, p_return_condition);
  resolution_payload := jsonb_build_object('loan_id', p_loan_id, 'resolution', p_resolution, 'return_condition', p_return_condition);

  select * into existing_event from public.circulation_events where request_id = p_request_id;
  if existing_event.id is not null then
    if existing_event.loan_id <> p_loan_id or existing_event.event_type <> p_resolution or existing_event.payload <> resolution_payload then
      raise exception 'Resolution request conflicts with an existing request' using errcode = '23505';
    end if;
    select * into result from public.loans where id = p_loan_id;
    return result;
  end if;

  select * into result from public.loans where id = p_loan_id for update;
  if result.id is null then
    raise exception 'Loan not found' using errcode = '23503';
  end if;
  if result.resolved_at is not null then
    raise exception 'Loan is already resolved' using errcode = '55000';
  end if;

  update public.loans
  set resolved_at = now(),
      resolution = p_resolution,
      return_condition = p_return_condition,
      resolved_by = actor_id
  where id = p_loan_id
  returning * into result;
  update public.book_copies
  set condition = case when p_resolution = 'lost' then 'lost' else p_return_condition end
  where id = result.copy_id;
  insert into public.circulation_events(request_id, loan_id, event_type, actor_user_id, payload)
  values (p_request_id, p_loan_id, p_resolution, actor_id, resolution_payload);
  return result;
end;
$$;

create function circulation_private._correct_circulation_resolution(p_request_id uuid, p_loan_id uuid, p_resolution text, p_return_condition text default null)
returns public.loans language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.loans;
  existing_event public.circulation_events;
  correction_payload jsonb;
begin
  actor_id := circulation_private.require_staff();
  if p_request_id is null or p_loan_id is null then
    raise exception 'Correction request is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  perform circulation_private.validate_resolution(p_resolution, p_return_condition);
  correction_payload := jsonb_build_object('loan_id', p_loan_id, 'resolution', p_resolution, 'return_condition', p_return_condition);

  select * into existing_event from public.circulation_events where request_id = p_request_id;
  if existing_event.id is not null then
    if existing_event.loan_id <> p_loan_id or existing_event.event_type <> 'correction' or existing_event.payload <> correction_payload then
      raise exception 'Correction request conflicts with an existing request' using errcode = '23505';
    end if;
    select * into result from public.loans where id = p_loan_id;
    return result;
  end if;

  select * into result from public.loans where id = p_loan_id for update;
  if result.id is null or result.resolved_at is null then
    raise exception 'Resolved loan not found' using errcode = '23503';
  end if;
  if exists (select 1 from public.loans where copy_id = result.copy_id and resolved_at is null) then
    raise exception 'Copy has been loaned again; correction is not safe' using errcode = '55000';
  end if;

  update public.loans
  set resolution = p_resolution,
      return_condition = p_return_condition,
      resolved_by = actor_id
  where id = p_loan_id
  returning * into result;
  update public.book_copies
  set condition = case when p_resolution = 'lost' then 'lost' else p_return_condition end
  where id = result.copy_id;
  insert into public.circulation_events(request_id, loan_id, event_type, actor_user_id, payload)
  values (p_request_id, p_loan_id, 'correction', actor_id, correction_payload);
  return result;
end;
$$;

revoke all on all functions in schema circulation_private from public;
grant execute on all functions in schema circulation_private to authenticated;

create or replace function public.configure_circulation(p_enabled boolean, p_max_active_loans integer, p_timezone text)
returns public.circulation_policy language sql security invoker set search_path = public, circulation_private, pg_temp as $$
  select * from circulation_private._configure_circulation(p_enabled, p_max_active_loans, p_timezone);
$$;

create or replace function public.register_circulation_borrower(p_user_id uuid, p_display_name text)
returns public.circulation_borrowers language sql security invoker set search_path = public, circulation_private, pg_temp as $$
  select * from circulation_private._register_circulation_borrower(p_user_id, p_display_name);
$$;

create or replace function public.set_circulation_borrower_eligibility(p_user_id uuid, p_eligible boolean)
returns public.circulation_borrowers language sql security invoker set search_path = public, circulation_private, pg_temp as $$
  select * from circulation_private._set_circulation_borrower_eligibility(p_user_id, p_eligible);
$$;

create or replace function public.checkout_circulation_copy(p_request_id uuid, p_borrower_user_id uuid, p_copy_id uuid, p_due_date date)
returns public.loans language sql security invoker set search_path = public, circulation_private, pg_temp as $$
  select * from circulation_private._checkout_circulation_copy(p_request_id, p_borrower_user_id, p_copy_id, p_due_date);
$$;

create or replace function public.resolve_circulation_loan(p_request_id uuid, p_loan_id uuid, p_resolution text, p_return_condition text default null)
returns public.loans language sql security invoker set search_path = public, circulation_private, pg_temp as $$
  select * from circulation_private._resolve_circulation_loan(p_request_id, p_loan_id, p_resolution, p_return_condition);
$$;

create or replace function public.correct_circulation_resolution(p_request_id uuid, p_loan_id uuid, p_resolution text, p_return_condition text default null)
returns public.loans language sql security invoker set search_path = public, circulation_private, pg_temp as $$
  select * from circulation_private._correct_circulation_resolution(p_request_id, p_loan_id, p_resolution, p_return_condition);
$$;

revoke all on function public.configure_circulation(boolean,integer,text) from public, anon;
revoke all on function public.register_circulation_borrower(uuid,text) from public, anon;
revoke all on function public.set_circulation_borrower_eligibility(uuid,boolean) from public, anon;
revoke all on function public.checkout_circulation_copy(uuid,uuid,uuid,date) from public, anon;
revoke all on function public.resolve_circulation_loan(uuid,uuid,text,text) from public, anon;
revoke all on function public.correct_circulation_resolution(uuid,uuid,text,text) from public, anon;
grant execute on function public.configure_circulation(boolean,integer,text) to authenticated;
grant execute on function public.register_circulation_borrower(uuid,text) to authenticated;
grant execute on function public.set_circulation_borrower_eligibility(uuid,boolean) to authenticated;
grant execute on function public.checkout_circulation_copy(uuid,uuid,uuid,date) to authenticated;
grant execute on function public.resolve_circulation_loan(uuid,uuid,text,text) to authenticated;
grant execute on function public.correct_circulation_resolution(uuid,uuid,text,text) to authenticated;
