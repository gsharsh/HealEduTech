-- Rollback-only integration check. Creates no persistent accounts or catalogue records.
begin;
insert into auth.users(id, email) values
 ('10000000-0000-4000-8000-000000000001', 'evg-test-staff@example.invalid'),
 ('10000000-0000-4000-8000-000000000002', 'evg-test-learner@example.invalid');
insert into public.staff_members(user_id,role) values ('10000000-0000-4000-8000-000000000001','librarian');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.add_book_with_copies('20000000-0000-4000-8000-000000000001','Test book','Sách thử nghiệm','', 'vi','stories','','',2);
select public.add_book_with_copies('20000000-0000-4000-8000-000000000001','Test book','Sách thử nghiệm','', 'vi','stories','','',2);
do $$ begin
 if (select count(*) from public.book_copies where book_id='20000000-0000-4000-8000-000000000001') <> 2 then
  raise exception 'Retry created duplicate copies';
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
  insert into public.staff_members(user_id,role) values('10000000-0000-4000-8000-000000000002','administrator');
  raise exception 'Learner granted own staff role';
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
select 'PASS: staff create, atomic validation, retry safety, learner isolation, no self-promotion, guest read-only' as result;
