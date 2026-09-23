-- Optional public cover artwork. The catalogue remains usable when a cover is absent.
alter table public.books
  add column cover_url text not null default ''
  check (length(cover_url) <= 1000);

update public.books
set cover_url = case id::text
  when '31000000-0000-4000-8000-000000000001' then 'https://covers.openlibrary.org/b/id/2557658-L.jpg'
  when '31000000-0000-4000-8000-000000000002' then 'https://commons.wikimedia.org/wiki/Special:FilePath/The%20Velveteen%20Rabbit%20Cover.jpg?width=600'
  when '31000000-0000-4000-8000-000000000003' then 'https://covers.openlibrary.org/b/olid/OL7021379M-L.jpg'
  when '31000000-0000-4000-8000-000000000004' then 'https://www.gutenberg.org/cache/epub/10737/pg10737.cover.medium.jpg'
  when '31000000-0000-4000-8000-000000000005' then 'https://covers.openlibrary.org/b/id/7960578-L.jpg'
  when '31000000-0000-4000-8000-000000000006' then 'https://covers.openlibrary.org/b/id/15458-L.jpg'
  else cover_url
end
where id in (
  '31000000-0000-4000-8000-000000000001'::uuid,
  '31000000-0000-4000-8000-000000000002'::uuid,
  '31000000-0000-4000-8000-000000000003'::uuid,
  '31000000-0000-4000-8000-000000000004'::uuid,
  '31000000-0000-4000-8000-000000000005'::uuid,
  '31000000-0000-4000-8000-000000000006'::uuid
);

create function public.update_book_cover(p_id uuid, p_cover_url text)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.staff_members sm where sm.user_id = (select auth.uid())) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  if p_cover_url is null or length(p_cover_url) > 1000 or (p_cover_url <> '' and p_cover_url !~* '^https?://') then
    raise exception 'Cover URL must be blank or an http(s) URL' using errcode = '22023';
  end if;
  update public.books set cover_url = trim(p_cover_url) where id = p_id;
  if not found then raise exception 'Book not found' using errcode = 'P0002'; end if;
  return p_id;
end;
$$;

revoke all on function public.update_book_cover(uuid,text) from public, anon;
grant execute on function public.update_book_cover(uuid,text) to authenticated;
