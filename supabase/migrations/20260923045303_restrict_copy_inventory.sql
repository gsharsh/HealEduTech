-- Public catalogue visitors only need aggregate stock counts. Raw physical-copy
-- records contain operational inventory codes, condition, and shelf location.
drop policy if exists public_copy_inventory on public.book_copies;

revoke select on public.book_copies from anon, authenticated;
grant select on public.book_copies to authenticated;

create policy book_copies_read_staff_only on public.book_copies
for select to authenticated
using (
  exists (
    select 1 from public.staff_members sm
    where sm.user_id = (select auth.uid())
  )
);

-- book_availability deliberately exposes only aggregate counts and no copy,
-- borrower, loan, condition, or shelf-location fields.
revoke all on public.book_availability from anon, authenticated;
grant select on public.book_availability to anon, authenticated;

-- Learners read only their own loan summary through a narrow projection. The
-- function never returns copy condition, shelf location, other borrowers, or
-- staff audit fields.
create or replace function circulation_private._list_my_loans()
returns table(
  id uuid,
  borrower_user_id uuid,
  copy_id uuid,
  checked_out_at timestamptz,
  due_date date,
  resolved_at timestamptz,
  resolution text,
  return_condition text,
  book_copies jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    l.id,
    l.borrower_user_id,
    l.copy_id,
    l.checked_out_at,
    l.due_date,
    l.resolved_at,
    l.resolution,
    l.return_condition,
    jsonb_build_object(
      'inventory_code', c.inventory_code,
      'books', jsonb_build_object('title_en', b.title_en, 'title_vi', b.title_vi)
    )
  from public.loans l
  join public.book_copies c on c.id = l.copy_id
  join public.books b on b.id = c.book_id
  where l.borrower_user_id = (select auth.uid())
  order by l.resolved_at nulls first, l.due_date;
$$;

revoke all on function circulation_private._list_my_loans() from public;
grant execute on function circulation_private._list_my_loans() to authenticated;

create or replace function public.list_my_loans()
returns table(
  id uuid,
  borrower_user_id uuid,
  copy_id uuid,
  checked_out_at timestamptz,
  due_date date,
  resolved_at timestamptz,
  resolution text,
  return_condition text,
  book_copies jsonb
)
language sql
security invoker
set search_path = public, circulation_private, pg_temp
as $$
  select * from circulation_private._list_my_loans();
$$;

revoke all on function public.list_my_loans() from public, anon;
grant execute on function public.list_my_loans() to authenticated;
