create table if not exists public.operator_real_money_settings (
  id smallint primary key default 1 check (id = 1),
  production_state text not null default 'DISABLED' check (production_state in ('DISABLED','COMPLIANCE_PENDING','PSP_SANDBOX','READY_FOR_AUTHORIZED_PRODUCTION','PRODUCTION_ENABLED')),
  currency text not null default 'BRL' check (currency = 'BRL'),
  deposits_enabled boolean not null default false,
  withdrawals_enabled boolean not null default false,
  real_money_games_enabled boolean not null default false,
  legal_entity_verified boolean not null default false,
  regulatory_authorization_verified boolean not null default false,
  regulatory_reference text,
  psp_provider text,
  psp_merchant_reference text,
  settlement_account_reference text,
  same_ownership_required boolean not null default true,
  kyc_required boolean not null default true,
  min_deposit numeric not null default 1 check (min_deposit > 0),
  max_deposit numeric not null default 50000 check (max_deposit >= min_deposit),
  min_withdrawal numeric not null default 1 check (min_withdrawal > 0),
  max_withdrawal numeric not null default 50000 check (max_withdrawal >= min_withdrawal),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operator_real_money_activation_guard check (
    production_state <> 'PRODUCTION_ENABLED' or (
      deposits_enabled and withdrawals_enabled and real_money_games_enabled and legal_entity_verified and regulatory_authorization_verified and psp_provider is not null and psp_merchant_reference is not null and settlement_account_reference is not null
    )
  )
);

insert into public.operator_real_money_settings(id) values (1) on conflict (id) do nothing;

create table if not exists public.real_money_kyc_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'UNVERIFIED' check (status in ('UNVERIFIED','PENDING','VERIFIED','REJECTED','EXPIRED')),
  provider text,
  provider_reference text,
  age_verified boolean not null default false,
  account_owner_verified boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.real_wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'LOCKED' check (status in ('LOCKED','PENDING_KYC','ACTIVE','SUSPENDED','CLOSED')),
  available_balance numeric(18,2) not null default 0 check (available_balance >= 0),
  reserved_balance numeric(18,2) not null default 0 check (reserved_balance >= 0),
  lifetime_deposited numeric(18,2) not null default 0 check (lifetime_deposited >= 0),
  lifetime_withdrawn numeric(18,2) not null default 0 check (lifetime_withdrawn >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.real_payment_intents (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.real_wallet_accounts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('DEPOSIT','WITHDRAWAL')),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'CREATED' check (status in ('CREATED','REQUIRES_KYC','PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED','REVERSED')),
  psp_provider text,
  merchant_reference text,
  psp_payment_reference text,
  source_owner_verified boolean,
  destination_owner_verified boolean,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_real_payment_intents_user_time on public.real_payment_intents(user_id, created_at desc);
create index if not exists idx_real_payment_intents_status on public.real_payment_intents(status, created_at desc);

create table if not exists public.real_wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.real_wallet_accounts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_intent_id uuid references public.real_payment_intents(id) on delete set null,
  entry_type text not null check (entry_type in ('DEPOSIT','WITHDRAWAL','BET','WIN','REFUND','CHARGEBACK','REVERSAL','ADJUSTMENT')),
  direction text not null check (direction in ('CREDIT','DEBIT')),
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'POSTED' check (status in ('PENDING','POSTED','REVERSED','FAILED')),
  balance_after numeric(18,2) not null check (balance_after >= 0),
  reserved_after numeric(18,2) not null default 0 check (reserved_after >= 0),
  external_reference text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_real_wallet_ledger_wallet_time on public.real_wallet_ledger_entries(wallet_id, created_at desc);
create index if not exists idx_real_wallet_ledger_user_time on public.real_wallet_ledger_entries(user_id, created_at desc);

alter table public.operator_real_money_settings enable row level security;
alter table public.real_money_kyc_checks enable row level security;
alter table public.real_wallet_accounts enable row level security;
alter table public.real_payment_intents enable row level security;
alter table public.real_wallet_ledger_entries enable row level security;

drop policy if exists operator_real_money_settings_admin_select on public.operator_real_money_settings;
create policy operator_real_money_settings_admin_select on public.operator_real_money_settings for select to authenticated using ((select public.is_admin()));
drop policy if exists operator_real_money_settings_admin_update on public.operator_real_money_settings;
create policy operator_real_money_settings_admin_update on public.operator_real_money_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists real_money_kyc_owner_select on public.real_money_kyc_checks;
create policy real_money_kyc_owner_select on public.real_money_kyc_checks for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists real_wallet_accounts_owner_select on public.real_wallet_accounts;
create policy real_wallet_accounts_owner_select on public.real_wallet_accounts for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists real_payment_intents_owner_select on public.real_payment_intents;
create policy real_payment_intents_owner_select on public.real_payment_intents for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists real_wallet_ledger_owner_select on public.real_wallet_ledger_entries;
create policy real_wallet_ledger_owner_select on public.real_wallet_ledger_entries for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.real_money_kyc_checks from anon, authenticated;
revoke insert, update, delete on public.real_wallet_accounts from anon, authenticated;
revoke insert, update, delete on public.real_payment_intents from anon, authenticated;
revoke insert, update, delete on public.real_wallet_ledger_entries from anon, authenticated;
revoke all on public.operator_real_money_settings from anon;

grant select on public.real_money_kyc_checks, public.real_wallet_accounts, public.real_payment_intents, public.real_wallet_ledger_entries to authenticated;
grant select, update on public.operator_real_money_settings to authenticated;

create or replace function public.real_money_readiness()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'production_state', s.production_state,
    'currency', s.currency,
    'deposits_enabled', s.deposits_enabled,
    'withdrawals_enabled', s.withdrawals_enabled,
    'real_money_games_enabled', s.real_money_games_enabled,
    'legal_entity_verified', s.legal_entity_verified,
    'regulatory_authorization_verified', s.regulatory_authorization_verified,
    'psp_configured', (s.psp_provider is not null and s.psp_merchant_reference is not null),
    'settlement_account_configured', (s.settlement_account_reference is not null),
    'same_ownership_required', s.same_ownership_required,
    'kyc_required', s.kyc_required,
    'ready_for_production', (
      s.production_state = 'PRODUCTION_ENABLED'
      and s.deposits_enabled and s.withdrawals_enabled and s.real_money_games_enabled
      and s.legal_entity_verified and s.regulatory_authorization_verified
      and s.psp_provider is not null and s.psp_merchant_reference is not null
      and s.settlement_account_reference is not null
    )
  )
  from public.operator_real_money_settings s where s.id = 1;
$$;

revoke all on function public.real_money_readiness() from public, anon, authenticated;
grant execute on function public.real_money_readiness() to service_role;
