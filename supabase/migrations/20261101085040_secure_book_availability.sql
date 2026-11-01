-- Keep the public availability contract while making the view use caller
-- permissions; only the narrow helper may read private tables to produce
-- public aggregate counts.
--
-- The helper deliberately returns only aggregate counts. It does not expose
-- inventory codes, copy conditions, loans, borrowers, or staff audit fields.
create or replace function circulation_private._book_availability()
returns table(
  book_id uuid,
  total_copies integer,
  available_copies integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id as book_id,
    count(c.id)::integer as total_copies,
    count(c.id) filter (where c.condition = 'usable' and l.id is null)::integer as available_copies
  from public.books b
  left join public.book_copies c on c.book_id = b.id
  left join public.loans l on l.copy_id = c.id and l.resolved_at is null
  group by b.id;
$$;

-- The function is reached through the public view, so grant only the roles
-- that may read the public aggregate. No schema USAGE is granted to anon.
revoke all on function circulation_private._book_availability() from public, anon, authenticated;
grant execute on function circulation_private._book_availability() to anon, authenticated;

create or replace view public.book_availability
with (security_invoker = true)
as
select
  a.book_id,
  a.total_copies,
  a.available_copies
from circulation_private._book_availability() as a;

revoke all on public.book_availability from public, anon, authenticated;
grant select on public.book_availability to anon, authenticated;
