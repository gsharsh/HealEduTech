-- Preserve Vietnamese catalogue matching when users omit tone marks.
create extension if not exists unaccent with schema extensions;

grant usage on schema extensions to anon, authenticated;
grant execute on function extensions.unaccent(regdictionary, text)
  to anon, authenticated;

create or replace function public.search_books(p_query text)
returns setof public.books
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  normalized_query text;
begin
  normalized_query := replace(
    lower(extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      lower(coalesce(trim(p_query), ''))
    )),
    'đ',
    'd'
  );

  if char_length(normalized_query) > 100 then
    raise exception 'Search query must be 100 characters or fewer'
      using errcode = '22023';
  end if;

  return query
    select b.*
    from public.books as b
    where normalized_query = ''
      or position(
        normalized_query in replace(
          lower(extensions.unaccent(
            'extensions.unaccent'::regdictionary,
            lower(coalesce(b.title_en, ''))
          )),
          'đ',
          'd'
        )
      ) > 0
      or position(
        normalized_query in replace(
          lower(extensions.unaccent(
            'extensions.unaccent'::regdictionary,
            lower(coalesce(b.title_vi, ''))
          )),
          'đ',
          'd'
        )
      ) > 0
      or position(
        normalized_query in replace(
          lower(extensions.unaccent(
            'extensions.unaccent'::regdictionary,
            lower(coalesce(b.author, ''))
          )),
          'đ',
          'd'
        )
      ) > 0;
end;
$$;

revoke all on function public.search_books(text) from public;
grant execute on function public.search_books(text) to anon, authenticated;
