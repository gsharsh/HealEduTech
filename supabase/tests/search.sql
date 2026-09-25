-- Rollback-only checks for public, literal, accent-insensitive catalogue search.
begin;

insert into public.books (
  id,
  title_en,
  title_vi,
  author,
  language,
  topic,
  description_en,
  description_vi
) values (
  '39000000-0000-4000-8000-000000000001'::uuid,
  'Rabbit 100%!',
  'Thỏ ở Động',
  'Đặng Văn',
  'bilingual',
  'stories',
  'Search fixture',
  'Dữ liệu kiểm tra tìm kiếm'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare
  fixture_id uuid := '39000000-0000-4000-8000-000000000001'::uuid;
begin
  if not exists (
    select 1 from public.search_books('tho') where id = fixture_id
  ) then
    raise exception 'Unaccented Vietnamese query should match title_vi';
  end if;

  if not exists (
    select 1 from public.search_books('thỏ') where id = fixture_id
  ) then
    raise exception 'Accented Vietnamese query should match title_vi';
  end if;

  if not exists (
    select 1 from public.search_books('dong') where id = fixture_id
  ) then
    raise exception 'Unaccented d should match Vietnamese đ in title_vi';
  end if;

  if not exists (
    select 1 from public.search_books('dang') where id = fixture_id
  ) then
    raise exception 'Unaccented d should match Vietnamese đ in author';
  end if;

  if not exists (
    select 1 from public.search_books('%') where id = fixture_id
  ) then
    raise exception 'Percent should be treated as a literal search character';
  end if;

  if exists (
    select 1 from public.search_books('100x!') where id = fixture_id
  ) then
    raise exception 'Literal substring search must not treat percent as a wildcard';
  end if;

  begin
    perform * from public.search_books(repeat('x', 101));
    raise exception 'Expected an overlong query to be rejected';
  exception when sqlstate '22023' then
    null;
  end;
end;
$$;

rollback;
select 'PASS: accent-insensitive public book search' as result;
