-- Serialize two application-level replacement/correction critical sections.
-- This migration only replaces existing function bodies; their existing grants,
-- security modes, and public wrappers remain unchanged.

-- Checkout already locks the physical copy before checking active loans. A
-- correction must use that same copy lock before rechecking active loans, or
-- it can observe an empty active-loan set while a checkout is still waiting on
-- the copy and then overwrite the newly checked-out copy's condition.
-- Resolve and correction both use copy -> loan ordering so they cannot form a
-- lock cycle with checkout or with each other.
create or replace function circulation_private._resolve_circulation_loan(p_request_id uuid, p_loan_id uuid, p_resolution text, p_return_condition text default null)
returns public.loans language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.loans;
  existing_event public.circulation_events;
  resolution_payload jsonb;
  target_copy_id uuid;
begin
  actor_id := circulation_private.require_staff();
  if p_request_id is null or p_loan_id is null then
    raise exception 'Resolution request is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  perform circulation_private.validate_resolution(p_resolution, p_return_condition);
  resolution_payload := jsonb_build_object('loan_id', p_loan_id, 'resolution', p_resolution, 'return_condition', p_return_condition);

  select * into existing_event from public.circulation_events where request_id = p_request_id;
  if existing_event.id is not null then
    if existing_event.loan_id <> p_loan_id or existing_event.event_type <> p_resolution or existing_event.payload <> resolution_payload then
      raise exception 'Resolution request conflicts with an existing request' using errcode = '23505';
    end if;
    select * into result from public.loans where id = p_loan_id;
    return result;
  end if;

  -- Lock the copy first. Checkout and correction use this same order, so a
  -- resolution cannot race a copy transition between reading and updating it.
  select l.copy_id into target_copy_id from public.loans l where l.id = p_loan_id;
  if target_copy_id is null then
    raise exception 'Loan not found' using errcode = '23503';
  end if;
  perform 1 from public.book_copies where id = target_copy_id for update;
  if not found then
    raise exception 'Copy not found' using errcode = '23503';
  end if;

  select * into result from public.loans where id = p_loan_id for update;
  if result.id is null then
    raise exception 'Loan not found' using errcode = '23503';
  end if;
  if result.resolved_at is not null then
    raise exception 'Loan is already resolved' using errcode = '55000';
  end if;

  update public.loans
  set resolved_at = now(),
      resolution = p_resolution,
      return_condition = p_return_condition,
      resolved_by = actor_id
  where id = p_loan_id
  returning * into result;
  update public.book_copies
  set condition = case when p_resolution = 'lost' then 'lost' else p_return_condition end
  where id = result.copy_id;
  insert into public.circulation_events(request_id, loan_id, event_type, actor_user_id, payload)
  values (p_request_id, p_loan_id, p_resolution, actor_id, resolution_payload);
  return result;
end;
$$;

create or replace function circulation_private._correct_circulation_resolution(p_request_id uuid, p_loan_id uuid, p_resolution text, p_return_condition text default null)
returns public.loans language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor_id uuid;
  result public.loans;
  existing_event public.circulation_events;
  correction_payload jsonb;
  target_copy_id uuid;
begin
  actor_id := circulation_private.require_staff();
  if p_request_id is null or p_loan_id is null then
    raise exception 'Correction request is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  perform circulation_private.validate_resolution(p_resolution, p_return_condition);
  correction_payload := jsonb_build_object('loan_id', p_loan_id, 'resolution', p_resolution, 'return_condition', p_return_condition);

  select * into existing_event from public.circulation_events where request_id = p_request_id;
  if existing_event.id is not null then
    if existing_event.loan_id <> p_loan_id or existing_event.event_type <> 'correction' or existing_event.payload <> correction_payload then
      raise exception 'Correction request conflicts with an existing request' using errcode = '23505';
    end if;
    select * into result from public.loans where id = p_loan_id;
    return result;
  end if;

  -- Lock the physical copy before the active-loan check. A checkout that is
  -- already holding this row therefore commits or rolls back before this
  -- correction decides whether it is safe to rewrite the old resolution.
  select l.copy_id into target_copy_id from public.loans l where l.id = p_loan_id;
  if target_copy_id is null then
    raise exception 'Resolved loan not found' using errcode = '23503';
  end if;
  perform 1 from public.book_copies where id = target_copy_id for update;
  if not found then
    raise exception 'Copy not found' using errcode = '23503';
  end if;

  select * into result from public.loans where id = p_loan_id for update;
  if result.id is null or result.resolved_at is null then
    raise exception 'Resolved loan not found' using errcode = '23503';
  end if;
  if exists (select 1 from public.loans l where l.copy_id = result.copy_id and l.resolved_at is null) then
    raise exception 'Copy has been loaned again; correction is not safe' using errcode = '55000';
  end if;

  update public.loans
  set resolution = p_resolution,
      return_condition = p_return_condition,
      resolved_by = actor_id
  where id = p_loan_id
  returning * into result;
  update public.book_copies
  set condition = case when p_resolution = 'lost' then 'lost' else p_return_condition end
  where id = result.copy_id;
  insert into public.circulation_events(request_id, loan_id, event_type, actor_user_id, payload)
  values (p_request_id, p_loan_id, 'correction', actor_id, correction_payload);
  return result;
end;
$$;

-- Replacing a user's set is a delete/insert critical section. A transaction
-- advisory lock keyed by the authenticated user prevents two empty-set or
-- otherwise overlapping replacements from observing each other's gap.
create or replace function public.replace_my_interests(p_topics text[])
returns table(topic text) language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('interests:' || (select auth.uid())::text, 0)
  );
  delete from public.learner_interests where user_id = (select auth.uid());
  insert into public.learner_interests(user_id, topic)
  select (select auth.uid()), value from unnest(coalesce(p_topics, array[]::text[])) as value;
  return query select i.topic from public.learner_interests i
    where i.user_id = (select auth.uid()) order by i.topic;
end;
$$;
