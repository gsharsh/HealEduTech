-- Rollback-only integration check for S03 circulation permissions and retry safety.
begin;

update public.circulation_policy
set enabled = false, max_active_loans = 1, timezone = 'Asia/Ho_Chi_Minh';

insert into auth.users(id, email) values
 ('50000000-0000-4000-8000-000000000001', 'evg-circulation-admin@example.invalid'),
 ('50000000-0000-4000-8000-000000000002', 'evg-circulation-librarian@example.invalid'),
 ('50000000-0000-4000-8000-000000000003', 'evg-circulation-learner@example.invalid'),
 ('50000000-0000-4000-8000-000000000004', 'evg-circulation-other@example.invalid');
insert into public.staff_members(user_id, role) values
 ('50000000-0000-4000-8000-000000000001', 'administrator'),
 ('50000000-0000-4000-8000-000000000002', 'librarian');
insert into public.books(id, title_en, title_vi, language, topic)
values ('51000000-0000-4000-8000-000000000001', 'Circulation test', 'Sách mượn trả', 'bilingual', 'stories');
insert into public.book_copies(id, book_id, inventory_code) values
 ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'EVG-CIRC-001'),
 ('52000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000001', 'EVG-CIRC-002');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.circulation_policy) <> 1 then raise exception 'Learner cannot read policy status'; end if;
  begin
    perform public.configure_circulation(true, 1, 'Asia/Ho_Chi_Minh');
    raise exception 'Learner configured circulation';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.loans(request_id, borrower_user_id, copy_id, due_date, checked_out_by)
    values ('53000000-0000-4000-8000-000000000099', '50000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', current_date + 7, '50000000-0000-4000-8000-000000000003');
    raise exception 'Learner inserted a loan directly';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.register_circulation_borrower('50000000-0000-4000-8000-000000000003', 'Learner One');
select public.register_circulation_borrower('50000000-0000-4000-8000-000000000004', 'Learner Two');
do $$ begin
  begin
    perform public.configure_circulation(true, 1, 'Asia/Ho_Chi_Minh');
    raise exception 'Librarian configured circulation';
  exception when insufficient_privilege then null; end;
  begin
    perform public.checkout_circulation_copy('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', current_date + 7);
    raise exception 'Checkout succeeded while circulation was disabled';
  exception when object_not_in_prerequisite_state then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.configure_circulation(true, 1, 'Asia/Ho_Chi_Minh');

select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.checkout_circulation_copy('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', current_date + 7);
select public.checkout_circulation_copy('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', current_date + 7);
do $$ begin
  if (select count(*) from public.loans where borrower_user_id = '50000000-0000-4000-8000-000000000003') <> 1 then
    raise exception 'Checkout retry created a duplicate loan';
  end if;
  begin
    perform public.checkout_circulation_copy('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', current_date + 7);
    raise exception 'Mismatched checkout retry was accepted';
  exception when unique_violation then null; end;
  begin
    perform public.checkout_circulation_copy('53000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000002', current_date + 7);
    raise exception 'Borrower exceeded active loan limit';
  exception when object_not_in_prerequisite_state then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.configure_circulation(true, 2, 'Asia/Ho_Chi_Minh');

select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
  begin
    perform public.checkout_circulation_copy('53000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', current_date + 7);
    raise exception 'Second active loan for same copy was accepted';
  exception when unique_violation then null; end;
end $$;

select public.resolve_circulation_loan('53000000-0000-4000-8000-000000000004', (select id from public.loans where request_id = '53000000-0000-4000-8000-000000000001'), 'returned', 'usable');
select public.resolve_circulation_loan('53000000-0000-4000-8000-000000000004', (select id from public.loans where request_id = '53000000-0000-4000-8000-000000000001'), 'returned', 'usable');
do $$ begin
  begin
    perform public.resolve_circulation_loan('53000000-0000-4000-8000-000000000004', (select id from public.loans where request_id = '53000000-0000-4000-8000-000000000001'), 'returned', 'damaged');
    raise exception 'Mismatched resolution retry was accepted';
  exception when unique_violation then null; end;
end $$;

select public.checkout_circulation_copy('53000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', current_date + 8);
do $$ begin
  begin
    perform public.correct_circulation_resolution('53000000-0000-4000-8000-000000000006', (select id from public.loans where request_id = '53000000-0000-4000-8000-000000000001'), 'lost', null);
    raise exception 'Correction was accepted after copy was loaned again';
  exception when object_not_in_prerequisite_state then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.loans) <> 1 then raise exception 'Learner can see another borrower loan'; end if;
  if (select count(*) from public.list_my_loans()) <> 1 then raise exception 'Learner loan summary is missing'; end if;
  if (select book_copies->>'inventory_code' from public.list_my_loans() limit 1) <> 'EVG-CIRC-001' then
    raise exception 'Learner loan summary has the wrong copy';
  end if;
  if (select count(*) from public.book_copies) <> 0 then raise exception 'Learner can read raw copy inventory'; end if;
end $$;

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  if (select available_copies from public.book_availability where book_id = '51000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Public availability count is wrong';
  end if;
  begin
    perform count(*) from public.loans;
    raise exception 'Guest can read loan identities';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
select 'PASS: circulation release gate, role checks, retry safety, correction safety, and public availability' as result;
