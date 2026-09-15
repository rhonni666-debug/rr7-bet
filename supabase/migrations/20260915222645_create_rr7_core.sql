create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'PLAYER' check (role in ('PLAYER','ADMIN','SUPPORT','MANAGER','AFFILIATE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text not null,
  logo_url text,
  accent text not null default 'from-amber-400 to-yellow-600',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','MAINTENANCE')),
  provider_type text not null default 'MOCK' check (provider_type in ('MOCK','REAL','AGGREGATOR')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'Gamepad2',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete restrict,
  category_id uuid not null references public.game_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  thumbnail_url text,
  banner_url text,
  description text,
  art text not null default '🎮',
  accent text not null default 'from-slate-700 to-slate-900',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','MAINTENANCE')),
  featured boolean not null default false,
  popular boolean not null default false,
  new_game boolean not null default false,
  is_demo boolean not null default true,
  launch_type text not null default 'MOCK' check (launch_type in ('MOCK','IFRAME','REDIRECT','PROVIDER_SESSION')),
  external_game_id text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  mobile_image_url text,
  cta_label text,
  cta_target text,
  position text not null default 'HOME_HERO',
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  type text not null default 'DEMO',
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create table public.recent_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  last_played_at timestamptz not null default now(),
  play_count integer not null default 1 check (play_count >= 1),
  unique (user_id, game_id)
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'DEMO' check (currency = 'DEMO'),
  created_at timestamptz not null default now(),
  unique (user_id, currency)
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('INITIAL_BONUS','BET','WIN','REFUND','PROMO_BONUS','ADMIN_ADJUSTMENT')),
  amount numeric(18,2) not null check (amount <> 0),
  external_transaction_id text not null unique,
  reference_type text,
  reference_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  provider_id uuid not null references public.providers(id) on delete restrict,
  session_token uuid not null default gen_random_uuid() unique,
  status text not null default 'CREATED' check (status in ('CREATED','ACTIVE','FINISHED','EXPIRED','ERROR')),
  launch_url text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.demo_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  request_id uuid not null,
  bet_amount numeric(18,2) not null check (bet_amount > 0),
  win_amount numeric(18,2) not null default 0 check (win_amount >= 0),
  result text not null check (result in ('WIN','LOSS','PUSH')),
  multiplier numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_games_provider on public.games(provider_id);
create index idx_games_category on public.games(category_id);
create index idx_wallet_tx_user_time on public.wallet_transactions(user_id, created_at desc);
create index idx_recent_user_time on public.recent_games(user_id, last_played_at desc);
create index idx_rounds_user_time on public.demo_rounds(user_id, created_at desc);

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_providers_updated before update on public.providers for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.game_categories for each row execute function public.set_updated_at();
create trigger trg_games_updated before update on public.games for each row execute function public.set_updated_at();
create trigger trg_banners_updated before update on public.banners for each row execute function public.set_updated_at();
create trigger trg_promotions_updated before update on public.promotions for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ADMIN','MANAGER')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;

  insert into public.wallets (user_id, currency)
  values (new.id, 'DEMO')
  on conflict (user_id, currency) do update set currency = excluded.currency
  returning id into v_wallet_id;

  insert into public.wallet_transactions (
    wallet_id, user_id, type, amount, external_transaction_id, description, metadata
  ) values (
    v_wallet_id, new.id, 'INITIAL_BONUS', 10000, 'initial:' || new.id::text,
    'Créditos iniciais DEMO', jsonb_build_object('source','signup')
  ) on conflict (external_transaction_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_my_demo_balance()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount),0)::numeric
  from public.wallet_transactions
  where user_id = auth.uid();
$$;

revoke all on function public.get_my_demo_balance() from public;
grant execute on function public.get_my_demo_balance() to authenticated;

create or replace function public.play_demo_round(p_game_id uuid, p_bet numeric, p_request_id uuid)
returns table(round_id uuid, bet_amount numeric, win_amount numeric, result text, new_balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_wallet uuid;
  v_balance numeric;
  v_multiplier numeric;
  v_win numeric;
  v_round uuid;
  v_result text;
  v_existing public.demo_rounds%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_bet is null or p_bet <= 0 then raise exception 'INVALID_BET'; end if;

  select * into v_existing from public.demo_rounds where user_id = v_user and request_id = p_request_id;
  if found then
    select public.get_my_demo_balance() into v_balance;
    return query select v_existing.id, v_existing.bet_amount, v_existing.win_amount, v_existing.result, v_balance;
    return;
  end if;

  if not exists (select 1 from public.games where id = p_game_id and status = 'ACTIVE' and is_demo = true) then
    raise exception 'GAME_UNAVAILABLE';
  end if;

  select id into v_wallet from public.wallets where user_id = v_user and currency = 'DEMO';
  if v_wallet is null then raise exception 'WALLET_NOT_FOUND'; end if;

  select public.get_my_demo_balance() into v_balance;
  if p_bet > v_balance then raise exception 'INSUFFICIENT_DEMO_CREDITS'; end if;

  v_multiplier := case
    when random() > 0.94 then 5
    when random() > 0.78 then 2
    when random() > 0.62 then 1
    else 0
  end;
  v_win := round((p_bet * v_multiplier)::numeric, 2);
  v_result := case when v_win > p_bet then 'WIN' when v_win = p_bet then 'PUSH' else 'LOSS' end;

  insert into public.wallet_transactions (wallet_id, user_id, type, amount, external_transaction_id, reference_type, reference_id, description, metadata)
  values (v_wallet, v_user, 'BET', -p_bet, 'bet:' || p_request_id::text, 'GAME', p_game_id, 'Rodada DEMO', jsonb_build_object('request_id', p_request_id));

  if v_win > 0 then
    insert into public.wallet_transactions (wallet_id, user_id, type, amount, external_transaction_id, reference_type, reference_id, description, metadata)
    values (v_wallet, v_user, 'WIN', v_win, 'win:' || p_request_id::text, 'GAME', p_game_id, 'Resultado DEMO', jsonb_build_object('request_id', p_request_id, 'multiplier', v_multiplier));
  end if;

  insert into public.demo_rounds (user_id, game_id, request_id, bet_amount, win_amount, result, multiplier)
  values (v_user, p_game_id, p_request_id, p_bet, v_win, v_result, v_multiplier)
  returning id into v_round;

  insert into public.recent_games (user_id, game_id, last_played_at, play_count)
  values (v_user, p_game_id, now(), 1)
  on conflict (user_id, game_id) do update
    set last_played_at = excluded.last_played_at,
        play_count = public.recent_games.play_count + 1;

  insert into public.audit_logs (user_id, actor_role, action, resource_type, resource_id, metadata)
  values (v_user, 'PLAYER', 'DEMO_ROUND', 'GAME', p_game_id, jsonb_build_object('request_id', p_request_id));

  select public.get_my_demo_balance() into v_balance;
  return query select v_round, p_bet, v_win, v_result, v_balance;
end;
$$;

revoke all on function public.play_demo_round(uuid,numeric,uuid) from public;
grant execute on function public.play_demo_round(uuid,numeric,uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.game_categories enable row level security;
alter table public.games enable row level security;
alter table public.banners enable row level security;
alter table public.promotions enable row level security;
alter table public.favorites enable row level security;
alter table public.recent_games enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.demo_rounds enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy providers_read on public.providers for select to anon, authenticated using (status = 'ACTIVE' or public.is_admin());
create policy providers_admin on public.providers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_read on public.game_categories for select to anon, authenticated using (active = true or public.is_admin());
create policy categories_admin on public.game_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy games_read on public.games for select to anon, authenticated using (status = 'ACTIVE' or public.is_admin());
create policy games_admin on public.games for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy banners_read on public.banners for select to anon, authenticated using (active = true or public.is_admin());
create policy banners_admin on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy promotions_read on public.promotions for select to anon, authenticated using (active = true or public.is_admin());
create policy promotions_admin on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy favorites_own on public.favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recent_own on public.recent_games for select to authenticated using (user_id = auth.uid());
create policy wallets_own on public.wallets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy wallet_tx_own on public.wallet_transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy sessions_own_read on public.game_sessions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy rounds_own_read on public.demo_rounds for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

revoke all on public.profiles, public.wallets, public.wallet_transactions, public.demo_rounds, public.audit_logs from anon;
grant select on public.providers, public.game_categories, public.games, public.banners, public.promotions to anon;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.providers, public.game_categories, public.games, public.banners, public.promotions to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.recent_games, public.wallets, public.wallet_transactions, public.game_sessions, public.demo_rounds, public.audit_logs to authenticated;

insert into public.providers (name, slug, short_name, accent, provider_type, sort_order) values
('PG Demo','pg-demo','PG','from-fuchsia-600 to-purple-950','MOCK',1),
('Pragmatic Demo','pragmatic-demo','PP','from-emerald-500 to-teal-950','MOCK',2),
('Evolution Demo','evolution-demo','EVO','from-blue-500 to-indigo-950','MOCK',3),
('TaDa Demo','tada-demo','TD','from-orange-500 to-red-950','MOCK',4),
('RR7 Originals','rr7-originals','RR7','from-amber-300 to-yellow-700','MOCK',5)
on conflict (slug) do nothing;

insert into public.game_categories (name, slug, icon, sort_order) values
('Todos','todos','LayoutGrid',0),('Slots','slots','Sparkles',1),('Crash','crash','Rocket',2),('Cassino','cassino','Dices',3),('Ao Vivo','ao-vivo','Radio',4),('Poker','poker','Spade',5),('Arcade','arcade','Gamepad2',6),('Novos','novos','BadgePlus',7)
on conflict (slug) do nothing;

insert into public.games (provider_id, category_id, name, slug, art, accent, featured, popular, new_game, sort_order)
select p.id, c.id, x.name, x.slug, x.art, x.accent, x.featured, x.popular, x.new_game, x.sort_order
from (values
('Lucky Panda','lucky-panda','🐼','from-fuchsia-600 to-purple-950',true,true,false,1,'pg-demo','slots'),
('Dragon Coins','dragon-coins','🐉','from-red-600 to-amber-700',true,true,false,2,'pg-demo','slots'),
('Golden Jungle','golden-jungle','🦁','from-amber-500 to-emerald-900',true,true,false,3,'pragmatic-demo','slots'),
('Neon Fruits','neon-fruits','🍒','from-pink-500 to-violet-950',false,false,true,4,'pragmatic-demo','slots'),
('Royal Crown','royal-crown','👑','from-yellow-400 to-red-900',false,true,false,5,'evolution-demo','cassino'),
('Ocean Treasure','ocean-treasure','🐙','from-cyan-500 to-blue-950',false,false,true,6,'tada-demo','slots'),
('Pirate Gold','pirate-gold','🏴‍☠️','from-amber-600 to-slate-950',false,true,false,7,'rr7-originals','arcade'),
('Magic Temple','magic-temple','🏯','from-violet-500 to-indigo-950',false,false,false,8,'rr7-originals','slots'),
('Lucky Wild','lucky-wild','🍀','from-emerald-500 to-green-950',false,true,false,9,'pg-demo','slots'),
('Super Fortune','super-fortune','💰','from-yellow-400 to-orange-950',false,true,true,10,'pragmatic-demo','slots'),
('Diamond Rush','diamond-rush','💎','from-sky-400 to-indigo-950',false,false,true,11,'tada-demo','crash'),
('Fire Spin','fire-spin','🔥','from-orange-500 to-rose-950',false,true,false,12,'rr7-originals','arcade')
) as x(name,slug,art,accent,featured,popular,new_game,sort_order,provider_slug,category_slug)
join public.providers p on p.slug = x.provider_slug
join public.game_categories c on c.slug = x.category_slug
on conflict (slug) do nothing;

insert into public.banners (title, subtitle, cta_label, cta_target, sort_order) values
('RR7.BET DEMO','Explore o laboratório de jogos sem dinheiro real','Explorar jogos','/jogos',1),
('10.000 créditos DEMO','Toda nova conta começa com créditos fictícios','Criar conta','/auth',2),
('Arquitetura preparada','Provider Adapter pronto para integrações B2B futuras','Conhecer','/perfil',3);

insert into public.promotions (title, description, type) values
('Bônus de boas-vindas DEMO','10.000 créditos fictícios ao criar uma conta.','WELCOME_DEMO'),
('Missão diária DEMO','Experimente jogos diferentes no laboratório.','MISSION_DEMO'),
('Ranking semanal DEMO','Estrutura demonstrativa para rankings futuros.','RANKING_DEMO'),
('Créditos extras DEMO','Promoção fictícia para testar regras de produto.','CREDITS_DEMO');
