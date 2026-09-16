create table if not exists public.ripcom_api_requests (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.ripcom_operators(id) on delete cascade,
  request_id text not null,
  method text not null,
  path text not null,
  body_sha256 text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  unique(operator_id, request_id)
);

create index if not exists idx_ripcom_api_requests_created_at on public.ripcom_api_requests(created_at desc);

create table if not exists public.ripcom_b2b_sessions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.ripcom_operators(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  external_player_id text not null,
  session_token uuid not null unique default gen_random_uuid(),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED','EXPIRED')),
  currency text not null default 'DEMO' check (currency = 'DEMO'),
  demo_balance numeric not null default 10000 check (demo_balance >= 0),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ripcom_b2b_sessions_operator on public.ripcom_b2b_sessions(operator_id, created_at desc);
create index if not exists idx_ripcom_b2b_sessions_token on public.ripcom_b2b_sessions(session_token);

create table if not exists public.ripcom_b2b_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ripcom_b2b_sessions(id) on delete cascade,
  request_id text not null,
  bet numeric not null check (bet > 0),
  win numeric not null default 0 check (win >= 0),
  multiplier numeric not null default 0 check (multiplier >= 0),
  grid jsonb not null,
  feature jsonb not null default '{}'::jsonb,
  balance_after numeric not null check (balance_after >= 0),
  created_at timestamptz not null default now(),
  unique(session_id, request_id)
);

create index if not exists idx_ripcom_b2b_rounds_session on public.ripcom_b2b_rounds(session_id, created_at desc);

alter table public.ripcom_api_requests enable row level security;
alter table public.ripcom_b2b_sessions enable row level security;
alter table public.ripcom_b2b_rounds enable row level security;

create or replace function public.ripcom_settle_demo_spin(
  p_session_token uuid,
  p_request_id text,
  p_bet numeric,
  p_win numeric,
  p_multiplier numeric,
  p_grid jsonb,
  p_feature jsonb
)
returns table(round_id uuid, bet_amount numeric, win_amount numeric, multiplier numeric, balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.ripcom_b2b_sessions%rowtype;
  v_existing public.ripcom_b2b_rounds%rowtype;
  v_round uuid;
  v_balance numeric;
begin
  if p_request_id is null or length(trim(p_request_id)) < 8 then raise exception 'INVALID_REQUEST_ID'; end if;
  if p_bet is null or not (p_bet = any(array[1,2,5,10,20,50,100]::numeric[])) then raise exception 'INVALID_BET'; end if;
  if p_multiplier is null or p_multiplier < 0 or p_multiplier > 250 then raise exception 'INVALID_MULTIPLIER'; end if;
  if p_win is null or p_win < 0 or p_win > p_bet * 250 then raise exception 'INVALID_WIN'; end if;
  if p_grid is null or jsonb_typeof(p_grid) <> 'array' then raise exception 'INVALID_GRID'; end if;

  select * into v_session
  from public.ripcom_b2b_sessions
  where session_token = p_session_token
  for update;

  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'ACTIVE' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if v_session.expires_at <= now() then
    update public.ripcom_b2b_sessions set status='EXPIRED', updated_at=now() where id=v_session.id;
    raise exception 'SESSION_EXPIRED';
  end if;

  select * into v_existing
  from public.ripcom_b2b_rounds
  where session_id=v_session.id and request_id=p_request_id;

  if found then
    return query select v_existing.id, v_existing.bet, v_existing.win, v_existing.multiplier, v_existing.balance_after;
    return;
  end if;

  if v_session.demo_balance < p_bet then raise exception 'INSUFFICIENT_DEMO_CREDITS'; end if;
  v_balance := v_session.demo_balance - p_bet + p_win;

  update public.ripcom_b2b_sessions
  set demo_balance=v_balance, updated_at=now()
  where id=v_session.id;

  insert into public.ripcom_b2b_rounds(session_id,request_id,bet,win,multiplier,grid,feature,balance_after)
  values(v_session.id,p_request_id,p_bet,p_win,p_multiplier,p_grid,coalesce(p_feature,'{}'::jsonb),v_balance)
  returning id into v_round;

  return query select v_round,p_bet,p_win,p_multiplier,v_balance;
end;
$$;

revoke all on function public.ripcom_settle_demo_spin(uuid,text,numeric,numeric,numeric,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ripcom_settle_demo_spin(uuid,text,numeric,numeric,numeric,jsonb,jsonb) to service_role;
