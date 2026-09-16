alter table public.ripcom_api_requests
  add column if not exists completed_at timestamptz;

create or replace function public.ripcom_enforce_operator_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.revoked_at is not null then
    new.status := 'SUSPENDED';
  end if;
  return new;
end;
$$;

drop trigger if exists ripcom_operator_state_guard on public.ripcom_operators;
create trigger ripcom_operator_state_guard
before insert or update on public.ripcom_operators
for each row execute function public.ripcom_enforce_operator_state();

create or replace function public.ripcom_enforce_api_rate_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_status text;
  v_revoked timestamptz;
  v_count integer;
begin
  select max_requests_per_minute, status, revoked_at
    into v_limit, v_status, v_revoked
  from public.ripcom_operators
  where id = new.operator_id;

  if v_status is distinct from 'ACTIVE' or v_revoked is not null then
    raise exception 'RIPCOM_OPERATOR_INACTIVE';
  end if;

  select count(*) into v_count
  from public.ripcom_api_requests
  where operator_id = new.operator_id
    and created_at >= now() - interval '1 minute';

  if v_count >= coalesce(v_limit, 120) then
    raise exception 'RIPCOM_RATE_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists ripcom_api_rate_limit on public.ripcom_api_requests;
create trigger ripcom_api_rate_limit
before insert on public.ripcom_api_requests
for each row execute function public.ripcom_enforce_api_rate_limit();

create or replace function public.ripcom_enforce_session_rate_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_status text;
  v_revoked timestamptz;
  v_count integer;
begin
  select max_sessions_per_minute, status, revoked_at
    into v_limit, v_status, v_revoked
  from public.ripcom_operators
  where id = new.operator_id;

  if v_status is distinct from 'ACTIVE' or v_revoked is not null then
    raise exception 'RIPCOM_OPERATOR_INACTIVE';
  end if;

  select count(*) into v_count
  from public.ripcom_b2b_sessions
  where operator_id = new.operator_id
    and created_at >= now() - interval '1 minute';

  if v_count >= coalesce(v_limit, 30) then
    raise exception 'RIPCOM_SESSION_RATE_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists ripcom_session_rate_limit on public.ripcom_b2b_sessions;
create trigger ripcom_session_rate_limit
before insert on public.ripcom_b2b_sessions
for each row execute function public.ripcom_enforce_session_rate_limit();

create or replace function public.ripcom_finalize_api_request_metrics()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.response_status is not null and old.response_status is null then
    new.completed_at := coalesce(new.completed_at, now());
    new.success := new.response_status >= 200 and new.response_status < 400;
    new.error_code := case
      when new.success then null
      else nullif(new.response_body->>'error','')
    end;
    new.latency_ms := greatest(0, extract(epoch from (new.completed_at - new.created_at)) * 1000);
  end if;
  return new;
end;
$$;

drop trigger if exists ripcom_api_request_metrics on public.ripcom_api_requests;
create trigger ripcom_api_request_metrics
before update on public.ripcom_api_requests
for each row execute function public.ripcom_finalize_api_request_metrics();
