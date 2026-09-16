-- Learner-owned reading history and editable interests.
create table public.reading_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  status text not null check (status in ('currently_reading', 'finished')),
  reflection text check (reflection is null or length(reflection) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.reading_records enable row level security;
revoke all on public.reading_records from anon, authenticated;
grant select, insert, update, delete on public.reading_records to authenticated;
create policy reading_records_read_own on public.reading_records for select to authenticated
  using (user_id = (select auth.uid()));
create policy reading_records_insert_own on public.reading_records for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy reading_records_update_own on public.reading_records for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy reading_records_delete_own on public.reading_records for delete to authenticated
  using (user_id = (select auth.uid()));
create index reading_records_user_updated_idx on public.reading_records(user_id, updated_at desc);

create or replace function public.touch_reading_records_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_reading_records_updated_at() from public, anon, authenticated;
create trigger reading_records_updated_at before update on public.reading_records
for each row execute function public.touch_reading_records_updated_at();

create table public.learner_interests (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (topic in ('nature', 'stories', 'science')),
  created_at timestamptz not null default now(),
  primary key (user_id, topic)
);
alter table public.learner_interests enable row level security;
revoke all on public.learner_interests from anon, authenticated;
grant select, insert, delete on public.learner_interests to authenticated;
create policy learner_interests_read_own on public.learner_interests for select to authenticated
  using (user_id = (select auth.uid()));
create policy learner_interests_insert_own on public.learner_interests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy learner_interests_delete_own on public.learner_interests for delete to authenticated
  using (user_id = (select auth.uid()));

-- Replace the complete set in one transaction so a failed save never leaves a partial selection.
create function public.replace_my_interests(p_topics text[])
returns table(topic text) language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.learner_interests where user_id = (select auth.uid());
  insert into public.learner_interests(user_id, topic)
  select (select auth.uid()), value from unnest(coalesce(p_topics, array[]::text[])) as value;
  return query select i.topic from public.learner_interests i
    where i.user_id = (select auth.uid()) order by i.topic;
end;
$$;
revoke all on function public.replace_my_interests(text[]) from public, anon;
grant execute on function public.replace_my_interests(text[]) to authenticated;
