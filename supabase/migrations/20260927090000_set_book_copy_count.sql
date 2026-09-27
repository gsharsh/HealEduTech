-- Staff can correct a book's total physical-copy count without deleting loan
-- history. Copies are removed only when they have never appeared in a loan.
create or replace function public.set_book_copy_count(
  p_id uuid,
  p_title_en text,
  p_title_vi text,
  p_author text,
  p_language text,
  p_topic text,
  p_description_en text,
  p_description_vi text,
  p_total_copies integer
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_copy_count integer;
  copies_to_remove integer;
  removed_copy_count integer := 0;
  copy_row record;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_members where user_id = auth.uid()
  ) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  if p_total_copies is null or p_total_copies < 1 or p_total_copies > 100 then
    raise exception 'Total copy count must be between 1 and 100' using errcode = '22023';
  end if;

  -- Serialise catalogue edits for this title before reading its inventory.
  perform 1 from public.books where id = p_id for update;
  if not found then
    raise exception 'Book not found' using errcode = 'P0002';
  end if;

  select count(*)::integer into current_copy_count
  from public.book_copies
  where book_id = p_id;

  if p_total_copies < current_copy_count then
    copies_to_remove := current_copy_count - p_total_copies;

    -- Lock each candidate before checking loans again. This prevents a copy
    -- that is being checked out concurrently from being deleted silently.
    for copy_row in
      select id
      from public.book_copies
      where book_id = p_id
      order by created_at desc, id desc
    loop
      exit when removed_copy_count >= copies_to_remove;
      perform 1 from public.book_copies where id = copy_row.id for update;
      if not exists (select 1 from public.loans where copy_id = copy_row.id) then
        delete from public.book_copies where id = copy_row.id;
        removed_copy_count := removed_copy_count + 1;
      end if;
    end loop;

    if removed_copy_count < copies_to_remove then
      raise exception 'Cannot reduce copies below the number with loan history' using errcode = '55000';
    end if;
  elsif p_total_copies > current_copy_count then
    insert into public.book_copies(book_id)
    select p_id from generate_series(1, p_total_copies - current_copy_count);
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

  return p_id;
end;
$$;

revoke all on function public.set_book_copy_count(uuid,text,text,text,text,text,text,text,integer) from public, anon;
grant execute on function public.set_book_copy_count(uuid,text,text,text,text,text,text,text,integer) to authenticated;
