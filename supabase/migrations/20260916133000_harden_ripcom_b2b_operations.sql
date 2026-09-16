alter table public.ripcom_operators
  add column if not exists api_version text not null default 'v1',
  add column if not exists wallet_mode text not null default 'DEMO',
  add column if not exists callback_url text,
  add column if not exists max_requests_per_minute integer not null default 120,
  add column if not exists max_sessions_per_minute integer not null default 30,
  add column if not exists revoked_at timestamptz,
  add column if not exists last_key_rotation_at timestamptz;

do $$ begin
  alter table public.ripcom_operators add constraint ripcom_operators_api_version_check check (api_version = 'v1');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ripcom_operators add constraint ripcom_operators_wallet_mode_check check (wallet_mode in ('DEMO','EXTERNAL_CALLBACK'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ripcom_operators add constraint ripcom_operators_callback_url_check check (callback_url is null or callback_url ~ '^https://');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ripcom_operators add constraint ripcom_operators_max_requests_check check (max_requests_per_minute between 1 and 6000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ripcom_operators add constraint ripcom_operators_max_sessions_check check (max_sessions_per_minute between 1 and 600);
exception when duplicate_object then null; end $$;

alter table public.ripcom_api_requests
  add column if not exists success boolean,
  add column if not exists latency_ms numeric,
  add column if not exists error_code text;

create index if not exists idx_ripcom_api_requests_operator_time on public.ripcom_api_requests(operator_id, created_at desc);
create index if not exists idx_ripcom_b2b_sessions_game on public.ripcom_b2b_sessions(game_id);
create index if not exists idx_ripcom_b2b_sessions_operator_time on public.ripcom_b2b_sessions(operator_id, created_at desc);

drop policy if exists ripcom_operators_admin_all on public.ripcom_operators;
create policy ripcom_operators_admin_all on public.ripcom_operators
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_operator_games_admin_all on public.ripcom_operator_games;
create policy ripcom_operator_games_admin_all on public.ripcom_operator_games
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_api_requests_admin_read on public.ripcom_api_requests;
create policy ripcom_api_requests_admin_read on public.ripcom_api_requests
for select to authenticated
using ((select public.is_admin()));

drop policy if exists ripcom_b2b_sessions_admin_read on public.ripcom_b2b_sessions;
create policy ripcom_b2b_sessions_admin_read on public.ripcom_b2b_sessions
for select to authenticated
using ((select public.is_admin()));

drop policy if exists ripcom_b2b_sessions_admin_update on public.ripcom_b2b_sessions;
create policy ripcom_b2b_sessions_admin_update on public.ripcom_b2b_sessions
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_b2b_rounds_admin_read on public.ripcom_b2b_rounds;
create policy ripcom_b2b_rounds_admin_read on public.ripcom_b2b_rounds
for select to authenticated
using ((select public.is_admin()));
