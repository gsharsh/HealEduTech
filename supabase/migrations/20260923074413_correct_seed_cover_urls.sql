update public.books
set cover_url = case id::text
  when '31000000-0000-4000-8000-000000000002' then 'https://commons.wikimedia.org/wiki/Special:FilePath/The%20Velveteen%20Rabbit%20Cover.jpg?width=600'
  when '31000000-0000-4000-8000-000000000003' then 'https://covers.openlibrary.org/b/olid/OL7021379M-L.jpg'
  else cover_url
end
where id in (
  '31000000-0000-4000-8000-000000000002'::uuid,
  '31000000-0000-4000-8000-000000000003'::uuid
);
