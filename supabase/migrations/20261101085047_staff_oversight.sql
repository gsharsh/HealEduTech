-- Staff oversight exposes reading status, never a learner's private reflection.
-- Current-status summaries are independent from physical lending and returns.
create schema if not exists staff_oversight_private;
revoke all on schema staff_oversight_private from public, anon, authenticated;

create table public.loan_contacts (
  id uuid primary key,
  loan_id uuid not null references public.loans(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  contacted_at timestamptz not null default now(),
  channel text not null default 'email' check (channel = 'email')
);
create index loan_contacts_history_idx on public.loan_contacts(loan_id, contacted_at desc, id);
alter table public.loan_contacts enable row level security;
-- No direct application access, including writes; checked RPCs own this contract.
revoke all on public.loan_contacts from public, anon, authenticated;

create function staff_oversight_private.centre_today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone p.timezone)::date from public.circulation_policy p where p.id = 1;
$$;

create function staff_oversight_private.validate_page(p_page integer, p_page_size integer)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_page is null or p_page < 1 or p_page > 1000000 or p_page_size is null or p_page_size not between 1 and 100 then
    raise exception 'Invalid page parameters' using errcode = '22023';
  end if;
end;
$$;

create function staff_oversight_private.students()
returns table (
  user_id uuid, display_name text, email text, preferred_language text, created_at timestamptz,
  registered boolean, eligible boolean, currently_reading_count bigint, finished_count bigint,
  active_loan_count bigint, overdue_loan_count bigint
) language sql stable set search_path = '' as $$
  select u.id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), nullif(cb.display_name, ''), u.email::text, u.id::text),
    u.email::text, case when u.raw_user_meta_data->>'preferred_language' = 'vi' then 'vi' else 'en' end,
    u.created_at, cb.user_id is not null, coalesce(cb.eligible, false),
    (select count(*) from public.reading_records r where r.user_id = u.id and r.status = 'currently_reading'),
    (select count(*) from public.reading_records r where r.user_id = u.id and r.status = 'finished'),
    (select count(*) from public.loans l where l.borrower_user_id = u.id and l.resolved_at is null),
    (select count(*) from public.loans l where l.borrower_user_id = u.id and l.resolved_at is null and l.due_date < staff_oversight_private.centre_today())
  from auth.users u left join public.circulation_borrowers cb on cb.user_id = u.id
  where not exists (select 1 from public.staff_members sm where sm.user_id = u.id);
$$;

create function staff_oversight_private.loans()
returns table (
  id uuid, borrower_user_id uuid, borrower_name text, borrower_email text, preferred_language text,
  copy_id uuid, inventory_code text, book_id uuid, title_en text, title_vi text,
  checked_out_at timestamptz, due_date date, resolved_at timestamptz, resolution text, return_condition text,
  days_overdue integer, latest_contact_at timestamptz, latest_contact_by text
) language sql stable set search_path = '' as $$
  select l.id, l.borrower_user_id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), cb.display_name),
    u.email::text, case when u.raw_user_meta_data->>'preferred_language' = 'vi' then 'vi' else 'en' end,
    l.copy_id, c.inventory_code, b.id, b.title_en, b.title_vi,
    l.checked_out_at, l.due_date, l.resolved_at, l.resolution, l.return_condition,
    case when l.resolved_at is null then greatest(0, staff_oversight_private.centre_today() - l.due_date) else 0 end,
    lc.contacted_at, lc.actor_name
  from public.loans l
  join public.circulation_borrowers cb on cb.user_id = l.borrower_user_id
  join auth.users u on u.id = l.borrower_user_id
  join public.book_copies c on c.id = l.copy_id
  join public.books b on b.id = c.book_id
  left join lateral (
    select x.contacted_at, x.actor_name from public.loan_contacts x where x.loan_id = l.id
    order by x.contacted_at desc, x.id desc limit 1
  ) lc on true;
$$;

create function public.staff_list_students(p_search text default '', p_page integer default 1, p_page_size integer default 25, p_filter text default 'all')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform circulation_private.require_staff();
  perform staff_oversight_private.validate_page(p_page, p_page_size);
  if p_filter is null or p_filter not in ('all','reading','finished','borrowers','overdue') or length(coalesce(p_search,'')) > 200 then
    raise exception 'Invalid student filter' using errcode = '22023';
  end if;
  with filtered as materialized (
    select s.* from staff_oversight_private.students() s
    where (coalesce(trim(p_search),'') = '' or strpos(lower(s.display_name || ' ' || coalesce(s.email,'')), lower(trim(p_search))) > 0)
    and case p_filter when 'reading' then s.currently_reading_count > 0 when 'finished' then s.finished_count > 0
      when 'borrowers' then s.active_loan_count > 0 when 'overdue' then s.overdue_loan_count > 0 else true end
  ), page_rows as (
    select * from filtered order by lower(display_name), user_id limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.display_name), p.user_id) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'page', p_page, 'page_size', p_page_size) into result;
  return result;
end;
$$;

create function public.staff_get_student(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform circulation_private.require_staff();
  return (select to_jsonb(s) from staff_oversight_private.students() s where s.user_id = p_user_id);
end;
$$;

create function public.staff_list_student_reading(p_user_id uuid, p_page integer default 1, p_page_size integer default 25, p_status text default 'all')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform circulation_private.require_staff();
  perform staff_oversight_private.validate_page(p_page, p_page_size);
  if p_status is null or p_status not in ('all','currently_reading','finished') then
    raise exception 'Invalid reading status' using errcode = '22023';
  end if;
  with filtered as materialized (
    select r.book_id, b.title_en, b.title_vi, r.status
    from public.reading_records r join public.books b on b.id = r.book_id
    where r.user_id = p_user_id and (p_status = 'all' or r.status = p_status)
      and not exists (select 1 from public.staff_members sm where sm.user_id = r.user_id)
  ), page_rows as (
    select * from filtered order by title_en, book_id limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by p.title_en, p.book_id) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'page', p_page, 'page_size', p_page_size) into result;
  return result;
end;
$$;

create function public.staff_list_loans(p_search text default '', p_status text default 'all', p_student_id uuid default null,
  p_book_id uuid default null, p_page integer default 1, p_page_size integer default 25)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
    where (p_student_id is null or l.borrower_user_id = p_student_id) and (p_book_id is null or l.book_id = p_book_id)
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
        else true end
  ), page_rows as (
    select * from filtered order by (resolved_at is not null), due_date, id limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by (p.resolved_at is not null), p.due_date, p.id) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'page', p_page, 'page_size', p_page_size) into result;
  return result;
end;
$$;

create function public.staff_alert_count()
returns bigint language plpgsql stable security definer set search_path = '' as $$
begin
  perform circulation_private.require_staff();
  return (select count(*) from public.loans l where l.resolved_at is null and l.due_date <= staff_oversight_private.centre_today() - 7);
end;
$$;

create function public.staff_dashboard_stats(p_weeks integer default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare zone text; today date; first_week date; result jsonb;
begin
  perform circulation_private.require_staff();
  if p_weeks is null or p_weeks not in (4,12,52) then raise exception 'Invalid dashboard period' using errcode = '22023'; end if;
  select p.timezone into zone from public.circulation_policy p where p.id = 1;
  today := (now() at time zone zone)::date;
  first_week := date_trunc('week', today::timestamp)::date - (p_weeks - 1) * 7;
  with active as materialized (select * from public.loans where resolved_at is null),
  week_dates as (select (first_week + i * 7)::date as week from generate_series(0,p_weeks-1) i),
  checkout_counts as (
    select date_trunc('week', checked_out_at at time zone zone)::date as week, count(*) as n
    from public.loans where checked_out_at >= (first_week::timestamp at time zone zone) and checked_out_at <= now() group by 1
  ), return_counts as (
    select date_trunc('week', resolved_at at time zone zone)::date as week, count(*) as n
    from public.loans where resolution = 'returned' and resolved_at >= (first_week::timestamp at time zone zone) and resolved_at <= now() group by 1
  ), popular as (
    select b.id as book_id, b.title_en, b.title_vi, count(*) as checkouts
    from public.loans l join public.book_copies c on c.id = l.copy_id join public.books b on b.id = c.book_id
    where l.checked_out_at >= (first_week::timestamp at time zone zone) and l.checked_out_at <= now()
    group by b.id order by checkouts desc, b.id limit 5
  )
  select jsonb_build_object(
    'timezone', zone, 'as_of_date', today,
    'loan_health', jsonb_build_object(
      'active', (select count(*) from active), 'borrowers', (select count(distinct borrower_user_id) from active),
      'overdue', (select count(*) from active where due_date < today),
      'due_soon', (select count(*) from active where due_date between today and today + 6),
      'followup', (select count(*) from active where due_date <= today - 7)),
    'ageing', jsonb_build_object(
      'days_1_7', (select count(*) from active where today - due_date between 1 and 7),
      'days_8_14', (select count(*) from active where today - due_date between 8 and 14),
      'days_15_plus', (select count(*) from active where today - due_date >= 15)),
    'reading', jsonb_build_object(
      'students_reading', (select count(distinct r.user_id) from public.reading_records r where r.status = 'currently_reading' and not exists (select 1 from public.staff_members sm where sm.user_id = r.user_id)),
      'finished', (select count(*) from public.reading_records r where r.status = 'finished' and not exists (select 1 from public.staff_members sm where sm.user_id = r.user_id))),
    'inventory', jsonb_build_object(
      'available', (select count(*) from public.book_copies c where c.condition = 'usable' and not exists (select 1 from active a where a.copy_id = c.id)),
      'borrowed', (select count(*) from active),
      'damaged', (select count(*) from public.book_copies where condition = 'damaged'),
      'lost', (select count(*) from public.book_copies where condition = 'lost')),
    'trends', (select jsonb_agg(jsonb_build_object('week', d.week, 'checkouts', coalesce(c.n,0), 'returns', coalesce(r.n,0)) order by d.week)
      from week_dates d left join checkout_counts c on c.week = d.week left join return_counts r on r.week = d.week),
    'popular', coalesce((select jsonb_agg(to_jsonb(p) order by p.checkouts desc, p.book_id) from popular p), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create function public.staff_list_loan_contacts(p_loan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform circulation_private.require_staff();
  return coalesce((select jsonb_agg(to_jsonb(c) order by c.contacted_at desc, c.id desc) from public.loan_contacts c where c.loan_id = p_loan_id), '[]'::jsonb);
end;
$$;

create function public.staff_record_loan_contact(p_request_id uuid, p_loan_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; result public.loan_contacts; loan public.loans; staff_name text;
begin
  actor := circulation_private.require_staff();
  if p_request_id is null or p_loan_id is null then raise exception 'Request and loan are required' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('loan-contact:' || p_request_id::text, 0));
  select * into result from public.loan_contacts c where c.id = p_request_id;
  if result.id is not null then
    if result.loan_id <> p_loan_id or result.actor_user_id is distinct from actor then
      raise exception 'Contact request conflicts with an existing request' using errcode = '23505';
    end if;
    return to_jsonb(result);
  end if;
  -- Only a loan lock is needed. Never acquire a copy lock after it; resolution locks copy then loan.
  select * into loan from public.loans l where l.id = p_loan_id for update;
  if loan.id is null then raise exception 'Loan not found' using errcode = '23503'; end if;
  if loan.resolved_at is not null then raise exception 'Loan has already been resolved' using errcode = '55000'; end if;
  select coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), u.email::text, actor::text) into staff_name from auth.users u where u.id = actor;
  insert into public.loan_contacts(id, loan_id, actor_user_id, actor_name)
  values (p_request_id, p_loan_id, actor, staff_name) returning * into result;
  return to_jsonb(result);
end;
$$;

revoke all on all functions in schema staff_oversight_private from public, anon, authenticated;
revoke all on function public.staff_list_students(text,integer,integer,text) from public, anon, authenticated;
revoke all on function public.staff_get_student(uuid) from public, anon, authenticated;
revoke all on function public.staff_list_student_reading(uuid,integer,integer,text) from public, anon, authenticated;
revoke all on function public.staff_list_loans(text,text,uuid,uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.staff_alert_count() from public, anon, authenticated;
revoke all on function public.staff_dashboard_stats(integer) from public, anon, authenticated;
revoke all on function public.staff_list_loan_contacts(uuid) from public, anon, authenticated;
revoke all on function public.staff_record_loan_contact(uuid,uuid) from public, anon, authenticated;
grant execute on function public.staff_list_students(text,integer,integer,text), public.staff_get_student(uuid),
  public.staff_list_student_reading(uuid,integer,integer,text), public.staff_list_loans(text,text,uuid,uuid,integer,integer),
  public.staff_alert_count(), public.staff_dashboard_stats(integer), public.staff_list_loan_contacts(uuid), public.staff_record_loan_contact(uuid,uuid)
to authenticated;
