-- New EVG accounts enter the learner and borrower lists automatically.
create function public.create_circulation_borrower_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.circulation_borrowers (user_id, display_name, eligible, registered_by)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'EVG learner'
    ), 120),
    true,
    new.id
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_circulation_borrower_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_circulation_borrower on auth.users;
create trigger on_auth_user_created_circulation_borrower
  after insert on auth.users
  for each row execute function public.create_circulation_borrower_for_new_user();

-- Include existing learner accounts as eligible, without converting staff accounts.
insert into public.circulation_borrowers (user_id, display_name, eligible, registered_by)
select
  u.id,
  left(coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'EVG learner'
  ), 120),
  true,
  u.id
from auth.users u
where not exists (select 1 from public.staff_members s where s.user_id = u.id)
on conflict (user_id) do nothing;

-- Only administrators may remove or restore a learner's borrowing eligibility.
create or replace function circulation_private._set_circulation_borrower_eligibility(p_user_id uuid, p_eligible boolean)
returns public.circulation_borrowers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  result public.circulation_borrowers;
begin
  if actor_id is null or not exists (
    select 1 from public.staff_members where user_id = actor_id and role = 'administrator'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
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

create or replace function public.staff_list_students(p_search text default '', p_page integer default 1, p_page_size integer default 25, p_filter text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  perform circulation_private.require_staff();
  perform staff_oversight_private.validate_page(p_page, p_page_size);
  if p_filter is null or p_filter not in ('all','eligible','removed','reading','finished','borrowers','overdue')
    or length(coalesce(p_search,'')) > 200 then
    raise exception 'Invalid student filter' using errcode = '22023';
  end if;
  with filtered as materialized (
    select s.*
    from staff_oversight_private.students() s
    where (coalesce(trim(p_search),'') = '' or strpos(lower(s.display_name || ' ' || coalesce(s.email,'')), lower(trim(p_search))) > 0)
      and case p_filter
        when 'eligible' then s.registered and s.eligible
        when 'removed' then s.registered and not s.eligible
        when 'reading' then s.currently_reading_count > 0
        when 'finished' then s.finished_count > 0
        when 'borrowers' then s.active_loan_count > 0
        when 'overdue' then s.overdue_loan_count > 0
        else true
      end
  ), page_rows as (
    select * from filtered order by lower(display_name), user_id limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.display_name), p.user_id) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'page', p_page, 'page_size', p_page_size
  ) into result;
  return result;
end;
$$;

create or replace function public.staff_list_loans(
  p_search text default '',
  p_status text default 'all',
  p_student_id uuid default null,
  p_book_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb; today date;
begin
  perform circulation_private.require_staff();
  perform staff_oversight_private.validate_page(p_page, p_page_size);
  today := staff_oversight_private.centre_today();
  if p_status is null or p_status not in ('all','active','overdue','followup','returned','lost','due_soon','age_1_7','age_8_14','age_15_plus')
    or length(coalesce(p_search,'')) > 200 then
    raise exception 'Invalid loan filter' using errcode = '22023';
  end if;
  with filtered as materialized (
    select l.* from staff_oversight_private.loans() l
    where (p_student_id is null or l.borrower_user_id = p_student_id)
      and (p_book_id is null or l.book_id = p_book_id)
      and (coalesce(trim(p_search),'') = '' or strpos(lower(l.borrower_name || ' ' || coalesce(l.borrower_email,'') || ' ' || l.title_en || ' ' || l.title_vi || ' ' || l.inventory_code), lower(trim(p_search))) > 0)
      and case p_status
        when 'active' then l.resolved_at is null
        when 'overdue' then l.resolved_at is null and l.days_overdue > 0
        when 'followup' then l.resolved_at is null and l.days_overdue >= 7
        when 'returned' then l.resolution = 'returned'
        when 'lost' then l.resolution = 'lost'
        when 'due_soon' then l.resolved_at is null and l.due_date between today and today + 6
        when 'age_1_7' then l.resolved_at is null and l.days_overdue between 1 and 7
        when 'age_8_14' then l.resolved_at is null and l.days_overdue between 8 and 14
        when 'age_15_plus' then l.resolved_at is null and l.days_overdue >= 15
        else true
      end
  ), page_rows as (
    select * from filtered order by checked_out_at asc, borrower_name, id limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.checked_out_at asc, p.borrower_name, p.id) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'page', p_page, 'page_size', p_page_size
  ) into result;
  return result;
end;
$$;
