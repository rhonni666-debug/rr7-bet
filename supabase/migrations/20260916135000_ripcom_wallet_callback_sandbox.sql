create table if not exists public.ripcom_wallet_callback_events (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.ripcom_operators(id) on delete cascade,
  event_id uuid not null default gen_random_uuid(),
  event_type text not null check (event_type in ('BALANCE','BET','WIN','REFUND','PING')),
  callback_url text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_status integer,
  response_body text,
  latency_ms integer,
  success boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists ripcom_wallet_callback_events_event_id_key on public.ripcom_wallet_callback_events(event_id);
create index if not exists idx_ripcom_wallet_callbacks_operator_time on public.ripcom_wallet_callback_events(operator_id, created_at desc);

alter table public.ripcom_wallet_callback_events enable row level security;

drop policy if exists ripcom_wallet_callbacks_admin_select on public.ripcom_wallet_callback_events;
create policy ripcom_wallet_callbacks_admin_select on public.ripcom_wallet_callback_events
for select to authenticated using ((select public.is_admin()));

revoke all on public.ripcom_wallet_callback_events from anon;
grant select on public.ripcom_wallet_callback_events to authenticated;
