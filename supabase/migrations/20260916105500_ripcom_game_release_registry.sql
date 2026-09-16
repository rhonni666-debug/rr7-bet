create table if not exists public.ripcom_game_releases (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  version text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','SANDBOX','RELEASED','RETIRED')),
  manifest jsonb not null default '{}'::jsonb,
  notes text,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, version),
  constraint ripcom_game_releases_manifest_object check (jsonb_typeof(manifest) = 'object')
);

create index if not exists idx_ripcom_game_releases_game_status
on public.ripcom_game_releases(game_id, status, created_at desc);

alter table public.ripcom_game_releases enable row level security;

drop policy if exists ripcom_game_releases_admin_select on public.ripcom_game_releases;
create policy ripcom_game_releases_admin_select on public.ripcom_game_releases
for select to authenticated
using ((select public.is_admin()));

drop policy if exists ripcom_game_releases_admin_insert on public.ripcom_game_releases;
create policy ripcom_game_releases_admin_insert on public.ripcom_game_releases
for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists ripcom_game_releases_admin_update on public.ripcom_game_releases;
create policy ripcom_game_releases_admin_update on public.ripcom_game_releases
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_game_releases_admin_delete on public.ripcom_game_releases;
create policy ripcom_game_releases_admin_delete on public.ripcom_game_releases
for delete to authenticated
using ((select public.is_admin()));

insert into public.ripcom_game_releases(game_id,version,status,manifest,notes,released_at)
select g.id,'1.0.0','SANDBOX',
  jsonb_build_object(
    'schema','ripcom.game-manifest/v1',
    'provider','RIPCOM',
    'game_code',g.external_game_id,
    'slug',g.slug,
    'name',g.name,
    'mode','DEMO',
    'launch_type',g.launch_type,
    'runtime','ripcom-b2b',
    'player_route','/ripcom/play/:sessionToken',
    'currency','DEMO',
    'api_version','v1',
    'features',jsonb_build_array('session-launch','server-side-rng','idempotent-rounds','demo-wallet','audit-trail')
  ),
  'Primeira release formal do Eclipse Serpent para homologação sandbox RIPCOM B2B.',
  now()
from public.games g
join public.providers p on p.id=g.provider_id
where p.slug='ripcom' and g.slug='eclipse-serpent'
on conflict(game_id,version) do update set
  status=excluded.status,
  manifest=excluded.manifest,
  notes=excluded.notes,
  released_at=coalesce(public.ripcom_game_releases.released_at, excluded.released_at),
  updated_at=now();
