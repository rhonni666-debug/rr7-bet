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
  v_session uuid;
  v_token uuid;
  v_expires timestamptz;
  v_role text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select g.provider_id,g.launch_type,p.provider_type
    into v_provider,v_launch_type,v_provider_type
  from public.games g join public.providers p on p.id=g.provider_id
  where g.id=p_game_id and g.status='ACTIVE' and g.is_demo=true and p.status='ACTIVE';
  if v_provider is null then raise exception 'GAME_UNAVAILABLE'; end if;

  update public.game_sessions set status='EXPIRED',ended_at=coalesce(ended_at,now())
   where user_id=v_user and status in ('CREATED','ACTIVE') and expires_at is not null and expires_at<=now();

  select id,game_sessions.session_token,game_sessions.expires_at
    into v_session,v_token,v_expires
  from public.game_sessions
  where user_id=v_user and game_id=p_game_id and status='ACTIVE' and (expires_at is null or expires_at>now())
  order by started_at desc limit 1;

  if v_session is null then
    update public.game_sessions set status='FINISHED',ended_at=now()
     where user_id=v_user and status in ('CREATED','ACTIVE');
    v_expires := now()+interval '2 hours';
    insert into public.game_sessions(user_id,game_id,provider_id,status,expires_at,metadata)
    values(v_user,p_game_id,v_provider,'ACTIVE',v_expires,
      jsonb_build_object('adapter',case when v_provider_type='MOCK' then 'MockProviderAdapter' else 'UnsupportedProviderAdapter' end,'provider_type',v_provider_type,'launch_type',v_launch_type,'demo',true))
    returning id,game_sessions.session_token into v_session,v_token;

    insert into public.recent_games(user_id,game_id,last_played_at,play_count)
    values(v_user,p_game_id,now(),1)
    on conflict(user_id,game_id) do update set last_played_at=excluded.last_played_at,play_count=public.recent_games.play_count+1;

    select role into v_role from public.profiles where id=v_user;
    insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
    values(v_user,coalesce(v_role,'PLAYER'),'GAME_SESSION_CREATED','GAME_SESSION',v_session,jsonb_build_object('game_id',p_game_id,'provider_id',v_provider));
  end if;

  return query select v_session,v_token,'ACTIVE'::text,v_expires,null::text;
end;
$$;