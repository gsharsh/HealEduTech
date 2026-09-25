-- The linked Open Library image is not the Peter Rabbit book cover. Keep the
-- catalogue's normal title-art fallback until the correct edition is verified.
update public.books
set cover_url = ''
where id = '31000000-0000-4000-8000-000000000001'::uuid
  and cover_url = 'https://covers.openlibrary.org/b/id/2557658-L.jpg';
