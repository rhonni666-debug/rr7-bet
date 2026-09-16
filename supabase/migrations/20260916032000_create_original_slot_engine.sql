create table if not exists public.slot_game_configs (
  game_id uuid primary key references public.games(id) on delete cascade,
  layout jsonb not null,
  symbols jsonb not null,
  feature jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_game_configs_layout_array check (jsonb_typeof(layout) = 'array'),
  constraint slot_game_configs_symbols_array check (jsonb_typeof(symbols) = 'array')
);

create table if not exists public.slot_round_details (
  round_id uuid primary key references public.demo_rounds(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  grid jsonb not null,
  feature jsonb not null default '{}'::jsonb,
  total_win numeric not null default 0 check (total_win >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_slot_round_details_user_time on public.slot_round_details(user_id, created_at desc);
create index if not exists idx_slot_round_details_session on public.slot_round_details(session_id, created_at desc);

alter table public.slot_game_configs enable row level security;
alter table public.slot_round_details enable row level security;

drop policy if exists slot_configs_public_read on public.slot_game_configs;
create policy slot_configs_public_read on public.slot_game_configs
for select to anon
using (
  active and exists (
    select 1 from public.games g
    join public.providers p on p.id = g.provider_id
    join public.game_categories c on c.id = g.category_id
    where g.id = slot_game_configs.game_id
      and g.status = 'ACTIVE' and g.is_demo = true
      and p.status = 'ACTIVE' and c.active = true
  )
);

drop policy if exists slot_configs_authenticated_read on public.slot_game_configs;
create policy slot_configs_authenticated_read on public.slot_game_configs
for select to authenticated
using (
  (active and exists (
    select 1 from public.games g
    join public.providers p on p.id = g.provider_id
    join public.game_categories c on c.id = g.category_id
    where g.id = slot_game_configs.game_id
      and g.status = 'ACTIVE' and g.is_demo = true
      and p.status = 'ACTIVE' and c.active = true
  )) or (select public.is_admin())
);

drop policy if exists slot_configs_admin_insert on public.slot_game_configs;
create policy slot_configs_admin_insert on public.slot_game_configs for insert to authenticated with check ((select public.is_admin()));
drop policy if exists slot_configs_admin_update on public.slot_game_configs;
create policy slot_configs_admin_update on public.slot_game_configs for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists slot_configs_admin_delete on public.slot_game_configs;
create policy slot_configs_admin_delete on public.slot_game_configs for delete to authenticated using ((select public.is_admin()));

drop policy if exists slot_round_details_own_read on public.slot_round_details;
create policy slot_round_details_own_read on public.slot_round_details
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop trigger if exists slot_game_configs_updated_at on public.slot_game_configs;
create trigger slot_game_configs_updated_at before update on public.slot_game_configs
for each row execute function public.set_updated_at();

insert into public.games (
  provider_id, category_id, name, slug, description, art, accent, status,
  featured, popular, new_game, is_demo, launch_type, external_game_id, sort_order
)
select p.id, c.id, v.name, v.slug, v.description, v.art, v.accent, 'ACTIVE',
       v.featured, v.popular, true, true, 'MOCK', 'rr7-slot:' || v.slug, v.sort_order
from public.providers p
cross join public.game_categories c
cross join (values
  ('Tiger Gold','tiger-gold','Slot 3x3 original com respin surpresa e multiplicadores progressivos.','🐯','from-red-950 via-orange-800 to-amber-500',true,true,20),
  ('Dragon Riches','dragon-riches','Slot 3x3 original com multiplicadores de dragão e rodada bônus agregada.','🐉','from-rose-950 via-red-800 to-yellow-500',true,true,21),
  ('Rabbit Riches','rabbit-riches','Slot 3-4-3 original com símbolos de prêmio e bônus de oito giros.','🐇','from-fuchsia-950 via-pink-800 to-amber-300',true,true,22),
  ('Ox Gold','ox-gold','Slot 3-4-3 original com sequência de respins até três tentativas.','🐂','from-amber-950 via-orange-800 to-yellow-400',true,true,23),
  ('Jade Snake','jade-snake','Slot 3-4-3 original com símbolo escolhido, Wild central e respins.','🐍','from-emerald-950 via-green-800 to-lime-400',true,true,24)
) as v(name,slug,description,art,accent,featured,popular,sort_order)
where p.slug = 'rr7-originals' and c.slug = 'slots'
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  art = excluded.art,
  accent = excluded.accent,
  status = 'ACTIVE',
  featured = excluded.featured,
  popular = excluded.popular,
  new_game = true,
  is_demo = true,
  launch_type = 'MOCK',
  external_game_id = excluded.external_game_id,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.slot_game_configs(game_id, layout, symbols, feature, theme, active, version)
select g.id,
       '[3,3,3]'::jsonb,
       '[{"id":"coin","icon":"🪙","label":"Moeda","weight":26,"pay":0.18},{"id":"packet","icon":"🧧","label":"Envelope","weight":20,"pay":0.25},{"id":"lantern","icon":"🏮","label":"Lanterna","weight":17,"pay":0.40},{"id":"gem","icon":"💎","label":"Gema","weight":12,"pay":0.70},{"id":"tiger","icon":"🐯","label":"Tigre","weight":8,"pay":1.40},{"id":"scatter","icon":"✨","label":"Bônus","weight":5,"pay":0,"scatter":true},{"id":"wild","icon":"🏆","label":"Wild","weight":4,"pay":2.50,"wild":true}]'::jsonb,
       '{"kind":"TIGER_RESPIN","triggerChance":0.25,"multipliers":[2,2,3,5],"maxMultiplier":100}'::jsonb,
       '{"title":"Tiger Gold","primary":"#fbbf24","secondary":"#dc2626","background":"#2a0904","glow":"#f59e0b"}'::jsonb,
       true,1
from public.games g where g.slug='tiger-gold'
on conflict(game_id) do update set layout=excluded.layout,symbols=excluded.symbols,feature=excluded.feature,theme=excluded.theme,active=true,version=slot_game_configs.version+1,updated_at=now();

insert into public.slot_game_configs(game_id, layout, symbols, feature, theme, active, version)
select g.id,'[3,3,3]'::jsonb,
       '[{"id":"coin","icon":"🪙","label":"Moeda","weight":25,"pay":0.17},{"id":"fan","icon":"🪭","label":"Leque","weight":20,"pay":0.24},{"id":"lantern","icon":"🏮","label":"Lanterna","weight":16,"pay":0.38},{"id":"jade","icon":"🟢","label":"Jade","weight":12,"pay":0.65},{"id":"dragon","icon":"🐉","label":"Dragão","weight":8,"pay":1.35},{"id":"scatter","icon":"🎆","label":"Bônus","weight":5,"pay":0,"scatter":true},{"id":"wild","icon":"👑","label":"Wild","weight":4,"pay":2.40,"wild":true}]'::jsonb,
       '{"kind":"DRAGON_MULTIPLIER","triggerChance":0.22,"multipliers":[2,3,5,10],"bonusScatter":3,"bonusSpins":8,"maxMultiplier":150}'::jsonb,
       '{"title":"Dragon Riches","primary":"#fde047","secondary":"#be123c","background":"#2b0711","glow":"#f97316"}'::jsonb,true,1
from public.games g where g.slug='dragon-riches'
on conflict(game_id) do update set layout=excluded.layout,symbols=excluded.symbols,feature=excluded.feature,theme=excluded.theme,active=true,version=slot_game_configs.version+1,updated_at=now();

insert into public.slot_game_configs(game_id, layout, symbols, feature, theme, active, version)
select g.id,'[3,4,3]'::jsonb,
       '[{"id":"carrot","icon":"🥕","label":"Cenoura","weight":25,"pay":0.13},{"id":"moon","icon":"🌙","label":"Lua","weight":20,"pay":0.20},{"id":"blossom","icon":"🌸","label":"Flor","weight":17,"pay":0.30},{"id":"ingot","icon":"🧈","label":"Ouro","weight":12,"pay":0.52},{"id":"rabbit","icon":"🐇","label":"Coelho","weight":8,"pay":1.05},{"id":"scatter","icon":"🎁","label":"Prêmio","weight":5,"pay":0,"scatter":true},{"id":"wild","icon":"⭐","label":"Wild","weight":4,"pay":2.00,"wild":true}]'::jsonb,
       '{"kind":"RABBIT_BONUS","triggerChance":0.08,"bonusScatter":3,"bonusSpins":8,"maxMultiplier":120}'::jsonb,
       '{"title":"Rabbit Riches","primary":"#f9a8d4","secondary":"#f59e0b","background":"#2c071f","glow":"#fb7185"}'::jsonb,true,1
from public.games g where g.slug='rabbit-riches'
on conflict(game_id) do update set layout=excluded.layout,symbols=excluded.symbols,feature=excluded.feature,theme=excluded.theme,active=true,version=slot_game_configs.version+1,updated_at=now();

insert into public.slot_game_configs(game_id, layout, symbols, feature, theme, active, version)
select g.id,'[3,4,3]'::jsonb,
       '[{"id":"coin","icon":"🪙","label":"Moeda","weight":26,"pay":0.13},{"id":"bamboo","icon":"🎋","label":"Bambu","weight":20,"pay":0.20},{"id":"bell","icon":"🔔","label":"Sino","weight":17,"pay":0.30},{"id":"ingot","icon":"🏅","label":"Ouro","weight":12,"pay":0.54},{"id":"ox","icon":"🐂","label":"Boi","weight":8,"pay":1.08},{"id":"scatter","icon":"🔥","label":"Bônus","weight":5,"pay":0,"scatter":true},{"id":"wild","icon":"💰","label":"Wild","weight":4,"pay":2.10,"wild":true}]'::jsonb,
       '{"kind":"OX_RESPIN","maxRespins":3,"fullScreenMultiplier":10,"maxMultiplier":100}'::jsonb,
       '{"title":"Ox Gold","primary":"#facc15","secondary":"#ea580c","background":"#301407","glow":"#f97316"}'::jsonb,true,1
from public.games g where g.slug='ox-gold'
on conflict(game_id) do update set layout=excluded.layout,symbols=excluded.symbols,feature=excluded.feature,theme=excluded.theme,active=true,version=slot_game_configs.version+1,updated_at=now();

insert into public.slot_game_configs(game_id, layout, symbols, feature, theme, active, version)
select g.id,'[3,4,3]'::jsonb,
       '[{"id":"jade","icon":"🟢","label":"Jade","weight":25,"pay":0.13},{"id":"lotus","icon":"🪷","label":"Lótus","weight":20,"pay":0.20},{"id":"coin","icon":"🪙","label":"Moeda","weight":17,"pay":0.31},{"id":"charm","icon":"🧿","label":"Amuleto","weight":12,"pay":0.55},{"id":"snake","icon":"🐍","label":"Serpente","weight":8,"pay":1.10},{"id":"scatter","icon":"💚","label":"Bônus","weight":5,"pay":0,"scatter":true},{"id":"wild","icon":"🍀","label":"Wild","weight":4,"pay":2.10,"wild":true}]'::jsonb,
       '{"kind":"SNAKE_WILD","maxRespins":2,"respinChance":0.50,"maxMultiplier":120}'::jsonb,
       '{"title":"Jade Snake","primary":"#a3e635","secondary":"#059669","background":"#06291d","glow":"#22c55e"}'::jsonb,true,1
from public.games g where g.slug='jade-snake'
on conflict(game_id) do update set layout=excluded.layout,symbols=excluded.symbols,feature=excluded.feature,theme=excluded.theme,active=true,version=slot_game_configs.version+1,updated_at=now();

create or replace function public.settle_slot_round(
  p_user_id uuid, p_session_id uuid, p_bet numeric, p_win numeric,
  p_request_id uuid, p_multiplier numeric, p_grid jsonb, p_feature jsonb
)
returns table(round_id uuid, bet_amount numeric, win_amount numeric, result text, multiplier numeric, new_balance numeric)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_wallet uuid; v_balance numeric; v_game uuid; v_game_name text;
  v_status text; v_expires timestamptz; v_round uuid; v_result text;
  v_existing public.demo_rounds%rowtype;
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_bet is null or not (p_bet = any(array[1,2,5,10,20,50,100]::numeric[])) then raise exception 'INVALID_BET'; end if;
  if p_win is null or p_win < 0 or p_win > p_bet * 250 then raise exception 'INVALID_WIN'; end if;
  if p_multiplier is null or p_multiplier < 0 or p_multiplier > 250 then raise exception 'INVALID_MULTIPLIER'; end if;
  if p_grid is null or jsonb_typeof(p_grid) <> 'array' then raise exception 'INVALID_GRID'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_existing from public.demo_rounds where user_id=p_user_id and request_id=p_request_id;
  if found then
    select coalesce(sum(amount),0) into v_balance from public.wallet_transactions where user_id=p_user_id;
    return query select v_existing.id,v_existing.bet_amount,v_existing.win_amount,v_existing.result,v_existing.multiplier,v_balance;
    return;
  end if;

  if (select count(*) from public.demo_rounds where user_id=p_user_id and created_at > now()-interval '1 minute') >= 60 then raise exception 'RATE_LIMIT'; end if;

  select gs.game_id,gs.status,gs.expires_at,g.name into v_game,v_status,v_expires,v_game_name
  from public.game_sessions gs join public.games g on g.id=gs.game_id
  join public.slot_game_configs sc on sc.game_id=g.id and sc.active=true
  where gs.id=p_session_id and gs.user_id=p_user_id for update of gs;

  if v_game is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_status <> 'ACTIVE' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if v_expires is not null and v_expires <= now() then
    update public.game_sessions set status='EXPIRED',ended_at=now() where id=p_session_id;
    raise exception 'SESSION_EXPIRED';
  end if;

  select id into v_wallet from public.wallets where user_id=p_user_id and currency='DEMO';
  if v_wallet is null then raise exception 'WALLET_NOT_FOUND'; end if;
  select coalesce(sum(amount),0) into v_balance from public.wallet_transactions where user_id=p_user_id;
  if p_bet > v_balance then raise exception 'INSUFFICIENT_DEMO_CREDITS'; end if;

  insert into public.wallet_transactions(wallet_id,user_id,type,amount,external_transaction_id,reference_type,reference_id,description,metadata)
  values(v_wallet,p_user_id,'BET',-p_bet,'slot-bet:'||p_request_id::text,'GAME_SESSION',p_session_id,'Slot DEMO • '||coalesce(v_game_name,'Jogo'),jsonb_build_object('request_id',p_request_id,'game_id',v_game,'session_id',p_session_id));
  if p_win>0 then
    insert into public.wallet_transactions(wallet_id,user_id,type,amount,external_transaction_id,reference_type,reference_id,description,metadata)
    values(v_wallet,p_user_id,'WIN',round(p_win,2),'slot-win:'||p_request_id::text,'GAME_SESSION',p_session_id,'Resultado slot DEMO • '||coalesce(v_game_name,'Jogo'),jsonb_build_object('request_id',p_request_id,'game_id',v_game,'session_id',p_session_id,'multiplier',p_multiplier));
  end if;

  v_result := case when p_win>p_bet then 'WIN' when p_win=p_bet then 'PUSH' else 'LOSS' end;
  insert into public.demo_rounds(user_id,game_id,session_id,request_id,bet_amount,win_amount,result,multiplier)
  values(p_user_id,v_game,p_session_id,p_request_id,p_bet,round(p_win,2),v_result,round(p_multiplier,4)) returning id into v_round;
  insert into public.slot_round_details(round_id,session_id,user_id,grid,feature,total_win)
  values(v_round,p_session_id,p_user_id,p_grid,coalesce(p_feature,'{}'::jsonb),round(p_win,2));
  update public.game_sessions set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_round_at',now(),'last_round_id',v_round,'slot_engine',true) where id=p_session_id;
  insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
  values(p_user_id,'PLAYER','SLOT_ROUND','GAME_SESSION',p_session_id,jsonb_build_object('round_id',v_round,'game_id',v_game,'request_id',p_request_id,'multiplier',p_multiplier));
  select coalesce(sum(amount),0) into v_balance from public.wallet_transactions where user_id=p_user_id;
  return query select v_round,p_bet,round(p_win,2),v_result,round(p_multiplier,4),v_balance;
end;
$$;

revoke all on function public.settle_slot_round(uuid,uuid,numeric,numeric,uuid,numeric,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.settle_slot_round(uuid,uuid,numeric,numeric,uuid,numeric,jsonb,jsonb) to service_role;
