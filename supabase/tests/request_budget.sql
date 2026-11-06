-- Rollback-only checks of the PostgREST pre-request contract. The local SQL
-- harness supplies trusted request metadata; it does not prove JWT or HTTP.
begin;
insert into auth.users(id, email) values
  ('84000000-0000-4000-8000-000000000001', 'budget-one@example.invalid'),
  ('84000000-0000-4000-8000-000000000002', 'budget-two@example.invalid');

do $$ begin
  if not exists (
    select 1 from pg_db_role_setting s cross join lateral unnest(s.setconfig) setting
    where s.setrole = (select oid from pg_roles where rolname = 'authenticator')
      and s.setdatabase = (select oid from pg_database where datname = current_database())
      and setting = 'pgrst.db_pre_request=api_private.enforce_request_budget'
  ) then raise exception 'PostgREST request hook is not installed'; end if;
  if has_table_privilege('authenticated', 'api_private.request_budgets', 'SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('anon', 'api_private.request_budgets', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'API roles can access the request counters directly';
  end if;
end $$;

set local role anon;
select set_config('request.method', 'POST', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select api_private.enforce_request_budget();
reset role;
do $$ begin
  if exists(select 1 from api_private.request_budgets) then
    raise exception 'Anonymous requests unexpectedly consume an account budget';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
-- All eligible endpoints/methods share one user budget. Header values have no
-- authority to choose another account or reset a counter.
do $$ declare i integer; begin
  for i in 1..120 loop
    perform set_config('request.method', (array['POST','PUT','PATCH','DELETE'])[1 + (i % 4)], true);
    perform set_config('request.path', case when i % 2 = 0 then '/reading_records' else '/rpc/replace_my_interests' end, true);
    perform set_config('request.headers', json_build_object('x-forwarded-for', i::text, 'x-user-id', '84000000-0000-4000-8000-000000000002')::text, true);
    perform api_private.enforce_request_budget();
  end loop;
end $$;

do $$ declare body jsonb; response jsonb; msg text; extra text; begin
  begin
    perform api_private.enforce_request_budget();
    raise exception 'Request 121 was accepted';
  exception when sqlstate 'PGRST' then
    get stacked diagnostics msg = message_text, extra = pg_exception_detail;
    body := msg::jsonb; response := extra::jsonb;
    if body->>'code' <> 'EVG_RATE_LIMITED' or (response->>'status')::integer <> 429
       or (response->'headers'->>'Retry-After')::integer not between 1 and 60
       or response->'headers'->>'Access-Control-Expose-Headers' <> 'Retry-After'
       or response->'headers'->>'Cache-Control' <> 'no-store' then
      raise exception 'Rate-limit response does not contain the documented 429 contract';
    end if;
  end;
  -- Read-only API methods work even after the mutation budget is exhausted.
  perform set_config('request.method', 'GET', true);
  perform api_private.enforce_request_budget();
  perform set_config('request.method', 'HEAD', true);
  perform api_private.enforce_request_budget();
end $$;

select set_config('request.method', 'POST', true);
select set_config('request.jwt.claims', '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select api_private.enforce_request_budget();
reset role;
do $$ begin
  if (select request_count from api_private.request_budgets where user_id='84000000-0000-4000-8000-000000000001') <> 120
     or (select request_count from api_private.request_budgets where user_id='84000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'Budget boundary, denied request or account isolation is incorrect';
  end if;
end $$;

update api_private.request_budgets set window_started_at = clock_timestamp() - interval '61 seconds'
where user_id='84000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select api_private.enforce_request_budget();
do $$ begin
  -- A failed application transaction rolls back its budget increment too.
  -- This behavior is deliberately recorded, not presented as ingress control.
  begin
    perform api_private.enforce_request_budget();
    raise check_violation using message = 'Synthetic downstream failure';
  exception when check_violation then null;
  end;
  begin
    update api_private.request_budgets set request_count=1;
    raise exception 'Client reset its rate-limit counter';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if (select request_count from api_private.request_budgets where user_id='84000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Expired window did not reset or failed transaction consumed budget';
  end if;
end $$;
delete from auth.users where id='84000000-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from api_private.request_budgets where user_id='84000000-0000-4000-8000-000000000002') then
    raise exception 'Deleted account left an orphaned budget record';
  end if;
end $$;
rollback;

-- PostgREST executes STABLE/IMMUTABLE RPCs read-only even when HTTP uses POST.
-- This must return before any counter INSERT, not turn search into HTTP 405.
begin read only;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.method', 'POST', true);
select set_config('request.path', '/rpc/search_books', true);
select api_private.enforce_request_budget();
rollback;
