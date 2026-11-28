-- Together: private notebooks, explicit submission, staff publication and
-- moderated, identity-free feedback. No direct table or private-helper access.
begin;
create schema learning_private;
revoke all on schema learning_private from public, anon, authenticated;

create table learning_private.projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  book_title text not null check (length(btrim(book_title)) between 1 and 200),
  title text not null check (length(btrim(title)) between 1 and 120),
  format text not null check (format in ('presentation','review')),
  summary text not null default '' check (length(summary) <= 2000),
  takeaways text not null default '' check (length(takeaways) <= 2000),
  recommendation text not null default '' check (length(recommendation) <= 1000),
  question text not null default '' check (length(question) <= 500),
  status text not null default 'draft' check (status in ('draft','submitted','published','changes_requested')),
  review_note text check (length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  published_at timestamptz,
  check ((status = 'published') = (published_at is not null)),
  check (status not in ('submitted','published') or
    (length(btrim(summary)) > 0 and length(btrim(takeaways)) > 0 and length(btrim(recommendation)) > 0))
);
create index learning_projects_owner_idx on learning_private.projects(owner_id, updated_at desc, id desc);
create index learning_projects_public_idx on learning_private.projects(published_at desc, id desc) where status = 'published';
create index learning_projects_review_idx on learning_private.projects(updated_at desc, id desc) where status in ('submitted','published','changes_requested');

create table learning_private.encouragements (
  project_id uuid not null references learning_private.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (project_id,user_id)
);
create index learning_encouragements_user_idx on learning_private.encouragements(user_id);
create table learning_private.comments (
  id uuid primary key,
  project_id uuid not null references learning_private.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text check (length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index learning_comments_project_idx on learning_private.comments(project_id,created_at,id);
create index learning_comments_owner_idx on learning_private.comments(owner_id,project_id);
create index learning_comments_review_idx on learning_private.comments(updated_at desc,id desc) where status in ('pending','approved');
alter table learning_private.projects enable row level security;
alter table learning_private.encouragements enable row level security;
alter table learning_private.comments enable row level security;
revoke all on all tables in schema learning_private from public, anon, authenticated;

create function learning_private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to continue' using errcode = '42501'; end if;
  return actor;
end;
$$;
create function learning_private.project_json(p learning_private.projects) returns jsonb
language sql immutable set search_path = '' as $$
 select jsonb_build_object('id',p.id,'book_title',p.book_title,'title',p.title,'format',p.format,
   'summary',p.summary,'takeaways',p.takeaways,'recommendation',p.recommendation,'question',p.question,
   'status',p.status,'review_note',p.review_note,'updated_at',p.updated_at);
$$;
create function learning_private.comment_json(c learning_private.comments) returns jsonb
language sql immutable set search_path = '' as $$
 select jsonb_build_object('id',c.id,'project_id',c.project_id,'body',c.body,'status',c.status,'review_note',c.review_note,
   'created_at',c.created_at,'updated_at',c.updated_at);
$$;
create function learning_private.validate_cursor(p_limit integer,p_max integer,p_before timestamptz,p_before_id uuid)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > p_max or (p_before is null) <> (p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then
    raise exception 'Invalid page cursor or limit' using errcode = '22023';
  end if;
end;
$$;
create function learning_private.check_version(p_actual timestamptz,p_expected timestamptz)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_expected is null or p_actual is distinct from p_expected then
    raise exception 'This item changed. Refresh it before trying again.' using errcode = 'PT409';
  end if;
end;
$$;
-- Every caller holds the project row lock before touching its feedback.
-- Re-publication never automatically restores an old comment's approval.
create function learning_private.reset_feedback(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  delete from learning_private.encouragements where project_id = p_id;
  update learning_private.comments set status = 'pending', review_note = null, reviewed_by = null,
    updated_at = greatest(clock_timestamp(),updated_at + interval '1 microsecond')
    where project_id = p_id and status = 'approved';
end;
$$;

create function public.list_my_learning_projects()
returns table(id uuid,book_title text,title text,format text,summary text,takeaways text,recommendation text,question text,
  status text,review_note text,updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user();
begin
  return query select p.id,p.book_title,p.title,p.format,p.summary,p.takeaways,p.recommendation,p.question,p.status,p.review_note,p.updated_at
    from learning_private.projects p where p.owner_id = actor order by p.updated_at desc,p.id desc limit 25;
end;
$$;
create function public.list_published_learning_projects(p_limit integer default 12,p_before timestamptz default null,p_before_id uuid default null)
returns table(id uuid,book_title text,title text,format text,summary text,takeaways text,recommendation text,question text,published_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform learning_private.validate_cursor(p_limit,24,p_before,p_before_id);
  return query select p.id,p.book_title,p.title,p.format,p.summary,p.takeaways,p.recommendation,p.question,p.published_at
    from learning_private.projects p where p.status = 'published' and (p_before is null or (p.published_at,p.id) < (p_before,p_before_id))
    order by p.published_at desc,p.id desc limit p_limit;
end;
$$;
create function public.save_learning_project(p_id uuid,p_book_title text,p_title text,p_format text,p_summary text,
  p_takeaways text,p_recommendation text,p_question text,p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); item learning_private.projects; candidate learning_private.projects;
begin
  candidate.book_title := btrim(coalesce(p_book_title,'')); candidate.title := btrim(coalesce(p_title,'')); candidate.format := p_format;
  candidate.summary := btrim(coalesce(p_summary,'')); candidate.takeaways := btrim(coalesce(p_takeaways,''));
  candidate.recommendation := btrim(coalesce(p_recommendation,'')); candidate.question := btrim(coalesce(p_question,''));
  if p_id is null or length(candidate.book_title) not between 1 and 200 or length(candidate.title) not between 1 and 120
    or p_format is null or p_format not in ('presentation','review') or length(candidate.summary) > 2000 or length(candidate.takeaways) > 2000
    or length(candidate.recommendation) > 1000 or length(candidate.question) > 500 then
    raise exception 'Check the project fields and their length limits' using errcode = '22023';
  end if;
  -- One owner lock serializes count-and-insert, including different project IDs.
  perform pg_advisory_xact_lock(hashtextextended('learning-project-owner:' || actor::text,0));
  select * into item from learning_private.projects p where p.id = p_id for update;
  if item.id is not null then
    if item.owner_id <> actor then raise exception 'Project unavailable' using errcode = '42501'; end if;
    if p_expected_updated_at is null and (item.book_title,item.title,item.format,item.summary,item.takeaways,item.recommendation,item.question)
      is not distinct from (candidate.book_title,candidate.title,candidate.format,candidate.summary,candidate.takeaways,candidate.recommendation,candidate.question) then
      return learning_private.project_json(item); -- Recover a completed create, without overwriting later work.
    end if;
    perform learning_private.check_version(item.updated_at,p_expected_updated_at);
    if item.status not in ('draft','changes_requested') then
      raise exception 'Withdraw the project before editing it' using errcode = 'PT409';
    end if;
    update learning_private.projects p set book_title = candidate.book_title,title = candidate.title,format = candidate.format,
      summary = candidate.summary,takeaways = candidate.takeaways,recommendation = candidate.recommendation,question = candidate.question,
      status = 'draft',updated_at = greatest(clock_timestamp(),p.updated_at + interval '1 microsecond') where p.id = p_id returning * into item;
  else
    if p_expected_updated_at is not null then raise exception 'Project unavailable' using errcode = 'PT409'; end if;
    if (select count(*) from learning_private.projects where owner_id = actor) >= 25 then
      raise exception 'Your notebook has reached its 25 project limit' using errcode = '54000';
    end if;
    insert into learning_private.projects(id,owner_id,book_title,title,format,summary,takeaways,recommendation,question)
      values (p_id,actor,candidate.book_title,candidate.title,candidate.format,candidate.summary,candidate.takeaways,candidate.recommendation,candidate.question)
      returning * into item;
  end if;
  return learning_private.project_json(item);
end;
$$;
create function public.submit_learning_project(p_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); item learning_private.projects;
begin
  select * into item from learning_private.projects p where p.id = p_id and p.owner_id = actor for update;
  if item.id is null then raise exception 'Project unavailable' using errcode = '42501'; end if;
  perform learning_private.check_version(item.updated_at,p_expected_updated_at);
  if item.status not in ('draft','changes_requested') then raise exception 'Only a private project can be submitted' using errcode = 'PT409'; end if;
  if length(btrim(item.summary)) = 0 or length(btrim(item.takeaways)) = 0 or length(btrim(item.recommendation)) = 0 then
    raise exception 'Add your summary, takeaways and recommendation before submitting' using errcode = '22023';
  end if;
  update learning_private.projects p set status = 'submitted',review_note = null,reviewed_by = null,
    updated_at = greatest(clock_timestamp(),p.updated_at + interval '1 microsecond') where p.id = p_id returning * into item;
  return learning_private.project_json(item);
end;
$$;
create function public.withdraw_learning_project(p_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); item learning_private.projects;
begin
  select * into item from learning_private.projects p where p.id = p_id and p.owner_id = actor for update;
  if item.id is null then raise exception 'Project unavailable' using errcode = '42501'; end if;
  perform learning_private.check_version(item.updated_at,p_expected_updated_at);
  perform learning_private.reset_feedback(p_id);
  update learning_private.projects p set status = 'draft',published_at = null,
    updated_at = greatest(clock_timestamp(),p.updated_at + interval '1 microsecond') where p.id = p_id returning * into item;
  return learning_private.project_json(item);
end;
$$;
create function public.staff_list_learning_projects(p_limit integer default 24,p_before timestamptz default null,p_before_id uuid default null,p_user_id uuid default null)
returns table(id uuid,book_title text,title text,format text,summary text,takeaways text,recommendation text,question text,
  status text,review_note text,updated_at timestamptz,owner_user_id uuid,display_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform circulation_private.require_staff();
  perform learning_private.validate_cursor(p_limit,100,p_before,p_before_id);
  return query select p.id,p.book_title,p.title,p.format,p.summary,p.takeaways,p.recommendation,p.question,p.status,p.review_note,p.updated_at,p.owner_id,
    coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'),''),'Reader')
    from learning_private.projects p join auth.users u on u.id = p.owner_id
    where p.status in ('submitted','published','changes_requested') and (p_user_id is null or p.owner_id = p_user_id)
      and (p_before is null or (p.updated_at,p.id) < (p_before,p_before_id))
    order by p.updated_at desc,p.id desc limit p_limit;
end;
$$;
create function public.delete_learning_project(p_id uuid,p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); item learning_private.projects;
begin
  select * into item from learning_private.projects p where p.id = p_id and p.owner_id = actor for update;
  if item.id is null then raise exception 'Project unavailable' using errcode = '42501'; end if;
  perform learning_private.check_version(item.updated_at,p_expected_updated_at);
  if item.status not in ('draft','changes_requested') then raise exception 'Withdraw the project before deleting it' using errcode = 'PT409'; end if;
  delete from learning_private.projects where id = p_id;
end;
$$;
create function public.staff_review_learning_project(p_id uuid,p_action text,p_review_note text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := circulation_private.require_staff(); item learning_private.projects; note text := nullif(btrim(p_review_note),'');
begin
  if p_action is null or p_action not in ('publish','request_changes') or length(note) > 1000 or (p_action = 'request_changes' and note is null) then
    raise exception 'Choose a review action and add a short note when requesting changes' using errcode = '22023';
  end if;
  select * into item from learning_private.projects p where p.id = p_id and p.status in ('submitted','published') for update;
  if item.id is null then raise exception 'Submitted project unavailable' using errcode = '42501'; end if;
  perform learning_private.check_version(item.updated_at,p_expected_updated_at);
  if p_action = 'publish' and item.status <> 'submitted' then raise exception 'Only submitted work can be published' using errcode = 'PT409'; end if;
  if p_action = 'request_changes' then perform learning_private.reset_feedback(p_id); end if;
  update learning_private.projects p set status = case p_action when 'publish' then 'published' else 'changes_requested' end,
    review_note = note,reviewed_by = actor,published_at = case when p_action = 'publish' then clock_timestamp() end,
    updated_at = greatest(clock_timestamp(),p.updated_at + interval '1 microsecond') where p.id = p_id returning * into item;
  return learning_private.project_json(item);
end;
$$;

create function public.get_learning_project_feedback(p_project_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('encouragement_count',
    (select count(*) from learning_private.encouragements e join learning_private.projects p on p.id = e.project_id where p.id = p_project_id and p.status = 'published'),
    'comments',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'created_at',c.created_at) order by c.created_at,c.id)
      from learning_private.comments c join learning_private.projects p on p.id = c.project_id
      where p.id = p_project_id and p.status = 'published' and c.status = 'approved'),'[]'::jsonb));
$$;
create function public.list_my_learning_feedback(p_project_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user();
begin
  return jsonb_build_object('encouraged',exists(select 1 from learning_private.encouragements e where e.project_id = p_project_id and e.user_id = actor),
    'comments',coalesce((select jsonb_agg(learning_private.comment_json(c) || jsonb_build_object('is_published',p.status = 'published') order by c.created_at,c.id)
      from learning_private.comments c join learning_private.projects p on p.id = c.project_id
      where (p_project_id is null or c.project_id = p_project_id) and c.owner_id = actor),'[]'::jsonb));
end;
$$;
create function public.set_learning_project_encouragement(p_project_id uuid,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); item learning_private.projects;
begin
  if p_enabled is null then raise exception 'Choose whether to encourage this project' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('learning-encouragement-owner:' || actor::text,0));
  -- Always lock project before feedback; publication/withdrawal uses the same order.
  select * into item from learning_private.projects p where p.id = p_project_id and p.status = 'published' for update;
  if item.id is null then raise exception 'Published project unavailable' using errcode = '42501'; end if;
  if p_enabled then
    if not exists(select 1 from learning_private.encouragements where project_id = p_project_id and user_id = actor)
      and (select count(*) from learning_private.encouragements where user_id = actor) >= 1000 then
      raise exception 'Encouragement limit reached. Remove an earlier encouragement first.' using errcode = '54000';
    end if;
    insert into learning_private.encouragements(project_id,user_id) values(p_project_id,actor) on conflict do nothing;
  else delete from learning_private.encouragements where project_id = p_project_id and user_id = actor;
  end if;
  return jsonb_build_object('encouraged',p_enabled,'encouragement_count',(select count(*) from learning_private.encouragements where project_id = p_project_id));
end;
$$;
create function public.submit_learning_comment(p_id uuid,p_project_id uuid,p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); item learning_private.projects; comment learning_private.comments; body text := btrim(coalesce(p_body,''));
begin
  if p_id is null or p_project_id is null or length(body) not between 1 and 500 then
    raise exception 'Write a comment between 1 and 500 characters' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('learning-comment-owner:' || actor::text,0));
  select * into item from learning_private.projects p where p.id = p_project_id and p.status = 'published' for update;
  if item.id is null then raise exception 'Published project unavailable' using errcode = '42501'; end if;
  select * into comment from learning_private.comments c where c.id = p_id;
  if comment.id is not null then
    if comment.owner_id <> actor or comment.project_id <> p_project_id or comment.body <> body then
      raise exception 'Comment request conflicts with an existing request' using errcode = 'PT409';
    end if;
    return learning_private.comment_json(comment);
  end if;
  if (select count(*) from learning_private.comments where owner_id = actor and project_id = p_project_id) >= 5
    or (select count(*) from learning_private.comments where owner_id = actor) >= 50
    or (select count(*) from learning_private.comments where project_id = p_project_id) >= 50 then
    raise exception 'Comment limit reached. Withdraw an old comment before adding another.' using errcode = '54000';
  end if;
  insert into learning_private.comments(id,project_id,owner_id,body) values(p_id,p_project_id,actor,body) returning * into comment;
  return learning_private.comment_json(comment);
end;
$$;
create function public.withdraw_learning_comment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := learning_private.require_user(); project uuid;
begin
  select c.project_id into project from learning_private.comments c where c.id = p_id and c.owner_id = actor;
  if project is null then return; end if; -- Idempotent, and cannot reveal another author's comment.
  perform 1 from learning_private.projects p where p.id = project for update;
  delete from learning_private.comments where id = p_id and owner_id = actor;
end;
$$;
create function public.staff_list_learning_comments(p_limit integer default 24,p_before timestamptz default null,p_before_id uuid default null)
returns table(id uuid,project_id uuid,project_title text,body text,status text,review_note text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform circulation_private.require_staff();
  perform learning_private.validate_cursor(p_limit,100,p_before,p_before_id);
  return query select c.id,c.project_id,p.title,c.body,c.status,c.review_note,c.created_at,c.updated_at
    from learning_private.comments c join learning_private.projects p on p.id = c.project_id
    where p.status = 'published' and c.status in ('pending','approved') and (p_before is null or (c.updated_at,c.id) < (p_before,p_before_id))
    order by c.updated_at desc,c.id desc limit p_limit;
end;
$$;
create function public.staff_review_learning_comment(p_id uuid,p_action text,p_review_note text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := circulation_private.require_staff(); item learning_private.projects; comment learning_private.comments;
  project uuid; note text := nullif(btrim(p_review_note),'');
begin
  if p_action is null or p_action not in ('approve','reject') or length(note) > 1000 then
    raise exception 'Choose a valid comment review action and a short note' using errcode = '22023';
  end if;
  select c.project_id into project from learning_private.comments c where c.id = p_id;
  select * into item from learning_private.projects p where p.id = project and p.status = 'published' for update;
  if item.id is null then raise exception 'Comment unavailable for review' using errcode = '42501'; end if;
  select * into comment from learning_private.comments c where c.id = p_id and c.status in ('pending','approved') for update;
  if comment.id is null then raise exception 'Comment unavailable for review' using errcode = '42501'; end if;
  perform learning_private.check_version(comment.updated_at,p_expected_updated_at);
  update learning_private.comments c set status = case p_action when 'approve' then 'approved' else 'rejected' end,
    review_note = note,reviewed_by = actor,updated_at = greatest(clock_timestamp(),c.updated_at + interval '1 microsecond')
    where c.id = p_id returning * into comment;
  return learning_private.comment_json(comment);
end;
$$;

revoke all on all functions in schema learning_private from public, anon, authenticated;
revoke all on function public.list_my_learning_projects(),public.list_published_learning_projects(integer,timestamptz,uuid),
  public.save_learning_project(uuid,text,text,text,text,text,text,text,timestamptz),public.submit_learning_project(uuid,timestamptz),
  public.withdraw_learning_project(uuid,timestamptz),public.staff_list_learning_projects(integer,timestamptz,uuid,uuid),
  public.delete_learning_project(uuid,timestamptz),
  public.staff_review_learning_project(uuid,text,text,timestamptz),public.get_learning_project_feedback(uuid),
  public.list_my_learning_feedback(uuid),public.set_learning_project_encouragement(uuid,boolean),
  public.submit_learning_comment(uuid,uuid,text),public.withdraw_learning_comment(uuid),
  public.staff_list_learning_comments(integer,timestamptz,uuid),public.staff_review_learning_comment(uuid,text,text,timestamptz)
from public, anon, authenticated;
grant execute on function public.list_published_learning_projects(integer,timestamptz,uuid),public.get_learning_project_feedback(uuid) to anon, authenticated;
grant execute on function public.list_my_learning_projects(),public.save_learning_project(uuid,text,text,text,text,text,text,text,timestamptz),
  public.submit_learning_project(uuid,timestamptz),public.withdraw_learning_project(uuid,timestamptz),
  public.delete_learning_project(uuid,timestamptz),
  public.staff_list_learning_projects(integer,timestamptz,uuid,uuid),public.staff_review_learning_project(uuid,text,text,timestamptz),
  public.list_my_learning_feedback(uuid),public.set_learning_project_encouragement(uuid,boolean),
  public.submit_learning_comment(uuid,uuid,text),public.withdraw_learning_comment(uuid),
  public.staff_list_learning_comments(integer,timestamptz,uuid),public.staff_review_learning_comment(uuid,text,text,timestamptz)
to authenticated;
comment on schema learning_private is 'Private classroom projects and moderated feedback. All access uses checked RPCs; no public author identities.';
notify pgrst, 'reload schema';
commit;
