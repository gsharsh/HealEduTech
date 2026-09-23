-- Rollback-only integration check. Creates no persistent accounts or catalogue records.
begin;
insert into auth.users(id, email) values
 ('10000000-0000-4000-8000-000000000000', 'evg-test-admin@example.invalid'),
 ('10000000-0000-4000-8000-000000000001', 'evg-test-staff@example.invalid'),
 ('10000000-0000-4000-8000-000000000002', 'evg-test-learner@example.invalid'),
 ('10000000-0000-4000-8000-000000000003', 'evg-test-other@example.invalid');
update auth.users set email_confirmed_at = now()
where id in ('10000000-0000-4000-8000-000000000000', '10000000-0000-4000-8000-000000000002');
insert into public.staff_admin_bootstrap(email, note) values ('evg-test-admin@example.invalid', 'rollback test');

do $$ begin
 if not exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'staff_private'
    and p.proname = 'lock_admin_invariants'
    and p.prosrc like '%pg_advisory_xact_lock%'
 ) then
  raise exception 'Admin invariant lock helper is missing the advisory lock';
 end if;
 if (
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'staff_private'
    and p.proname in ('_claim_initial_admin', '_set_staff_access', '_revoke_staff_access', 'assign_staff_from_dashboard')
    and p.prosrc like '%lock_admin_invariants%'
 ) <> 4 then
  raise exception 'Admin invariant functions must take the shared transaction lock';
 end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.claim_initial_admin();
  raise exception 'Unapproved learner claimed initial admin';
 exception when insufficient_privilege then null; end;
begin
  perform public.set_staff_access('evg-test-learner@example.invalid', 'administrator');
  raise exception 'Learner granted own staff role by RPC';
 exception when insufficient_privilege then null; end;
 begin
  perform staff_private.assign_staff_from_dashboard('evg-test-learner@example.invalid', 'administrator');
  raise exception 'Learner granted own staff role by dashboard helper';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
select public.claim_initial_admin();
select public.set_staff_access('evg-test-staff@example.invalid', 'librarian');
reset role;
select staff_private.assign_staff_from_dashboard('evg-test-other@example.invalid', 'librarian', 'evg-test-admin@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.list_staff_members()) <> 3 then raise exception 'Administrator cannot list staff'; end if;
 begin
  perform public.revoke_staff_access('evg-test-admin@example.invalid');
  raise exception 'Last administrator was revoked';
 exception when object_not_in_prerequisite_state then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.add_book_with_copies('20000000-0000-4000-8000-000000000001','Test book','Sách thử nghiệm','', 'vi','stories','','',2);
select public.add_book_with_copies('20000000-0000-4000-8000-000000000001','Test book','Sách thử nghiệm','', 'vi','stories','','',2);
select public.update_book_and_add_copies(
  '20000000-0000-4000-8000-000000000001',
  'Updated test book', 'Sách thử nghiệm đã sửa', 'EVG', 'bilingual', 'stories',
  'Updated description', 'Mô tả đã sửa', 1
);
do $$ begin
 if (select count(*) from public.book_copies where book_id='20000000-0000-4000-8000-000000000001') <> 3 then
  raise exception 'Catalogue edit did not append exactly one copy';
 end if;
 if (select title_en from public.books where id='20000000-0000-4000-8000-000000000001') <> 'Updated test book' then
  raise exception 'Catalogue edit did not update book details';
 end if;
 begin
  perform public.add_book_with_copies('20000000-0000-4000-8000-000000000002','Bad count','Sách','', 'vi','stories','','',0);
  raise exception 'Invalid copy count was accepted';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.add_book_with_copies('20000000-0000-4000-8000-000000000003','   ','Sách','', 'vi','stories','','',2);
  raise exception 'Empty title was accepted';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.staff_members) <> 0 then raise exception 'Learner can see staff records'; end if;
 begin
  perform public.add_book_with_copies(gen_random_uuid(),'Blocked','Bị chặn','', 'vi','stories','','',1);
  raise exception 'Learner created a book';
 exception when insufficient_privilege then null; end;
 begin
  perform public.update_book_and_add_copies(
    '20000000-0000-4000-8000-000000000001',
    'Blocked edit', 'Bị chặn', '', 'vi', 'stories', '', '', 1
  );
  raise exception 'Learner edited a book';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.staff_members(user_id,role) values('10000000-0000-4000-8000-000000000002','administrator');
  raise exception 'Learner granted own staff role';
 exception when insufficient_privilege then null; end;
 begin
  perform public.list_staff_members();
  raise exception 'Learner listed staff members';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 if (select count(*) from public.books where id='20000000-0000-4000-8000-000000000001') <> 1 then raise exception 'Public cannot browse books'; end if;
 begin
  perform public.add_book_with_copies(gen_random_uuid(),'Blocked','Bị chặn','', 'vi','stories','','',1);
  raise exception 'Guest created a book';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: staff bootstrap, admin grants, last-admin guard, catalogue add/edit, retry safety, learner isolation, no self-promotion, guest read-only' as result;
