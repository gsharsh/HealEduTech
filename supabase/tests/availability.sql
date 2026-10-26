-- Rollback-only integration check for the public aggregate availability view.
begin;

insert into auth.users(id, email) values
 ('70000000-0000-4000-8000-000000000001', 'evg-availability-staff@example.invalid'),
 ('70000000-0000-4000-8000-000000000002', 'evg-availability-learner@example.invalid'),
 ('70000000-0000-4000-8000-000000000003', 'evg-availability-other@example.invalid');
insert into public.staff_members(user_id, role)
values ('70000000-0000-4000-8000-000000000001', 'librarian');
insert into public.circulation_borrowers(user_id, display_name, registered_by)
values ('70000000-0000-4000-8000-000000000003', 'Other Borrower', '70000000-0000-4000-8000-000000000001');

insert into public.books(id, title_en, title_vi, language, topic) values
 ('71000000-0000-4000-8000-000000000001', 'Availability test', 'Sách tồn kho', 'bilingual', 'stories'),
 ('71000000-0000-4000-8000-000000000002', 'Empty availability test', 'Sách không bản', 'bilingual', 'stories'),
 ('71000000-0000-4000-8000-000000000003', 'Unusable availability test', 'Sách bản hỏng', 'bilingual', 'stories');
insert into public.book_copies(id, book_id, inventory_code, condition) values
 ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'EVG-AVAIL-001', 'usable'),
 ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', 'EVG-AVAIL-002', 'usable'),
 ('72000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001', 'EVG-AVAIL-003', 'damaged'),
 ('72000000-0000-4000-8000-000000000004', '71000000-0000-4000-8000-000000000003', 'EVG-AVAIL-004', 'damaged'),
 ('72000000-0000-4000-8000-000000000005', '71000000-0000-4000-8000-000000000003', 'EVG-AVAIL-005', 'withdrawn');

-- The active loan belongs to another borrower. It must still make the copy
-- unavailable to every public availability reader.
insert into public.loans(
  id, request_id, borrower_user_id, copy_id, due_date, checked_out_by
)
values (
 '73000000-0000-4000-8000-000000000001',
 '74000000-0000-4000-8000-000000000001',
 '70000000-0000-4000-8000-000000000003',
 '72000000-0000-4000-8000-000000000001',
 current_date + 7,
 '70000000-0000-4000-8000-000000000001'
);

do $$
declare
  view_columns text[];
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'book_availability'
      and coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
  ) then
    raise exception 'book_availability must be a security-invoker view';
  end if;

  select array_agg(format('%s:%s', a.attname, format_type(a.atttypid, a.atttypmod)) order by a.attnum)
    into view_columns
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'book_availability'
    and a.attnum > 0
    and not a.attisdropped;
  if view_columns is distinct from array['book_id:uuid', 'total_copies:integer', 'available_copies:integer'] then
    raise exception 'book_availability column shape changed: %', view_columns;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'circulation_private'
      and p.proname = '_book_availability'
      and p.prosecdef
      and p.provolatile = 's'
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(value)
        where config.value ~ '^search_path=(""|)$'
      )
  ) then
    raise exception 'availability helper must be stable, security-definer, and use an empty search path';
  end if;

  if not has_function_privilege('anon', 'circulation_private._book_availability()', 'execute')
     or not has_function_privilege('authenticated', 'circulation_private._book_availability()', 'execute') then
    raise exception 'availability helper must be executable by public reader roles';
  end if;
  if has_table_privilege('anon', 'public.book_availability', 'insert')
     or has_table_privilege('anon', 'public.book_availability', 'update')
     or has_table_privilege('anon', 'public.book_availability', 'delete')
     or has_table_privilege('authenticated', 'public.book_availability', 'insert')
     or has_table_privilege('authenticated', 'public.book_availability', 'update')
     or has_table_privilege('authenticated', 'public.book_availability', 'delete') then
    raise exception 'Public reader roles must not mutate book_availability';
  end if;
  if has_schema_privilege('anon', 'circulation_private', 'usage') then
    raise exception 'anon must not receive circulation_private schema usage';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (select (total_copies, available_copies) from public.book_availability
      where book_id = '71000000-0000-4000-8000-000000000001')
     is distinct from (3, 1) then
    raise exception 'Anon availability count is wrong for an active loan and damaged copy';
  end if;
  if (select (total_copies, available_copies) from public.book_availability
      where book_id = '71000000-0000-4000-8000-000000000002')
     is distinct from (0, 0) then
    raise exception 'Zero-copy book availability count is wrong';
  end if;
  if (select (total_copies, available_copies) from public.book_availability
      where book_id = '71000000-0000-4000-8000-000000000003')
     is distinct from (2, 0) then
    raise exception 'Unusable-copy availability count is wrong';
  end if;
  begin
    perform count(*) from public.book_copies;
    raise exception 'Anon can read raw copy inventory';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.loans;
    raise exception 'Anon can read loan rows';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.circulation_borrowers;
    raise exception 'Anon can read borrower rows';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  if (select (total_copies, available_copies) from public.book_availability
      where book_id = '71000000-0000-4000-8000-000000000001')
     is distinct from (3, 1) then
    raise exception 'Nonstaff availability count is wrong';
  end if;
  if (select count(*) from public.book_copies) is distinct from 0 then
    raise exception 'Nonstaff can read raw copy inventory';
  end if;
  if (select count(*) from public.loans) is distinct from 0 then
    raise exception 'Nonstaff can read another borrower loan';
  end if;
  if (select count(*) from public.circulation_borrowers) is distinct from 0 then
    raise exception 'Nonstaff can read borrower rows';
  end if;
  if (select count(*) from circulation_private._book_availability()
      where book_id in (
        '71000000-0000-4000-8000-000000000001'::uuid,
        '71000000-0000-4000-8000-000000000002'::uuid,
        '71000000-0000-4000-8000-000000000003'::uuid
      )) is distinct from 3 then
    raise exception 'Authenticated helper call did not return the narrow book projection';
  end if;
  if (select (book_id, total_copies, available_copies)
      from circulation_private._book_availability()
      where book_id = '71000000-0000-4000-8000-000000000001')
     is distinct from (
       '71000000-0000-4000-8000-000000000001'::uuid, 3, 1
     ) then
    raise exception 'Authenticated helper output is wrong';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  if (select (total_copies, available_copies) from public.book_availability
      where book_id = '71000000-0000-4000-8000-000000000001')
     is distinct from (3, 1) then
    raise exception 'Staff availability count is wrong';
  end if;
end $$;

do $$ begin
  begin
    insert into public.book_availability(book_id, total_copies, available_copies)
    values ('71000000-0000-4000-8000-000000000002', 1, 1);
    raise exception 'Availability view accepted an insert';
  exception when insufficient_privilege or feature_not_supported or object_not_in_prerequisite_state then null; end;
  begin
    update public.book_availability set total_copies = 99
    where book_id = '71000000-0000-4000-8000-000000000001';
    raise exception 'Availability view accepted an update';
  exception when insufficient_privilege or feature_not_supported or object_not_in_prerequisite_state then null; end;
  begin
    delete from public.book_availability
    where book_id = '71000000-0000-4000-8000-000000000001';
    raise exception 'Availability view accepted a delete';
  exception when insufficient_privilege or feature_not_supported or object_not_in_prerequisite_state then null; end;
end $$;

select public.resolve_circulation_loan(
  '74000000-0000-4000-8000-000000000002',
  '73000000-0000-4000-8000-000000000001',
  'returned',
  'usable'
);
do $$ begin
  if (select (total_copies, available_copies) from public.book_availability
      where book_id = '71000000-0000-4000-8000-000000000001')
     is distinct from (3, 2) then
    raise exception 'Availability count did not increase after return';
  end if;
end $$;

rollback;
select 'PASS: secure public availability aggregate, private inventory and loan rows, and return count update' as result;
