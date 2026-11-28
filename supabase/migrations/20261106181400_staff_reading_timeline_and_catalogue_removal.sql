begin;

-- These are observed status changes, not measured time spent reading.
-- Do not infer historical start/completion times from generic update dates.
alter table public.reading_records
  add column reading_started_at timestamptz,
  add column reading_finished_at timestamptz,
  add constraint reading_timeline_order check (reading_finished_at is null or reading_started_at is null or reading_finished_at >= reading_started_at);

create function public.record_reading_timeline()
returns trigger language plpgsql set search_path = '' as $$
declare observed_at timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Reading record ownership cannot change' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.book_id is distinct from old.book_id then
    raise exception 'Reading record book cannot change' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.reading_started_at := case when new.status = 'currently_reading' then observed_at else null end;
    new.reading_finished_at := case when new.status = 'finished' then observed_at else null end;
  elsif new.status is distinct from old.status then
    if new.status = 'currently_reading' then
      -- Reopening begins a new recorded cycle. The reflection remains intact.
      new.reading_started_at := greatest(observed_at, old.reading_started_at, old.reading_finished_at);
      new.reading_finished_at := null;
    else
      new.reading_started_at := old.reading_started_at;
      new.reading_finished_at := greatest(observed_at, old.reading_started_at);
    end if;
  else
    new.reading_started_at := old.reading_started_at;
    new.reading_finished_at := old.reading_finished_at;
  end if;
  return new;
end;
$$;
revoke all on function public.record_reading_timeline() from public, anon, authenticated;
create trigger reading_records_timeline before insert or update on public.reading_records
for each row execute function public.record_reading_timeline();

create or replace function public.staff_get_student(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform circulation_private.require_staff();
  select to_jsonb(s) into result from staff_oversight_private.students() s where s.user_id = p_user_id;
  if result is null then return null; end if;
  return result || jsonb_build_object('reading_topics', coalesce((
    select jsonb_agg(to_jsonb(topics) order by topics.topic) from (
      select b.topic, count(*) filter (where r.status = 'currently_reading') as reading,
        count(*) filter (where r.status = 'finished') as finished
      from public.reading_records r join public.books b on b.id = r.book_id
      where r.user_id = p_user_id group by b.topic
    ) topics), '[]'::jsonb));
end;
$$;

create or replace function public.staff_list_student_reading(p_user_id uuid, p_page integer default 1, p_page_size integer default 25, p_status text default 'all')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform circulation_private.require_staff();
  perform staff_oversight_private.validate_page(p_page, p_page_size);
  if p_status is null or p_status not in ('all','currently_reading','finished') then
    raise exception 'Invalid reading status' using errcode = '22023';
  end if;
  with filtered as materialized (
    select r.book_id, b.title_en, b.title_vi, b.topic, r.status, r.reading_started_at, r.reading_finished_at
    from public.reading_records r join public.books b on b.id = r.book_id
    where r.user_id = p_user_id and (p_status = 'all' or r.status = p_status)
      and not exists (select 1 from public.staff_members sm where sm.user_id = r.user_id)
  ), page_rows as (
    select * from filtered order by title_en, book_id limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by p.title_en, p.book_id) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'page', p_page, 'page_size', p_page_size) into result;
  return result;
end;
$$;

-- Remove mistakes/unused catalogue entries, without erasing reading or loans.
-- Lock parent then copies: FK checks and checkout locks serialize concurrent use.
create function public.remove_unused_catalogue_book(p_book_id uuid,p_expected jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  book public.books;
  snapshot jsonb;
  expected_keys constant text[] := array['title_en','title_vi','author','language','topic','description_en','description_vi','cover_url','total_copies'];
begin
  perform circulation_private.require_staff();
  if p_book_id is null then raise exception 'Book is required' using errcode = '22023'; end if;
  if p_expected is null or jsonb_typeof(p_expected) is distinct from 'object' then
    raise exception 'The confirmed book details are required' using errcode = '22023';
  end if;
  if not (p_expected ?& expected_keys) or p_expected - expected_keys <> '{}'::jsonb
    or exists(select 1 from jsonb_each(p_expected) entry where entry.key <> 'total_copies' and jsonb_typeof(entry.value) <> 'string')
    or jsonb_typeof(p_expected->'total_copies') is distinct from 'number'
    or p_expected->>'total_copies' !~ '^[0-9]+$' then
    raise exception 'The confirmed book details have an invalid shape' using errcode = '22023';
  end if;
  select * into book from public.books where id = p_book_id for update;
  if not found then return false; end if;
  perform 1 from public.book_copies where book_id = p_book_id order by id for update;
  snapshot := jsonb_build_object('title_en',book.title_en,'title_vi',book.title_vi,'author',book.author,
    'language',book.language,'topic',book.topic,'description_en',book.description_en,'description_vi',book.description_vi,
    'cover_url',coalesce(book.cover_url,''),'total_copies',(select count(*) from public.book_copies where book_id = p_book_id));
  if snapshot is distinct from p_expected then
    raise exception 'The book changed. Refresh its details and confirm removal again.' using errcode = 'PT409';
  end if;
  if exists (select 1 from public.reading_records where book_id = p_book_id)
     or exists (select 1 from public.loans l join public.book_copies c on c.id = l.copy_id where c.book_id = p_book_id) then
    raise exception 'EVG_BOOK_HAS_HISTORY' using errcode = 'P0001';
  end if;
  delete from public.book_copies where book_id = p_book_id;
  delete from public.books where id = p_book_id;
  return true;
end;
$$;
revoke all on function public.remove_unused_catalogue_book(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.remove_unused_catalogue_book(uuid,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
