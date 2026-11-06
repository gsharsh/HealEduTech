-- Rollback-only Together privacy, lifecycle, moderation, bounds and projection checks.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','classroom-owner@example.invalid','{}'),
 ('91000000-0000-4000-8000-000000000002','classroom-reader@example.invalid','{"role":"administrator"}'),
 ('91000000-0000-4000-8000-000000000003','classroom-staff@example.invalid','{}');
insert into public.staff_members(user_id,role) values ('91000000-0000-4000-8000-000000000003','librarian');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare q text; begin
  if (select count(*) from public.list_published_learning_projects()) <> 0 then raise exception 'Draft fixture already public'; end if;
  foreach q in array array[
    'select public.list_my_learning_projects()',
    'select public.save_learning_project(null,null,null,null,null,null,null,null)',
    'select public.submit_learning_project(null,null)','select public.withdraw_learning_project(null,null)',
    'select public.delete_learning_project(null,null)','select public.staff_list_learning_projects()',
    'select public.staff_review_learning_project(null,null,null,null)',
    'select public.list_my_learning_feedback(null)','select public.set_learning_project_encouragement(null,true)',
    'select public.submit_learning_comment(null,null,null)','select public.withdraw_learning_comment(null)',
    'select public.staff_list_learning_comments()','select public.staff_review_learning_comment(null,null,null,null)',
    'select * from learning_private.projects','select * from learning_private.comments',
    'select * from learning_private.encouragements','select learning_private.reset_feedback(null)'
  ] loop
    begin execute q; raise exception 'Anonymous access unexpectedly allowed: %',q; exception when insufficient_privilege then null; end;
  end loop;
end $$;

set local role authenticated;
do $$ begin
  begin perform public.list_my_learning_projects(); raise exception 'Missing auth.uid accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare
  project constant uuid := '92000000-0000-4000-8000-000000000001';
  comment_id constant uuid := '93000000-0000-4000-8000-000000000001';
  own_claims constant text := '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}';
  reader_claims constant text := '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated","user_metadata":{"role":"administrator"}}';
  staff_claims constant text := '{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}';
  item jsonb; updated jsonb; comment jsonb; feedback jsonb; version timestamptz; q text;
begin
  item := public.save_learning_project(project,'A good book','My first review','review','','','','');
  if item->>'status' <> 'draft' or item ? 'owner_id' or item ? 'reviewed_by' then raise exception 'Create was not a private safe projection'; end if;
  updated := public.save_learning_project(project,'A good book','My first review','review','','','','');
  if item <> updated then raise exception 'Create retry changed version or duplicated data'; end if;
  if (select count(*) from public.list_my_learning_projects()) <> 1 or (select count(*) from public.list_published_learning_projects()) <> 0 then raise exception 'Private draft visibility wrong'; end if;
  begin perform public.submit_learning_project(project,(item->>'updated_at')::timestamptz); raise exception 'Incomplete project submitted'; exception when invalid_parameter_value then null; end;
  begin perform public.save_learning_project(project,'Book','Title','invalid','','','','',(item->>'updated_at')::timestamptz); raise exception 'Invalid format accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.save_learning_project(project,'Book','Title','review',repeat('x',2001),'','','',(item->>'updated_at')::timestamptz); raise exception 'Oversized summary accepted'; exception when invalid_parameter_value then null; end;
  version := (item->>'updated_at')::timestamptz;
  item := public.save_learning_project(project,'A good book','My first review','review','A summary','One lesson','For young readers','Why?',version);
  begin perform public.save_learning_project(project,'Book','Lost edit','review','','','','',version); raise exception 'Stale edit accepted'; exception when sqlstate 'PT409' then null; end;
  foreach q in array array['select * from learning_private.projects','update learning_private.projects set status=''published''',
    'select * from learning_private.comments','select * from learning_private.encouragements','select learning_private.reset_feedback(null)'] loop
    begin execute q; raise exception 'Direct private API bypass: %',q; exception when insufficient_privilege then null; end;
  end loop;

  perform set_config('request.jwt.claims',reader_claims,true);
  if (select count(*) from public.list_my_learning_projects()) <> 0 then raise exception 'Other learner saw draft'; end if;
  begin perform public.save_learning_project(project,'Book','Other','review','','','','',null); raise exception 'Other learner overwrote draft'; exception when insufficient_privilege then null; end;
  begin perform public.submit_learning_project(project,(item->>'updated_at')::timestamptz); raise exception 'Other learner submitted draft'; exception when insufficient_privilege then null; end;
  begin perform public.withdraw_learning_project(project,(item->>'updated_at')::timestamptz); raise exception 'Other learner withdrew draft'; exception when insufficient_privilege then null; end;
  begin perform public.delete_learning_project(project,(item->>'updated_at')::timestamptz); raise exception 'Other learner deleted draft'; exception when insufficient_privilege then null; end;
  begin perform public.staff_list_learning_projects(); raise exception 'User metadata granted staff access'; exception when insufficient_privilege then null; end;
  begin perform public.staff_review_learning_project(project,'publish','',(item->>'updated_at')::timestamptz); raise exception 'Learner published work'; exception when insufficient_privilege then null; end;
  begin perform public.set_learning_project_encouragement(project,true); raise exception 'Encouraged private project'; exception when insufficient_privilege then null; end;
  begin perform public.submit_learning_comment(comment_id,project,'Good point'); raise exception 'Commented on private project'; exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims',staff_claims,true);
  if (select count(*) from public.staff_list_learning_projects()) <> 0 then raise exception 'Staff saw private draft'; end if;
  begin perform public.staff_review_learning_project(project,'publish','',(item->>'updated_at')::timestamptz); raise exception 'Staff published unsubmitted draft'; exception when insufficient_privilege then null; end;
  begin perform count(*) from learning_private.projects; raise exception 'Staff read private table'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',own_claims,true);
  item := public.submit_learning_project(project,(item->>'updated_at')::timestamptz);
  if item->>'status' <> 'submitted' then raise exception 'Submit transition failed'; end if;
  begin perform public.save_learning_project(project,'Book','Edit submitted','review','','','','',(item->>'updated_at')::timestamptz); raise exception 'Submitted edit bypassed withdrawal'; exception when sqlstate 'PT409' then null; end;
  perform set_config('request.jwt.claims',staff_claims,true);
  if (select count(*) from public.staff_list_learning_projects()) <> 1 then raise exception 'Submitted work missing from review'; end if;
  begin perform public.staff_review_learning_project(project,'request_changes','',(item->>'updated_at')::timestamptz); raise exception 'Changes without guidance allowed'; exception when invalid_parameter_value then null; end;
  item := public.staff_review_learning_project(project,'request_changes','PRIVATE REVIEW GUIDANCE',(item->>'updated_at')::timestamptz);
  if item->>'status' <> 'changes_requested' or (select count(*) from public.staff_list_learning_projects()) <> 1 then raise exception 'Returned submission missing from staff history'; end if;
  if (select owner_user_id from public.staff_list_learning_projects()) <> '91000000-0000-4000-8000-000000000001'::uuid
    or (select count(*) from public.staff_list_learning_projects(24,null,null,'91000000-0000-4000-8000-000000000002')) <> 0 then raise exception 'Staff owner identification/filter wrong'; end if;
  perform set_config('request.jwt.claims',own_claims,true);
  if (select review_note from public.list_my_learning_projects()) <> 'PRIVATE REVIEW GUIDANCE' then raise exception 'Owner lost review guidance'; end if;
  item := public.save_learning_project(project,'A good book','My revised review','review','A summary','One lesson','For young readers','Why?',(item->>'updated_at')::timestamptz);
  perform set_config('request.jwt.claims',staff_claims,true);
  if (select count(*) from public.staff_list_learning_projects()) <> 0 then raise exception 'Unsubmitted revisions visible to staff'; end if;
  perform set_config('request.jwt.claims',own_claims,true);
  item := public.submit_learning_project(project,(item->>'updated_at')::timestamptz);
  perform set_config('request.jwt.claims',staff_claims,true);
  item := public.staff_review_learning_project(project,'publish','PRIVATE APPROVAL NOTE',(item->>'updated_at')::timestamptz);
  select to_jsonb(p) into updated from public.list_published_learning_projects() p;
  if updated is null or updated ? 'owner_id' or updated ? 'review_note' or updated ? 'reviewed_by' or updated ? 'status'
    or position('PRIVATE' in updated::text) > 0 or updated->>'published_at' is null then raise exception 'Published projection exposed private fields'; end if;
  if (select count(*) from public.list_published_learning_projects(1,(updated->>'published_at')::timestamptz,project)) <> 0 then raise exception 'Publication cursor repeated row'; end if;
  begin perform public.list_published_learning_projects(25); raise exception 'Public page cap bypassed'; exception when invalid_parameter_value then null; end;
  begin perform public.list_published_learning_projects(1,now(),null); raise exception 'Partial cursor accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.staff_list_learning_projects(101); raise exception 'Staff page cap bypassed'; exception when invalid_parameter_value then null; end;

  perform set_config('request.jwt.claims',reader_claims,true);
  feedback := public.set_learning_project_encouragement(project,true);
  feedback := public.set_learning_project_encouragement(project,true);
  if (feedback->>'encouragement_count')::int <> 1 or not (public.list_my_learning_feedback(project)->>'encouraged')::boolean then raise exception 'Encouragement was not unique'; end if;
  feedback := public.set_learning_project_encouragement(project,false);
  if (feedback->>'encouragement_count')::int <> 0 then raise exception 'Encouragement withdrawal failed'; end if;
  perform public.set_learning_project_encouragement(project,true);
  begin perform public.submit_learning_comment(comment_id,project,repeat('x',501)); raise exception 'Oversized comment accepted'; exception when invalid_parameter_value then null; end;
  comment := public.submit_learning_comment(comment_id,project,'I liked your lesson.');
  if comment->>'status' <> 'pending' or public.submit_learning_comment(comment_id,project,'I liked your lesson.') <> comment then raise exception 'Comment moderation/retry failed'; end if;
  begin perform public.submit_learning_comment(comment_id,project,'Different text'); raise exception 'Comment retry overwrote original'; exception when sqlstate 'PT409' then null; end;
  if jsonb_array_length(public.get_learning_project_feedback(project)->'comments') <> 0 then raise exception 'Unreviewed comment became public'; end if;
  begin perform public.staff_list_learning_comments(); raise exception 'Learner read moderation queue'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',own_claims,true);
  if jsonb_array_length(public.list_my_learning_feedback(project)->'comments') <> 0 then raise exception 'Project owner saw someone else pending comment'; end if;
  perform public.withdraw_learning_comment(comment_id);
  perform set_config('request.jwt.claims',staff_claims,true);
  if (select count(*) from public.staff_list_learning_comments()) <> 1 then raise exception 'Pending comment missing or other owner deleted it'; end if;
  version := (comment->>'updated_at')::timestamptz;
  comment := public.staff_review_learning_comment(comment_id,'approve','PRIVATE MODERATOR NOTE',version);
  feedback := public.get_learning_project_feedback(project);
  if jsonb_array_length(feedback->'comments') <> 1 or position('PRIVATE' in feedback::text)>0 or feedback->'comments'->0 ? 'owner_id'
    or feedback->'comments'->0 ? 'review_note' then raise exception 'Approved comment projection leaked identities or notes'; end if;
  begin perform public.staff_review_learning_comment(comment_id,'reject','',version); raise exception 'Stale moderation accepted'; exception when sqlstate 'PT409' then null; end;
  comment := public.staff_review_learning_comment(comment_id,'reject','Be kind',(comment->>'updated_at')::timestamptz);
  if jsonb_array_length(public.get_learning_project_feedback(project)->'comments') <> 0 then raise exception 'Rejected comment stayed public'; end if;
  perform set_config('request.jwt.claims',reader_claims,true);
  perform public.withdraw_learning_comment(comment_id);
  comment := public.submit_learning_comment(comment_id,project,'A supportive question.');
  perform set_config('request.jwt.claims',staff_claims,true);
  comment := public.staff_review_learning_comment(comment_id,'approve','',(comment->>'updated_at')::timestamptz);

  perform set_config('request.jwt.claims',own_claims,true);
  begin perform public.delete_learning_project(project,(item->>'updated_at')::timestamptz); raise exception 'Published project deleted without explicit withdrawal'; exception when sqlstate 'PT409' then null; end;
  item := public.withdraw_learning_project(project,(item->>'updated_at')::timestamptz);
  if (select count(*) from public.list_published_learning_projects()) <> 0 or public.get_learning_project_feedback(project) <> '{"encouragement_count":0,"comments":[]}'::jsonb then raise exception 'Withdrawal did not immediately hide feedback and work'; end if;
  perform set_config('request.jwt.claims',staff_claims,true);
  if (select count(*) from public.staff_list_learning_projects()) <> 0 or (select count(*) from public.staff_list_learning_comments()) <> 0 then raise exception 'Withdrawn project leaked through staff queue'; end if;
  begin perform public.staff_review_learning_comment(comment_id,'approve','',(comment->>'updated_at')::timestamptz); raise exception 'Comment reviewed on private project'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',reader_claims,true);
  feedback := public.list_my_learning_feedback(project);
  if (feedback->>'encouraged')::boolean or feedback->'comments'->0->>'status' <> 'pending' then raise exception 'Withdrawal did not reset public feedback'; end if;
  if public.list_my_learning_feedback(null)->'comments'->0->>'project_id' <> project::text
    or jsonb_array_length(public.list_my_learning_feedback()->'comments') <> 1
    or (public.list_my_learning_feedback()->'comments'->0->>'is_published')::boolean
    or public.list_my_learning_feedback()->'comments'->0 ? 'project_title' then raise exception 'Own comments on withdrawn project missing or leaking private parent'; end if;
  comment := feedback->'comments'->0;
  perform set_config('request.jwt.claims',own_claims,true);
  item := public.save_learning_project(project,'A good book','Revised review','review','Revised summary','One lesson','For young readers','Why?',(item->>'updated_at')::timestamptz);
  item := public.submit_learning_project(project,(item->>'updated_at')::timestamptz);
  perform set_config('request.jwt.claims',staff_claims,true);
  item := public.staff_review_learning_project(project,'publish','',(item->>'updated_at')::timestamptz);
  if public.get_learning_project_feedback(project) <> '{"encouragement_count":0,"comments":[]}'::jsonb then raise exception 'Republishing resurrected old feedback'; end if;
  comment := public.staff_review_learning_comment(comment_id,'approve','',(comment->>'updated_at')::timestamptz);
  perform set_config('request.jwt.claims',reader_claims,true);
  perform public.withdraw_learning_comment(comment_id);
  perform public.withdraw_learning_comment(comment_id);
  if jsonb_array_length(public.get_learning_project_feedback(project)->'comments') <> 0 then raise exception 'Author comment withdrawal failed'; end if;
  for i in 1..5 loop perform public.submit_learning_comment(md5('classroom-comment-'||i)::uuid,project,'Supportive comment '||i); end loop;
  begin perform public.submit_learning_comment(md5('classroom-comment-6')::uuid,project,'Too many'); raise exception 'Per-author project comment limit bypassed'; exception when program_limit_exceeded then null; end;
  perform set_config('request.jwt.claims',staff_claims,true);
  item := public.staff_review_learning_project(project,'request_changes','Please revise',(item->>'updated_at')::timestamptz);
  if (select count(*) from public.list_published_learning_projects()) <> 0 then raise exception 'Staff takedown failed'; end if;
  perform set_config('request.jwt.claims',own_claims,true);
  perform public.delete_learning_project(project,(item->>'updated_at')::timestamptz);
  if (select count(*) from public.list_my_learning_projects()) <> 0 then raise exception 'Owner deletion failed'; end if;
  for i in 1..25 loop perform public.save_learning_project(md5('classroom-project-'||i)::uuid,'Book','Project '||i,'presentation','','','',''); end loop;
  begin perform public.save_learning_project(md5('classroom-project-26')::uuid,'Book','Too many','review','','','',''); raise exception 'Notebook limit bypassed'; exception when program_limit_exceeded then null; end;
  if (select count(*) from public.list_my_learning_projects()) <> 25 then raise exception 'Notebook bounded list wrong'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from learning_private.comments) <> 0 or (select count(*) from learning_private.encouragements) <> 0 then raise exception 'Project delete did not cascade feedback'; end if;
end $$;
-- Global caps are checked separately from the per-author/per-project cap.
update learning_private.projects set status='published',published_at=clock_timestamp(),summary='Summary',takeaways='Lesson',recommendation='Recommended';
insert into learning_private.comments(id,project_id,owner_id,body)
select md5('classroom-global-'||i)::uuid,md5('classroom-project-'||((i-1)/5+1))::uuid,
  '91000000-0000-4000-8000-000000000002','Comment '||i from generate_series(1,50) i;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
  begin perform public.submit_learning_comment(md5('classroom-global-extra')::uuid,md5('classroom-project-11')::uuid,'Too many');
    raise exception 'Global author comment cap bypassed'; exception when program_limit_exceeded then null; end;
end $$;
reset role;
insert into auth.users(id,email) select md5('classroom-commenter-'||i)::uuid,'commenter-'||i||'@example.invalid' from generate_series(1,10) i;
insert into learning_private.comments(id,project_id,owner_id,body)
select md5('classroom-project-comment-'||i)::uuid,md5('classroom-project-12')::uuid,
  md5('classroom-commenter-'||((i-1)/5+1))::uuid,'Comment '||i from generate_series(1,50) i;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
  begin perform public.submit_learning_comment(md5('classroom-project-extra')::uuid,md5('classroom-project-12')::uuid,'Too many');
    raise exception 'Global project comment cap bypassed'; exception when program_limit_exceeded then null; end;
end $$;
reset role;
-- Account deletion removes private notebooks and dependent feedback.
delete from auth.users where id = '91000000-0000-4000-8000-000000000001';
do $$ begin if (select count(*) from learning_private.projects) <> 0 then raise exception 'Account delete retained notebooks'; end if; end $$;
rollback;
select 'PASS: Together owner isolation, private drafts, optimistic versions, publication, moderated feedback, withdrawal, bounds and cascades' as result;
