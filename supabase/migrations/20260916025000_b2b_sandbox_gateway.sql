create table if not exists public.b2b_integrations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  adapter text not null default 'GENERIC_HMAC_V1',
  environment text not null default 'sandbox' check (environment in ('sandbox','staging','production')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','MAINTENANCE')),
  provider_id uuid null references public.providers(id) on delete set null,
  key_id text not null unique,
  capabilities jsonb not null default '{}'::jsonb,
  config_public jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(slug)) > 0),
  check (length(trim(name)) > 0),
  check (length(trim(key_id)) > 0)
);

create table if not exists public.b2b_provider_sessions (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.b2b_integrations(id) on delete cascade,
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  external_session_id text not null,
  external_player_id text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','FINISHED','EXPIRED','ERROR')),
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_session_id),
  unique (integration_id, game_session_id),
  check (length(trim(external_session_id)) > 0),
  check (length(trim(external_player_id)) > 0)
);

create table if not exists public.b2b_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.b2b_integrations(id) on delete cascade,
  provider_session_id uuid not null references public.b2b_provider_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  external_event_id text not null,
  event_type text not null check (event_type in ('BALANCE','BET','WIN','REFUND')),
  amount numeric(18,2) not null default 0 check (amount >= 0),
  original_event_id text null,
  status text not null check (status in ('APPLIED','REJECTED')),
  error_code text null,
  balance_after numeric(18,2) not null,
  request_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (integration_id, external_event_id),
  check (length(trim(external_event_id)) > 0),
  check (length(trim(request_hash)) > 0)
);

create index if not exists idx_b2b_provider_sessions_user on public.b2b_provider_sessions(user_id, created_at desc);
create index if not exists idx_b2b_events_session_time on public.b2b_events(provider_session_id, created_at desc);
create index if not exists idx_b2b_events_user_time on public.b2b_events(user_id, created_at desc);
create index if not exists idx_b2b_events_original on public.b2b_events(integration_id, original_event_id) where original_event_id is not null;

alter table public.b2b_integrations enable row level security;
alter table public.b2b_provider_sessions enable row level security;
alter table public.b2b_events enable row level security;

revoke all on table public.b2b_integrations from anon, authenticated;
revoke all on table public.b2b_provider_sessions from anon, authenticated;
revoke all on table public.b2b_events from anon, authenticated;
grant select on table public.b2b_integrations to authenticated;
grant select on table public.b2b_provider_sessions to authenticated;
grant select on table public.b2b_events to authenticated;

drop policy if exists b2b_integrations_admin_read on public.b2b_integrations;
create policy b2b_integrations_admin_read on public.b2b_integrations
for select to authenticated using ((select public.is_admin()));

drop policy if exists b2b_provider_sessions_read on public.b2b_provider_sessions;
create policy b2b_provider_sessions_read on public.b2b_provider_sessions
for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists b2b_events_admin_read on public.b2b_events;
create policy b2b_events_admin_read on public.b2b_events
for select to authenticated using ((select public.is_admin()));

drop trigger if exists set_b2b_integrations_updated_at on public.b2b_integrations;
create trigger set_b2b_integrations_updated_at before update on public.b2b_integrations
for each row execute function public.set_updated_at();

drop trigger if exists set_b2b_provider_sessions_updated_at on public.b2b_provider_sessions;
create trigger set_b2b_provider_sessions_updated_at before update on public.b2b_provider_sessions
for each row execute function public.set_updated_at();

insert into public.b2b_integrations(slug,name,adapter,environment,status,key_id,capabilities,config_public)
values (
  'rr7-sandbox',
  'RR7 Generic B2B Sandbox',
  'GENERIC_HMAC_V1',
  'sandbox',
  'ACTIVE',
  'rr7-sandbox-v1',
  jsonb_build_object('launch',true,'balance',true,'bet',true,'win',true,'refund',true,'hmac','SHA-256','idempotency',true),
  jsonb_build_object('currency','DEMO','callbackVersion','v1','maxClockSkewSeconds',300)
)
on conflict (slug) do update set
  name=excluded.name,
  adapter=excluded.adapter,
  environment=excluded.environment,
  key_id=excluded.key_id,
  capabilities=excluded.capabilities,
  config_public=excluded.config_public,
  updated_at=now();

create or replace function public.process_b2b_wallet_event(
  p_integration_id uuid,
  p_external_event_id text,
  p_event_type text,
  p_external_session_id text,
  p_external_player_id text,
  p_amount numeric,
  p_original_event_id text,
  p_request_hash text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  b2b_event_id uuid,
  event_status text,
  event_type text,
  applied_amount numeric,
  new_balance numeric,
  idempotent boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_integration public.b2b_integrations%rowtype;
  v_provider_session public.b2b_provider_sessions%rowtype;
  v_game_session public.game_sessions%rowtype;
  v_wallet uuid;
  v_balance numeric(18,2);
  v_existing public.b2b_events%rowtype;
  v_original public.b2b_events%rowtype;
  v_refunded numeric(18,2) := 0;
  v_event_type text := upper(trim(coalesce(p_event_type,'')));
  v_amount numeric(18,2) := round(coalesce(p_amount,0)::numeric,2);
  v_event uuid;
  v_external_tx text;
  v_error text;
begin
  if p_integration_id is null then raise exception 'B2B_INTEGRATION_REQUIRED'; end if;
  if length(trim(coalesce(p_external_event_id,''))) < 3 or length(trim(p_external_event_id)) > 128 then raise exception 'B2B_EVENT_ID_INVALID'; end if;
  if v_event_type not in ('BALANCE','BET','WIN','REFUND') then raise exception 'B2B_EVENT_TYPE_INVALID'; end if;
  if length(trim(coalesce(p_external_session_id,''))) < 3 then raise exception 'B2B_SESSION_ID_INVALID'; end if;
  if length(trim(coalesce(p_external_player_id,''))) < 3 then raise exception 'B2B_PLAYER_ID_INVALID'; end if;
  if length(trim(coalesce(p_request_hash,''))) < 16 then raise exception 'B2B_REQUEST_HASH_INVALID'; end if;
  if v_event_type <> 'BALANCE' and v_amount <= 0 then raise exception 'B2B_AMOUNT_INVALID'; end if;
  if v_event_type = 'BALANCE' then v_amount := 0; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_integration_id::text || ':' || trim(p_external_event_id), 0));

  select * into v_existing
  from public.b2b_events
  where integration_id=p_integration_id and external_event_id=trim(p_external_event_id);

  if found then
    if v_existing.request_hash <> trim(p_request_hash) then raise exception 'B2B_IDEMPOTENCY_CONFLICT'; end if;
    return query select v_existing.id,v_existing.status,v_existing.event_type,v_existing.amount,v_existing.balance_after,true,v_existing.error_code;
    return;
  end if;

  select * into v_integration from public.b2b_integrations where id=p_integration_id;
  if not found or v_integration.status <> 'ACTIVE' then raise exception 'B2B_INTEGRATION_UNAVAILABLE'; end if;
  if v_integration.environment <> 'sandbox' then raise exception 'B2B_SANDBOX_ONLY'; end if;

  select * into v_provider_session
  from public.b2b_provider_sessions
  where integration_id=p_integration_id and external_session_id=trim(p_external_session_id)
  for update;
  if not found then raise exception 'B2B_SESSION_NOT_FOUND'; end if;
  if v_provider_session.external_player_id <> trim(p_external_player_id) then raise exception 'B2B_PLAYER_MISMATCH'; end if;
  if v_provider_session.status <> 'ACTIVE' then raise exception 'B2B_SESSION_NOT_ACTIVE'; end if;
  if v_provider_session.expires_at is not null and v_provider_session.expires_at <= now() then
    update public.b2b_provider_sessions set status='EXPIRED' where id=v_provider_session.id;
    raise exception 'B2B_SESSION_EXPIRED';
  end if;

  select * into v_game_session from public.game_sessions where id=v_provider_session.game_session_id for update;
  if not found or v_game_session.user_id <> v_provider_session.user_id then raise exception 'B2B_GAME_SESSION_INVALID'; end if;
  if v_game_session.status <> 'ACTIVE' then raise exception 'B2B_GAME_SESSION_NOT_ACTIVE'; end if;
  if v_game_session.expires_at is not null and v_game_session.expires_at <= now() then raise exception 'B2B_GAME_SESSION_EXPIRED'; end if;

  select id into v_wallet from public.wallets where user_id=v_provider_session.user_id and currency='DEMO';
  if v_wallet is null then raise exception 'WALLET_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_wallet::text,0));
  select coalesce(sum(amount),0)::numeric(18,2) into v_balance from public.wallet_transactions where wallet_id=v_wallet;

  if v_event_type = 'BET' and v_amount > v_balance then
    v_error := 'INSUFFICIENT_DEMO_CREDITS';
  elsif v_event_type = 'REFUND' then
    if length(trim(coalesce(p_original_event_id,''))) < 3 then
      v_error := 'B2B_ORIGINAL_EVENT_REQUIRED';
    else
      select * into v_original
      from public.b2b_events
      where integration_id=p_integration_id
        and external_event_id=trim(p_original_event_id)
        and provider_session_id=v_provider_session.id
        and event_type='BET'
        and status='APPLIED';
      if not found then
        v_error := 'B2B_ORIGINAL_BET_NOT_FOUND';
      else
        select coalesce(sum(amount),0)::numeric(18,2) into v_refunded
        from public.b2b_events
        where integration_id=p_integration_id
          and provider_session_id=v_provider_session.id
          and event_type='REFUND'
          and status='APPLIED'
          and original_event_id=trim(p_original_event_id);
        if v_amount > (v_original.amount - v_refunded) then v_error := 'B2B_REFUND_EXCEEDS_BET'; end if;
      end if;
    end if;
  end if;

  if v_error is not null then
    insert into public.b2b_events(
      integration_id,provider_session_id,user_id,game_session_id,external_event_id,event_type,amount,original_event_id,status,error_code,balance_after,request_hash,metadata
    ) values (
      p_integration_id,v_provider_session.id,v_provider_session.user_id,v_provider_session.game_session_id,trim(p_external_event_id),v_event_type,v_amount,nullif(trim(coalesce(p_original_event_id,'')),''),'REJECTED',v_error,v_balance,trim(p_request_hash),coalesce(p_metadata,'{}'::jsonb)
    ) returning id into v_event;
    return query select v_event,'REJECTED'::text,v_event_type,v_amount,v_balance,false,v_error;
    return;
  end if;

  if v_event_type in ('BET','WIN','REFUND') then
    v_external_tx := 'b2b:' || v_integration.slug || ':' || trim(p_external_event_id);
    insert into public.wallet_transactions(wallet_id,user_id,type,amount,external_transaction_id,reference_type,reference_id,description,metadata)
    values(
      v_wallet,
      v_provider_session.user_id,
      v_event_type,
      case when v_event_type='BET' then -v_amount else v_amount end,
      v_external_tx,
      'B2B_SESSION',
      v_provider_session.game_session_id,
      'B2B ' || v_event_type || ' • ' || v_integration.name,
      jsonb_build_object(
        'integration',v_integration.slug,
        'external_event_id',trim(p_external_event_id),
        'external_session_id',v_provider_session.external_session_id,
        'original_event_id',nullif(trim(coalesce(p_original_event_id,'')),'')
      ) || coalesce(p_metadata,'{}'::jsonb)
    );
    select coalesce(sum(amount),0)::numeric(18,2) into v_balance from public.wallet_transactions where wallet_id=v_wallet;
  end if;

  insert into public.b2b_events(
    integration_id,provider_session_id,user_id,game_session_id,external_event_id,event_type,amount,original_event_id,status,error_code,balance_after,request_hash,metadata
  ) values (
    p_integration_id,v_provider_session.id,v_provider_session.user_id,v_provider_session.game_session_id,trim(p_external_event_id),v_event_type,v_amount,nullif(trim(coalesce(p_original_event_id,'')),''),'APPLIED',null,v_balance,trim(p_request_hash),coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_event;

  update public.b2b_provider_sessions
  set metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('last_event_at',now(),'last_event_id',v_event,'last_event_type',v_event_type)
  where id=v_provider_session.id;

  update public.game_sessions
  set metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('b2b_last_event_at',now(),'b2b_last_event_id',v_event,'b2b_integration',v_integration.slug)
  where id=v_provider_session.game_session_id;

  insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
  values(
    v_provider_session.user_id,
    'PROVIDER',
    'B2B_' || v_event_type,
    'B2B_EVENT',
    v_event,
    jsonb_build_object('integration',v_integration.slug,'external_event_id',trim(p_external_event_id),'amount',v_amount,'balance_after',v_balance)
  );

  return query select v_event,'APPLIED'::text,v_event_type,v_amount,v_balance,false,null::text;
end;
$function$;

revoke all on function public.process_b2b_wallet_event(uuid,text,text,text,text,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.process_b2b_wallet_event(uuid,text,text,text,text,numeric,text,text,jsonb) to service_role;

comment on table public.b2b_integrations is 'Generic B2B adapter registry. Secrets are never stored in this table.';
comment on table public.b2b_events is 'Idempotent DEMO wallet events received through authorized B2B adapters.';
comment on function public.process_b2b_wallet_event(uuid,text,text,text,text,numeric,text,text,jsonb) is 'Service-role-only settlement for signed B2B sandbox callbacks.';
