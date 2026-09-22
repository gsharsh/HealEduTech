-- Rollback-only check for the development sample catalogue seed.
begin;

\ir ../seed.sql
\ir ../seed.sql

do $$
declare
  seed_book_count integer;
  seed_copy_count integer;
  seed_topic_count integer;
  sparse_book_count integer;
begin
  select count(*) into seed_book_count
  from public.books
  where id >= '31000000-0000-4000-8000-000000000001'
    and id <= '31000000-0000-4000-8000-000000000006';

  if seed_book_count <> 6 then
    raise exception 'Expected 6 seeded books, found %', seed_book_count;
  end if;

  select count(*) into seed_copy_count
  from public.book_copies
  where inventory_code like 'EVG-SEED-%';

  if seed_copy_count <> 14 then
    raise exception 'Expected 14 seeded copies, found %', seed_copy_count;
  end if;

  select count(distinct topic) into seed_topic_count
  from public.books
  where id >= '31000000-0000-4000-8000-000000000001'
    and id <= '31000000-0000-4000-8000-000000000006';

  if seed_topic_count <> 3 then
    raise exception 'Seeded catalogue should cover stories, nature, and science';
  end if;

  select count(*) into sparse_book_count
  from (
    select b.id, count(c.id) as copy_count
    from public.books b
    left join public.book_copies c on c.book_id = b.id
    where b.id >= '31000000-0000-4000-8000-000000000001'
      and b.id <= '31000000-0000-4000-8000-000000000006'
    group by b.id
    having count(c.id) < 2
  ) sparse_books;

  if sparse_book_count <> 0 then
    raise exception 'Each seeded book should have at least two copies';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  if (
    select count(*)
    from public.books
    where id >= '31000000-0000-4000-8000-000000000001'
      and id <= '31000000-0000-4000-8000-000000000006'
  ) <> 6 then
    raise exception 'Anon users cannot browse the seeded public catalogue';
  end if;
end $$;

rollback;
select 'PASS: sample catalogue seed is idempotent, public, and copy-backed' as result;
