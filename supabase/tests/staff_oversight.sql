-- Rollback-only staff projections, date boundaries, scale, and contact audit checks.
begin;
update public.circulation_policy set enabled = false, timezone = 'Asia/Ho_Chi_Minh';
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('71000000-0000-4000-8000-000000000001','oversight-admin@example.invalid','{"display_name":"Admin"}',now()-interval '1 year'),
 ('71000000-0000-4000-8000-000000000002','oversight-librarian@example.invalid','{"display_name":"Librarian"}',now()-interval '1 year'),
 ('71000000-0000-4000-8000-000000000003','oversight-one@example.invalid','{"display_name":"Student One","preferred_language":"vi","role":"administrator"}',now()-interval '1 month'),
 ('71000000-0000-4000-8000-000000000004','oversight-two@example.invalid','{"display_name":"Student Two"}',now()-interval '1 month');
insert into public.staff_members(user_id,role) values
 ('71000000-0000-4000-8000-000000000001','administrator'),('71000000-0000-4000-8000-000000000002','librarian');
insert into auth.users(id,email,raw_user_meta_data)
select md5('oversight-student-'||i)::uuid, 'oversight-'||i||'@example.invalid', jsonb_build_object('display_name','Synthetic '||lpad(i::text,4,'0'))
from generate_series(1,1101) i;
insert into public.books(id,title_en,title_vi,language,topic) values
 ('72000000-0000-4000-8000-000000000001','Oversight & stories','Sách kiểm tra','bilingual','stories'),
 ('72000000-0000-4000-8000-000000000002','Oversight nature','Thiên nhiên','bilingual','nature');
insert into public.reading_records(user_id,book_id,status,reflection) values
 ('71000000-0000-4000-8000-000000000003','72000000-0000-4000-8000-000000000001','currently_reading','PRIVATE-REFLECTION-SENTINEL'),
 ('71000000-0000-4000-8000-000000000003','72000000-0000-4000-8000-000000000002','finished','PRIVATE-REFLECTION-SENTINEL'),
 ('71000000-0000-4000-8000-000000000004','72000000-0000-4000-8000-000000000001','currently_reading',null),
 ('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000001','finished','Staff own private text');
insert into public.reading_records(user_id,book_id,status)
select md5('oversight-student-'||i)::uuid,'72000000-0000-4000-8000-000000000001','finished' from generate_series(1,1101) i;
insert into public.circulation_borrowers(user_id,display_name,registered_by) values
 ('71000000-0000-4000-8000-000000000003','Old student name','71000000-0000-4000-8000-000000000002'),
 ('71000000-0000-4000-8000-000000000004','Student Two','71000000-0000-4000-8000-000000000002');
insert into public.book_copies(id,book_id,inventory_code,condition)
select md5('oversight-copy-'||i)::uuid,'72000000-0000-4000-8000-000000000001','OVERSIGHT-'||i,
  case i when 9 then 'damaged' when 10 then 'lost' else 'usable' end from generate_series(1,10) i;
insert into public.loans(id,request_id,borrower_user_id,copy_id,checked_out_at,due_date,checked_out_by,resolved_at,resolution,return_condition,resolved_by)
select md5('oversight-loan-'||i)::uuid,md5('oversight-request-'||i)::uuid,'71000000-0000-4000-8000-000000000003',
  md5('oversight-copy-'||i)::uuid,now()-interval '20 days',
  (now() at time zone 'Asia/Ho_Chi_Minh')::date + case i when 1 then 0 when 2 then -1 when 3 then -6 when 4 then -7 when 5 then -8 when 6 then -14 when 7 then -15 when 8 then 6 else -30 end,
  '71000000-0000-4000-8000-000000000002',case when i >=9 then now()-interval '1 day' end,
  case i when 9 then 'returned' when 10 then 'lost' end,case when i = 9 then 'damaged' end,
  case when i>=9 then '71000000-0000-4000-8000-000000000002'::uuid end
from generate_series(1,10) i;
insert into public.book_copies(id,book_id,inventory_code)
select md5('oversight-scale-copy-'||i)::uuid,'72000000-0000-4000-8000-000000000002','OVERSIGHT-SCALE-'||i from generate_series(1,1101) i;
insert into public.loans(id,request_id,borrower_user_id,copy_id,checked_out_at,due_date,checked_out_by)
select md5('oversight-scale-loan-'||i)::uuid,md5('oversight-scale-request-'||i)::uuid,'71000000-0000-4000-8000-000000000004',
  md5('oversight-scale-copy-'||i)::uuid,now()-interval '1 hour',(now() at time zone 'Asia/Ho_Chi_Minh')::date+30,'71000000-0000-4000-8000-000000000002'
from generate_series(1,1101) i;

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare q text; begin
  foreach q in array array['select public.staff_list_students()','select public.staff_get_student(null)',
    'select public.staff_list_student_reading(null)','select public.staff_list_loans()','select public.staff_dashboard_stats()',
    'select public.staff_alert_count()','select public.staff_list_loan_contacts(null)','select public.staff_record_loan_contact(null,null)'] loop
    begin execute q; raise exception 'Guest accessed staff API: %',q; exception when insufficient_privilege then null; end;
  end loop;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ declare q text; begin
  foreach q in array array['select public.staff_list_students()','select public.staff_get_student(null)',
    'select public.staff_list_student_reading(null)','select public.staff_list_loans()','select public.staff_dashboard_stats()',
    'select public.staff_alert_count()','select public.staff_list_loan_contacts(null)','select public.staff_record_loan_contact(null,null)'] loop
    begin execute q; raise exception 'Learner accessed staff API: %',q; exception when insufficient_privilege then null; end;
  end loop;
  begin perform count(*) from public.loan_contacts; raise exception 'Learner read contacts directly'; exception when insufficient_privilege then null; end;
  begin perform count(*) from auth.users; raise exception 'Learner read Auth identities directly'; exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare result jsonb; stats jsonb; begin
  result := public.staff_list_students();
  if (result->>'total')::int <> 1103 or jsonb_array_length(result->'items') <> 25 then raise exception 'Student count/page truncated or includes staff'; end if;
  result := public.staff_list_students('',12,100);
  if jsonb_array_length(result->'items') <> 3 or (result->>'total')::int <> 1103 then raise exception 'Stable final page failed'; end if;
  result := public.staff_list_students('Student One');
  if (result->>'total')::int <> 1 or result->'items'->0->>'display_name' <> 'Student One' then raise exception 'Student search/name source wrong'; end if;
  result := public.staff_list_students('',1,25,'reading');
  if (result->>'total')::int <> 2 then raise exception 'Student reading filter wrong'; end if;
  result := public.staff_list_students('',1,25,'finished');
  if (result->>'total')::int <> 1102 then raise exception 'Finished student filter truncated'; end if;
  result := public.staff_get_student('71000000-0000-4000-8000-000000000003');
  if result->>'preferred_language' <> 'vi' or not (result->>'registered')::boolean or not (result->>'eligible')::boolean
    or (result->>'currently_reading_count')::int <> 1 or (result->>'finished_count')::int <> 1
    or (result->>'active_loan_count')::int <> 8 or (result->>'overdue_loan_count')::int <> 6 then raise exception 'Student summary wrong'; end if;
  if public.staff_get_student('71000000-0000-4000-8000-000000000002') is not null then raise exception 'Staff account listed as student'; end if;
  result := public.staff_list_student_reading('71000000-0000-4000-8000-000000000003');
  if (result->>'total')::int <> 2 or result->'items'->0 ? 'reflection' or position('PRIVATE-REFLECTION-SENTINEL' in result::text)>0 then raise exception 'Reading projection leaked reflection'; end if;
  if (select count(*) from public.reading_records) <> 1 then raise exception 'Staff raw reading access expanded beyond own'; end if;
  begin perform count(*) from public.loan_contacts; raise exception 'Staff bypassed contact RPC'; exception when insufficient_privilege then null; end;
  begin perform count(*) from staff_oversight_private.students(); raise exception 'Private student projection directly callable'; exception when insufficient_privilege then null; end;
  result := public.staff_list_loans('', 'all');
  if (result->>'total')::int <> 1111 or jsonb_array_length(result->'items') <>25 then raise exception 'Loan totals truncated'; end if;
  result := public.staff_list_loans('OVERSIGHT-4','followup');
  if (result->>'total')::int <> 1 or (result->'items'->0->>'days_overdue')::int <> 7 then raise exception 'Seven-day alert boundary failed'; end if;
  if (public.staff_list_loans('','followup')->>'total')::int <>4 or public.staff_alert_count() <> 4 then raise exception 'Staff alert count wrong'; end if;
  if (public.staff_list_loans('','overdue')->>'total')::int <>6 then raise exception 'Day-one overdue boundary wrong'; end if;
  if (public.staff_list_loans('','due_soon')->>'total')::int <>2 then raise exception 'Due-soon boundary wrong'; end if;
  if (public.staff_list_loans('','age_1_7')->>'total')::int <>3 or (public.staff_list_loans('','age_8_14')->>'total')::int <>2
    or (public.staff_list_loans('','age_15_plus')->>'total')::int <>1 then raise exception 'Ageing bands wrong'; end if;
  if (public.staff_list_loans('','all','71000000-0000-4000-8000-000000000004')->>'total')::int <>1101 then raise exception 'Student loan filter truncated'; end if;
  if (public.staff_list_loans('','all',null,'72000000-0000-4000-8000-000000000002')->>'total')::int <>1101 then raise exception 'Book filter wrong'; end if;
  stats := public.staff_dashboard_stats();
  if stats->>'timezone' <> 'Asia/Ho_Chi_Minh' or stats->>'as_of_date' <> (now() at time zone 'Asia/Ho_Chi_Minh')::date::text then raise exception 'Centre timezone ignored'; end if;
  if (stats->'loan_health'->>'active')::int <>1109 or (stats->'loan_health'->>'borrowers')::int <>2 or (stats->'loan_health'->>'overdue')::int <>6
    or (stats->'loan_health'->>'due_soon')::int <>2 or (stats->'loan_health'->>'followup')::int <>4 then raise exception 'Loan health wrong'; end if;
  if (stats->'reading'->>'students_reading')::int <>2 or (stats->'reading'->>'finished')::int <>1102 then raise exception 'Reading aggregates truncated/include staff'; end if;
  if (stats->'inventory'->>'borrowed')::int <>1109 or (stats->'inventory'->>'damaged')::int <>1 or (stats->'inventory'->>'lost')::int <>1 then raise exception 'Inventory totals wrong'; end if;
  if jsonb_array_length(stats->'trends') <>12 or jsonb_array_length(public.staff_dashboard_stats(4)->'trends') <>4 or jsonb_array_length(public.staff_dashboard_stats(52)->'trends') <>52 then raise exception 'Dashboard range wrong'; end if;
  if (select sum((x->>'checkouts')::int) from jsonb_array_elements(stats->'trends') x) <>1111
    or (select sum((x->>'returns')::int) from jsonb_array_elements(stats->'trends') x) <>1 then raise exception 'Weekly trends wrong/include lost as returns'; end if;
  if (stats->'popular'->0->>'checkouts')::int <>1101 then raise exception 'Popular book totals truncated'; end if;
  begin perform public.staff_list_students('',0); raise exception 'Invalid pagination accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.staff_dashboard_stats(8); raise exception 'Invalid dashboard range accepted'; exception when invalid_parameter_value then null; end;
end $$;

select public.staff_record_loan_contact('73000000-0000-4000-8000-000000000001',md5('oversight-loan-4')::uuid);
select public.staff_record_loan_contact('73000000-0000-4000-8000-000000000001',md5('oversight-loan-4')::uuid);
do $$ declare contacts jsonb; begin
  contacts := public.staff_list_loan_contacts(md5('oversight-loan-4')::uuid);
  if jsonb_array_length(contacts) <>1 or contacts->0->>'actor_name' <>'Librarian' or contacts->0->>'channel'<>'email' then raise exception 'Contact retry/audit wrong'; end if;
  if public.staff_alert_count()<>4 then raise exception 'Recording contact hid overdue alert'; end if;
  if public.staff_list_loans('OVERSIGHT-4')->'items'->0->>'latest_contact_by' <> 'Librarian' then raise exception 'Shared latest contact missing'; end if;
  begin perform public.staff_record_loan_contact('73000000-0000-4000-8000-000000000001',md5('oversight-loan-5')::uuid); raise exception 'Mismatched contact retry accepted'; exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
  if (public.staff_list_students()->>'total')::int<>1103 or public.staff_alert_count()<>4 then raise exception 'Administrator oversight denied'; end if;
  if jsonb_array_length(public.staff_list_loan_contacts(md5('oversight-loan-4')::uuid))<>1 then raise exception 'Contact history not shared with admin'; end if;
  begin perform public.staff_record_loan_contact('73000000-0000-4000-8000-000000000001',md5('oversight-loan-4')::uuid); raise exception 'Cross-actor retry accepted'; exception when unique_violation then null; end;
end $$;
select public.resolve_circulation_loan('73000000-0000-4000-8000-000000000002',md5('oversight-loan-4')::uuid,'returned','usable');
select public.resolve_circulation_loan('73000000-0000-4000-8000-000000000003',md5('oversight-loan-5')::uuid,'lost');
do $$ begin
  if public.staff_alert_count()<>2 then raise exception 'Return/loss did not clear alert'; end if;
  begin perform public.staff_record_loan_contact('73000000-0000-4000-8000-000000000004',md5('oversight-loan-4')::uuid); raise exception 'Contact recorded for resolved loan'; exception when object_not_in_prerequisite_state then null; end;
end $$;
-- An already-recorded request can still recover after a later return.
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.staff_record_loan_contact('73000000-0000-4000-8000-000000000001',md5('oversight-loan-4')::uuid);
reset role;
-- Exercise timezone conversion on both sides of UTC, independent of machine timezone.
update public.loans set due_date = (now() at time zone 'Etc/GMT-14')::date - 7 where id = md5('oversight-loan-1')::uuid;
update public.circulation_policy set timezone = 'Etc/GMT+12';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
  if public.staff_dashboard_stats()->>'as_of_date' <> (now() at time zone 'Etc/GMT+12')::date::text then raise exception 'Western centre-local day wrong'; end if;
  if (public.staff_list_loans('OVERSIGHT-1','followup')->>'total')::int <> 0 then raise exception 'Follow-up crossed western midnight too early'; end if;
end $$;
reset role;
update public.circulation_policy set timezone = 'Etc/GMT-14';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
  if public.staff_dashboard_stats()->>'as_of_date' <> (now() at time zone 'Etc/GMT-14')::date::text then raise exception 'Eastern centre-local day wrong'; end if;
  if (public.staff_list_loans('OVERSIGHT-1','followup')->>'total')::int <> 1 then raise exception 'Follow-up did not cross eastern midnight'; end if;
end $$;
rollback;
select 'PASS: staff oversight permissions, private reflections, 7-day alerts, contact audit and >1000-row aggregates' as result;
