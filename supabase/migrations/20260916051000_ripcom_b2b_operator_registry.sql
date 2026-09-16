create table if not exists public.ripcom_operators (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  environment text not null default 'SANDBOX' check (environment in ('SANDBOX','PRODUCTION')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','PENDING')),
  public_key_pem text,
  allowed_origins jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ripcom_operators_origins_array check (jsonb_typeof(allowed_origins) = 'array')
);

create table if not exists public.ripcom_operator_games (
  operator_id uuid not null references public.ripcom_operators(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (operator_id, game_id)
);

create index if not exists idx_ripcom_operator_games_game on public.ripcom_operator_games(game_id) where enabled = true;

alter table public.ripcom_operators enable row level security;
alter table public.ripcom_operator_games enable row level security;

insert into public.ripcom_operators(code,name,environment,status,metadata)
values ('rr7','RR7','SANDBOX','ACTIVE','{"integration":"internal","auth":"supabase_jwt","role":"first_operator"}'::jsonb)
on conflict(code) do update set
  name=excluded.name,
  environment='SANDBOX',
  status='ACTIVE',
  metadata=public.ripcom_operators.metadata || excluded.metadata,
  updated_at=now();

insert into public.ripcom_operator_games(operator_id,game_id,enabled)
select o.id,g.id,true
from public.ripcom_operators o
join public.providers p on p.slug='ripcom'
join public.games g on g.provider_id=p.id and g.status='ACTIVE'
where o.code='rr7'
on conflict(operator_id,game_id) do update set enabled=true,updated_at=now();
