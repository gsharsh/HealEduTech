-- Staff catalogue editing remains subject to the existing staff_members RLS
-- authorization. Copy inventory is append-only here: a copy that may have loan
-- history must never disappear merely because a title is edited.

grant update on public.books to authenticated;

create policy staff_update_books on public.books
for update to authenticated
using (
  exists (
    select 1 from public.staff_members sm
    where sm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.staff_members sm
    where sm.user_id = (select auth.uid())
  )
);

create function public.update_book_and_add_copies(
  p_id uuid,
  p_title_en text,
  p_title_vi text,
  p_author text,
  p_language text,
  p_topic text,
  p_description_en text,
  p_description_vi text,
  p_additional_copies integer default 0
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_copy_count integer;
begin
  if not exists (
    select 1 from public.staff_members sm
    where sm.user_id = (select auth.uid())
  ) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  if p_additional_copies is null or p_additional_copies < 0 or p_additional_copies > 100 then
    raise exception 'Additional copy count must be between 0 and 100' using errcode = '22023';
  end if;

  perform 1 from public.books b where b.id = p_id for update;
  if not found then
    raise exception 'Book not found' using errcode = 'P0002';
  end if;

  select count(*)::integer into current_copy_count
  from public.book_copies c
  where c.book_id = p_id;

  if current_copy_count + p_additional_copies > 100 then
    raise exception 'A book may have at most 100 registered copies' using errcode = '22023';
  end if;

  update public.books
  set title_en = trim(p_title_en),
      title_vi = trim(p_title_vi),
      author = trim(p_author),
      language = p_language,
      topic = p_topic,
      description_en = trim(p_description_en),
      description_vi = trim(p_description_vi)
  where id = p_id;

  insert into public.book_copies(book_id)
  select p_id from generate_series(1, p_additional_copies);

  return p_id;
end;
$$;

revoke all on function public.update_book_and_add_copies(uuid,text,text,text,text,text,text,text,integer) from public, anon;
grant execute on function public.update_book_and_add_copies(uuid,text,text,text,text,text,text,text,integer) to authenticated;
