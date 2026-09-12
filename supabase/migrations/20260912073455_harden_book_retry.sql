-- Make request-id retries safe: an existing id is reusable only when its
-- complete payload and registered copy count match the retry.
create or replace function public.add_book_with_copies(
  p_id uuid, p_title_en text, p_title_vi text, p_author text, p_language text,
  p_topic text, p_description_en text, p_description_vi text, p_copy_count integer
) returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.staff_members where user_id = (select auth.uid())) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  if p_copy_count is null or p_copy_count < 1 or p_copy_count > 100 then
    raise exception 'Copy count must be between 1 and 100' using errcode = '22023';
  end if;
  if exists (select 1 from public.books where id = p_id) then
    if not exists (
      select 1
      from public.books b
      where b.id = p_id
        and b.title_en = trim(p_title_en)
        and b.title_vi = trim(p_title_vi)
        and b.author = trim(p_author)
        and b.language = p_language
        and b.topic = p_topic
        and b.description_en = trim(p_description_en)
        and b.description_vi = trim(p_description_vi)
        and (select count(*) from public.book_copies c where c.book_id = p_id) = p_copy_count
    ) then
      raise exception 'Book request conflicts with an existing book' using errcode = '23505';
    end if;
    return p_id;
  end if;
  insert into public.books (id, title_en, title_vi, author, language, topic, description_en, description_vi)
  values (p_id, trim(p_title_en), trim(p_title_vi), trim(p_author), p_language, p_topic,
          trim(p_description_en), trim(p_description_vi));
  insert into public.book_copies(book_id) select p_id from generate_series(1, p_copy_count);
  return p_id;
end;
$$;
