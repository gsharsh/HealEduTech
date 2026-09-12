-- EVG initial backend: Auth owns credentials; app tables never store passwords.
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('librarian', 'administrator')),
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;
create policy staff_read_own_role on public.staff_members for select to authenticated
  using (user_id = (select auth.uid()));
-- Only a trusted operator/server may assign staff membership. Never accept roles from sign-up metadata.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title_en text not null check (length(trim(title_en)) between 1 and 200),
  title_vi text not null check (length(trim(title_vi)) between 1 and 200),
  author text not null default '' check (length(author) <= 200),
  language text not null check (language in ('en', 'vi', 'bilingual')),
  topic text not null check (topic in ('nature', 'stories', 'science')),
  description_en text not null default '' check (length(description_en) <= 2000),
  description_vi text not null default '' check (length(description_vi) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.books enable row level security;
revoke all on public.books from anon, authenticated;
grant select on public.books to anon, authenticated;
grant insert on public.books to authenticated;
create policy public_catalogue on public.books for select to anon, authenticated using (true);
create policy staff_add_books on public.books for insert to authenticated with check (
  exists (select 1 from public.staff_members where user_id = (select auth.uid()))
);
create index books_created_at_id_idx on public.books(created_at desc, id);

create table public.book_copies (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  inventory_code text not null unique default ('EVG-' || gen_random_uuid()::text),
  created_at timestamptz not null default now()
);
alter table public.book_copies enable row level security;
revoke all on public.book_copies from anon, authenticated;
grant select on public.book_copies to anon, authenticated;
grant insert on public.book_copies to authenticated;
create policy public_copy_inventory on public.book_copies for select to anon, authenticated using (true);
create policy staff_add_copies on public.book_copies for insert to authenticated with check (
  exists (select 1 from public.staff_members where user_id = (select auth.uid()))
);
create index book_copies_book_id_idx on public.book_copies(book_id);

-- One transaction avoids a title being saved without its physical copies.
-- Invoker privileges deliberately preserve RLS. The client supplies a retry-stable UUID.
create function public.add_book_with_copies(
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
  -- A repeated submission of the same request does not create duplicate books/copies.
  if exists (select 1 from public.books where id = p_id) then return p_id; end if;
  insert into public.books (id, title_en, title_vi, author, language, topic, description_en, description_vi)
  values (p_id, trim(p_title_en), trim(p_title_vi), trim(p_author), p_language, p_topic,
          trim(p_description_en), trim(p_description_vi));
  insert into public.book_copies(book_id) select p_id from generate_series(1, p_copy_count);
  return p_id;
end;
$$;
revoke all on function public.add_book_with_copies(uuid,text,text,text,text,text,text,text,integer) from public, anon;
grant execute on function public.add_book_with_copies(uuid,text,text,text,text,text,text,text,integer) to authenticated;
