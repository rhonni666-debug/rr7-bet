insert into public.providers (name, slug, short_name, logo_url, accent, status, provider_type, sort_order)
values ('RIPCOM', 'ripcom', 'RIPCOM', null, 'from-violet-950 via-fuchsia-900 to-cyan-500', 'ACTIVE', 'REAL', 1)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  accent = excluded.accent,
  status = 'ACTIVE',
  provider_type = 'REAL',
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.games (
  provider_id, category_id, name, slug, description, art, accent, status,
  featured, popular, new_game, is_demo, launch_type, external_game_id, sort_order
)
select p.id, c.id,
       'Eclipse Serpent',
       'eclipse-serpent',
       'Primeiro slot autoral da RIPCOM. Experiência DEMO com símbolo escolhido, Wild central, respins e identidade visual própria.',
       '◈',
       'from-slate-950 via-violet-950 to-cyan-900',
       'ACTIVE', true, true, true, true, 'PROVIDER_SESSION', 'ripcom-slot:eclipse-serpent', 10
from public.providers p
join public.game_categories c on c.slug = 'slots'
where p.slug = 'ripcom'
on conflict (slug) do update set
  provider_id = excluded.provider_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  art = excluded.art,
  accent = excluded.accent,
  status = 'ACTIVE',
  featured = true,
  popular = true,
  new_game = true,
  is_demo = true,
  launch_type = 'PROVIDER_SESSION',
  external_game_id = 'ripcom-slot:eclipse-serpent',
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.slot_game_configs(game_id, layout, symbols, feature, theme, active, version)
select g.id,
       '[3,4,3]'::jsonb,
       '[{"id":"shard","icon":"◆","label":"Fragmento","weight":26,"pay":0.14},{"id":"moon","icon":"☾","label":"Lua Eclipse","weight":21,"pay":0.22},{"id":"rune","icon":"✦","label":"Runa","weight":17,"pay":0.34},{"id":"core","icon":"◉","label":"Núcleo","weight":12,"pay":0.60},{"id":"serpent","icon":"🐍","label":"Serpente Eclipse","weight":8,"pay":1.25},{"id":"scatter","icon":"✺","label":"Portal","weight":5,"pay":0,"scatter":true},{"id":"wild","icon":"♛","label":"Wild","weight":4,"pay":2.30,"wild":true}]'::jsonb,
       '{"kind":"SNAKE_WILD","maxRespins":2,"respinChance":0.52,"maxMultiplier":140}'::jsonb,
       '{"title":"Eclipse Serpent","primary":"#67e8f9","secondary":"#7c3aed","background":"#050816","glow":"#22d3ee"}'::jsonb,
       true, 1
from public.games g
where g.slug = 'eclipse-serpent'
on conflict (game_id) do update set
  layout = excluded.layout,
  symbols = excluded.symbols,
  feature = excluded.feature,
  theme = excluded.theme,
  active = true,
  version = public.slot_game_configs.version + 1,
  updated_at = now();

create or replace function public.create_demo_game_session(p_game_id uuid)
returns table(session_id uuid, session_token uuid, status text, expires_at timestamptz, launch_url text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_provider uuid;
  v_launch_type text;
  v_provider_type text;
  v_provider_slug text;
  v_session uuid;
  v_token uuid;
  v_expires timestamptz;
  v_role text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select g.provider_id, g.launch_type, p.provider_type, p.slug
    into v_provider, v_launch_type, v_provider_type, v_provider_slug
  from public.games g join public.providers p on p.id = g.provider_id
  where g.id = p_game_id and g.status = 'ACTIVE' and g.is_demo = true and p.status = 'ACTIVE';
  if v_provider is null then raise exception 'GAME_UNAVAILABLE'; end if;

  update public.game_sessions set status='EXPIRED', ended_at=coalesce(ended_at,now())
   where user_id=v_user and status in ('CREATED','ACTIVE') and expires_at is not null and expires_at <= now();

  select id, game_sessions.session_token, game_sessions.expires_at
    into v_session, v_token, v_expires
  from public.game_sessions
  where user_id=v_user and game_id=p_game_id and status='ACTIVE'
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  if v_session is null then
    update public.game_sessions set status='FINISHED', ended_at=now()
     where user_id=v_user and status in ('CREATED','ACTIVE');
    v_expires := now() + interval '2 hours';
    insert into public.game_sessions(user_id,game_id,provider_id,status,expires_at,metadata)
    values(v_user,p_game_id,v_provider,'ACTIVE',v_expires,
      jsonb_build_object(
        'adapter', case
          when v_provider_slug='ripcom' and v_provider_type='REAL' then 'RipcomProviderAdapter'
          when v_provider_type='MOCK' then 'MockProviderAdapter'
          else 'UnsupportedProviderAdapter'
        end,
        'provider_type',v_provider_type,
        'provider_slug',v_provider_slug,
        'launch_type',v_launch_type,
        'demo',true
      ))
    returning id, game_sessions.session_token into v_session, v_token;

    insert into public.recent_games(user_id,game_id,last_played_at,play_count)
    values(v_user,p_game_id,now(),1)
    on conflict(user_id,game_id) do update set last_played_at=excluded.last_played_at, play_count=public.recent_games.play_count+1;

    select role into v_role from public.profiles where id=v_user;
    insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
    values(v_user,coalesce(v_role,'PLAYER'),'GAME_SESSION_CREATED','GAME_SESSION',v_session,jsonb_build_object('game_id',p_game_id,'provider_id',v_provider,'provider_slug',v_provider_slug));
  end if;

  return query select v_session,v_token,'ACTIVE'::text,v_expires,null::text;
end;
$$;
