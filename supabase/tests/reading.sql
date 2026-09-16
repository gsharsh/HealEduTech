-- Rollback-only integration check for learner-owned reading and interests.
begin;
insert into auth.users(id, email) values
 ('30000000-0000-4000-8000-000000000001', 'evg-reading-one@example.invalid'),
 ('30000000-0000-4000-8000-000000000002', 'evg-reading-two@example.invalid'),
 ('30000000-0000-4000-8000-000000000003', 'evg-reading-staff@example.invalid');
insert into public.staff_members(user_id, role)
values ('30000000-0000-4000-8000-000000000003', 'librarian');
insert into public.books(id, title_en, title_vi, language, topic)
values ('40000000-0000-4000-8000-000000000001', 'Reading test', 'Sách thử đọc', 'bilingual', 'stories');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.reading_records(user_id, book_id, status, reflection)
values ('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','currently_reading','A thought');
insert into public.learner_interests(user_id, topic)
values ('30000000-0000-4000-8000-000000000001','stories');
do $$ begin
  if (select count(*) from public.reading_records) <> 1 then raise exception 'Owner cannot read own record'; end if;
  if (select count(*) from public.learner_interests) <> 1 then raise exception 'Owner cannot read own interest'; end if;
  update public.reading_records set status = 'finished' where user_id = '30000000-0000-4000-8000-000000000001' and book_id = '40000000-0000-4000-8000-000000000001';
  if (select status from public.reading_records) <> 'finished' then raise exception 'Owner cannot update own reading'; end if;
  begin
    update public.reading_records set user_id = '30000000-0000-4000-8000-000000000002'
      where user_id = '30000000-0000-4000-8000-000000000001';
    raise exception 'Account reassignment was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.reading_records(user_id, book_id, status) values ('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','finished');
    raise exception 'Duplicate reading record was accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.reading_records(user_id, book_id, status, reflection)
      values ('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','invalid', repeat('x', 2001));
    raise exception 'Invalid status or oversized reflection was accepted';
  exception when check_violation then null; end;
  perform public.replace_my_interests(array['nature', 'science']);
  if (select array_agg(topic order by topic) from public.learner_interests) <> array['nature', 'science']::text[] then
    raise exception 'Interest replacement failed';
  end if;
  begin
    perform public.replace_my_interests(array['stories', 'not-a-topic']);
    raise exception 'Invalid interest topic was accepted';
  exception when check_violation then null; end;
  if (select array_agg(topic order by topic) from public.learner_interests) <> array['nature', 'science']::text[] then
    raise exception 'Failed interest replacement did not preserve prior selection';
  end if;
  perform public.replace_my_interests(array[]::text[]);
  if (exists (select 1 from public.learner_interests) ) then raise exception 'Empty interest selection was not applied'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.reading_records) <> 0 then raise exception 'Learner can see another learner reading'; end if;
  if (select count(*) from public.learner_interests) <> 0 then raise exception 'Learner can see another learner interest'; end if;
  begin
    insert into public.reading_records(user_id, book_id, status) values ('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','finished');
    raise exception 'Learner wrote another learner reading';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.learner_interests(user_id, topic) values ('30000000-0000-4000-8000-000000000001','science');
    raise exception 'Learner wrote another learner interest';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  begin
    perform (select count(*) from public.reading_records);
    raise exception 'Guest can read reading records';
  exception when insufficient_privilege then null; end;
  begin
    perform (select count(*) from public.learner_interests);
    raise exception 'Guest can read interests';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.learner_interests(user_id, topic) values ('30000000-0000-4000-8000-000000000001','science');
    raise exception 'Guest wrote an interest';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.reading_records) <> 0 then raise exception 'Staff can see learner reading'; end if;
  if (select count(*) from public.learner_interests) <> 0 then raise exception 'Staff can see learner interests'; end if;
end $$;
rollback;
select 'PASS: reading and interest rows are private, editable by owner, and duplicate-safe' as result;
