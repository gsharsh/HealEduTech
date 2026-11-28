-- PostgREST request budget for authenticated, write-capable transactions.
-- Apply only after reviewing the release guide. This file does not configure
-- Auth, Storage, Realtime, CDN/WAF or anonymous-read abuse protection.
-- The counter shares the request transaction: rejected/rolled-back requests
-- do not consume budget. This limits committed work, not hostile ingress.
begin;

do $$
declare existing_hook text;
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    raise exception 'PostgREST authenticator role is required before installing the request budget';
  end if;
  -- Refuse to overwrite a provider/operator hook, including database-specific
  -- overrides that would silently bypass the newly configured hook.
  select split_part(setting, '=', 2) into existing_hook
  from pg_db_role_setting s
  cross join lateral unnest(s.setconfig) setting
  where s.setrole in (0, (select oid from pg_roles where rolname = 'authenticator'))
    and s.setdatabase in (0, (select oid from pg_database where datname = current_database()))
    and setting like 'pgrst.db_pre_request=%'
    and split_part(setting, '=', 2) not in ('', 'api_private.enforce_request_budget')
  limit 1;
  if existing_hook is not null then
    raise exception 'An existing PostgREST pre-request hook must be composed with the EVG request budget before installation';
  end if;
end $$;

create schema if not exists api_private;
revoke all on schema api_private from public;
grant usage on schema api_private to anon, authenticated;

-- One row per existing account; fixed storage per account, no IP/request log.
-- Reuse the row for every window and remove it with the owning Auth account.
create table api_private.request_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 120)
);
alter table api_private.request_budgets enable row level security;
revoke all on api_private.request_budgets from public, anon, authenticated;

create function api_private.enforce_request_budget()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  checked_at timestamptz := clock_timestamp();
  accepted_window timestamptz;
  retry_seconds integer;
begin
  -- GET/HEAD and POST calls to STABLE/IMMUTABLE RPCs run READ ONLY in
  -- PostgREST. They cannot commit mutations and must not write a counter.
  -- transaction_read_only is the database's access mode, not a client header.
  if current_setting('transaction_read_only') = 'on'
     or coalesce(current_setting('request.method', true), '') not in ('POST', 'PUT', 'PATCH', 'DELETE') then
    return;
  end if;
  actor_id := auth.uid();
  if actor_id is null then return; end if;

  -- A single atomic upsert serializes concurrent requests from the same user.
  -- The WHERE predicate prevents incrementing beyond the quota. It cannot be
  -- bypassed by changing the endpoint, payload, request ID or spoofed IP.
  insert into api_private.request_budgets as budget(user_id, window_started_at, request_count)
  values (actor_id, checked_at, 1)
  on conflict (user_id) do update
    set window_started_at = case
          when budget.window_started_at <= checked_at - interval '60 seconds' then checked_at
          else budget.window_started_at end,
        request_count = case
          when budget.window_started_at <= checked_at - interval '60 seconds' then 1
          else budget.request_count + 1 end
    where budget.window_started_at <= checked_at - interval '60 seconds'
       or budget.request_count < 120
  returning window_started_at into accepted_window;

  if accepted_window is not null then return; end if;
  select greatest(1, least(60, ceil(extract(epoch from
    (budget.window_started_at + interval '60 seconds' - clock_timestamp())))::integer))
  into retry_seconds from api_private.request_budgets budget where budget.user_id = actor_id;
  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'EVG_RATE_LIMITED',
      'message', 'Too many requests. Please wait before trying again.',
      'details', null,
      'hint', 'Your change was not saved. Keep your draft and retry after the stated delay.'
    )::text,
    detail = json_build_object(
      'status', 429,
      'headers', json_build_object(
        'Retry-After', coalesce(retry_seconds, 60)::text,
        'Access-Control-Expose-Headers', 'Retry-After',
        'Cache-Control', 'no-store')
    )::text;
end;
$$;
revoke all on function api_private.enforce_request_budget() from public;
grant execute on function api_private.enforce_request_budget() to anon, authenticated;

-- Use a database-specific setting so other databases on the same PostgreSQL
-- server are untouched. PostgREST must have db-config enabled (its default).
do $$ begin
  execute format('alter role authenticator in database %I set pgrst.db_pre_request = %L',
    current_database(), 'api_private.enforce_request_budget');
end $$;
notify pgrst, 'reload config';
commit;
