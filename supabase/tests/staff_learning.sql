begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('81000000-0000-4000-8000-000000000001','teaching-staff@example.invalid','{}'),
 ('81000000-0000-4000-8000-000000000002','teaching-learner@example.invalid','{"role":"administrator"}');
insert into public.staff_members(user_id,role) values ('81000000-0000-4000-8000-000000000001','librarian');
insert into public.books(id,title_en,title_vi,language,topic) values
 ('82000000-0000-4000-8000-000000000001','Recorded reading','Ghi nhận việc đọc','bilingual','nature'),
 ('82000000-0000-4000-8000-000000000002','Unused title','Sách chưa dùng','bilingual','stories'),
 ('82000000-0000-4000-8000-000000000003','Historical reading','Lịch sử đọc','bilingual','science'),
 ('82000000-0000-4000-8000-000000000004','Loan history','Lịch sử mượn','bilingual','stories');
insert into public.book_copies(id,book_id,inventory_code,condition) values
 ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','REMOVE-UNUSED','usable'),
 ('83000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000004','KEEP-LOAN-HISTORY','usable');
insert into public.circulation_borrowers(user_id,display_name,registered_by) values
 ('81000000-0000-4000-8000-000000000002','Synthetic learner','81000000-0000-4000-8000-000000000001');
insert into public.loans(id,request_id,borrower_user_id,copy_id,due_date,checked_out_by) values
 ('84000000-0000-4000-8000-000000000004','85000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000004',current_date+7,'81000000-0000-4000-8000-000000000001');
create temporary table confirmed_book_snapshots on commit drop as
select b.id,jsonb_build_object('title_en',b.title_en,'title_vi',b.title_vi,'author',b.author,'language',b.language,
  'topic',b.topic,'description_en',b.description_en,'description_vi',b.description_vi,'cover_url',coalesce(b.cover_url,''),
  'total_copies',(select count(*) from public.book_copies c where c.book_id=b.id)) as snapshot
from public.books b where b.id::text like '82000000-%';
grant select on confirmed_book_snapshots to authenticated;
-- Mimic a pre-migration record; absent dates must remain unknown on text edits.
alter table public.reading_records disable trigger reading_records_timeline;
insert into public.reading_records(user_id,book_id,status) values
 ('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000003','finished');
alter table public.reading_records enable trigger reading_records_timeline;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.reading_records(user_id,book_id,status,reflection,reading_started_at,reading_finished_at) values
 ('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','currently_reading','PRIVATE-TEACHING-NOTE','1900-01-01','1900-01-02');
do $$ declare started timestamptz; finished timestamptz; result jsonb; begin
  select reading_started_at into started from public.reading_records where book_id='82000000-0000-4000-8000-000000000001';
  if started is null or started < now()-interval '1 day' then raise exception 'Forged start accepted'; end if;
  if exists(select 1 from public.reading_records where reading_finished_at is not null) then raise exception 'Reading has forged finish'; end if;
  update public.reading_records set status='finished' where book_id='82000000-0000-4000-8000-000000000001';
  select reading_finished_at into finished from public.reading_records where book_id='82000000-0000-4000-8000-000000000001';
  if finished is null or finished < started then raise exception 'Completion missing'; end if;
  update public.reading_records set reading_started_at='1900-01-01',reading_finished_at='1900-01-02' where book_id='82000000-0000-4000-8000-000000000001';
  if not exists(select 1 from public.reading_records where book_id='82000000-0000-4000-8000-000000000001' and reading_started_at=started and reading_finished_at=finished) then raise exception 'Dates changed on same-status update'; end if;
  update public.reading_records set reflection='PRIVATE-TEACHING-NOTE' where book_id='82000000-0000-4000-8000-000000000003';
  if exists(select 1 from public.reading_records where book_id='82000000-0000-4000-8000-000000000003' and (reading_started_at is not null or reading_finished_at is not null)) then raise exception 'Legacy dates fabricated'; end if;
  update public.reading_records set status='currently_reading' where book_id='82000000-0000-4000-8000-000000000001';
  begin update public.reading_records set book_id='82000000-0000-4000-8000-000000000002' where book_id='82000000-0000-4000-8000-000000000001'; raise exception 'Timeline reassigned to another book'; exception when check_violation then null; end;
  if not exists(select 1 from public.reading_records where book_id='82000000-0000-4000-8000-000000000001' and reading_finished_at is null and reflection='PRIVATE-TEACHING-NOTE') then raise exception 'Reopen failed'; end if;
  begin perform public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000002',null); raise exception 'Learner removed title'; exception when insufficient_privilege then null; end;
  begin result:=public.staff_get_student('81000000-0000-4000-8000-000000000002'); raise exception 'Learner read staff projection'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare result jsonb; expected jsonb; invalid jsonb; begin
  result := public.staff_get_student('81000000-0000-4000-8000-000000000002');
  if jsonb_array_length(result->'reading_topics')<>2 then raise exception 'Topic summary missing'; end if;
  result := public.staff_list_student_reading('81000000-0000-4000-8000-000000000002');
  if not ((result->'items'->0) ? 'reading_started_at') or position('PRIVATE-TEACHING-NOTE' in result::text)>0 then raise exception 'Unsafe reading projection'; end if;
  begin perform public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000001',(select snapshot from confirmed_book_snapshots where id='82000000-0000-4000-8000-000000000001')); raise exception 'History removed'; exception when sqlstate 'P0001' then if sqlerrm <> 'EVG_BOOK_HAS_HISTORY' then raise; end if; end;
  begin perform public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000004',(select snapshot from confirmed_book_snapshots where id='82000000-0000-4000-8000-000000000004')); raise exception 'Loan history removed'; exception when sqlstate 'P0001' then if sqlerrm <> 'EVG_BOOK_HAS_HISTORY' then raise; end if; end;
  select snapshot into expected from confirmed_book_snapshots where id='82000000-0000-4000-8000-000000000002';
  foreach invalid in array array[null::jsonb,'null'::jsonb,'[]'::jsonb,'{}'::jsonb,expected-'title_en',
    expected||'{"unexpected":true}'::jsonb,expected||'{"total_copies":"1"}'::jsonb,
    expected||'{"total_copies":-1}'::jsonb,expected||'{"author":null}'::jsonb] loop
    begin perform public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000002',invalid); raise exception 'Invalid confirmation snapshot accepted'; exception when invalid_parameter_value then null; end;
  end loop;
  perform public.set_book_copy_count('82000000-0000-4000-8000-000000000002','Updated unused title','Sách chưa dùng','','bilingual','stories','','',1);
  begin perform public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000002',expected); raise exception 'Stale title confirmation removed changed book'; exception when sqlstate 'PT409' then null; end;
  if not exists(select 1 from public.books where id='82000000-0000-4000-8000-000000000002' and title_en='Updated unused title') then raise exception 'Stale removal damaged metadata'; end if;
  expected := expected || '{"title_en":"Updated unused title"}'::jsonb;
  perform public.set_book_copy_count('82000000-0000-4000-8000-000000000002','Updated unused title','Sách chưa dùng','','bilingual','stories','','',2);
  begin perform public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000002',expected); raise exception 'Stale copy-count confirmation removed changed inventory'; exception when sqlstate 'PT409' then null; end;
  expected := expected || '{"total_copies":2}'::jsonb;
  if not public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000002',expected) then raise exception 'Freshly confirmed unused title not removed'; end if;
  if public.remove_unused_catalogue_book('82000000-0000-4000-8000-000000000002',expected) then raise exception 'Repeated removal should report absent'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.book_copies where id='83000000-0000-4000-8000-000000000001') then raise exception 'Orphan copy'; end if;
  if has_function_privilege('anon','public.remove_unused_catalogue_book(uuid,jsonb)','execute') then raise exception 'Anonymous removal grant'; end if;
  if to_regprocedure('public.remove_unused_catalogue_book(uuid)') is not null then raise exception 'Unsafe legacy deletion signature still exists'; end if;
end $$;
select 'PASS: recorded reading dates, unknown history, staff topics, private notes and snapshot-protected catalogue removal';
rollback;
