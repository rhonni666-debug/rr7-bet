alter table public.demo_rounds
  add column if not exists session_id uuid references public.game_sessions(id) on delete set null;

create index if not exists idx_demo_rounds_session on public.demo_rounds(session_id);

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
  v_expires timestamptz := now() + interval '2 hours';
  v_role text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select g.provider_id, g.launch_type, p.provider_type
    into v_provider, v_launch_type, v_provider_type
  from public.games g
  join public.providers p on p.id = g.provider_id
  where g.id = p_game_id and g.status = 'ACTIVE' and g.is_demo = true and p.status = 'ACTIVE';

  if v_provider is null then raise exception 'GAME_UNAVAILABLE'; end if;

  update public.game_sessions
     set status = 'EXPIRED', ended_at = coalesce(ended_at, now())
   where user_id = v_user and status in ('CREATED','ACTIVE') and expires_at is not null and expires_at <= now();

  update public.game_sessions
     set status = 'FINISHED', ended_at = now()
   where user_id = v_user and game_id = p_game_id and status in ('CREATED','ACTIVE');

  insert into public.game_sessions(user_id,game_id,provider_id,status,expires_at,metadata)
  values(v_user,p_game_id,v_provider,'ACTIVE',v_expires,
    jsonb_build_object('adapter',case when v_provider_type='MOCK' then 'MockProviderAdapter' else 'UnsupportedProviderAdapter' end,'provider_type',v_provider_type,'launch_type',v_launch_type,'demo',true))
  returning id, game_sessions.session_token into v_session, v_token;

  insert into public.recent_games(user_id,game_id,last_played_at,play_count)
  values(v_user,p_game_id,now(),1)
  on conflict(user_id,game_id) do update
    set last_played_at=excluded.last_played_at, play_count=public.recent_games.play_count+1;

  select role into v_role from public.profiles where id=v_user;
  insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
  values(v_user,coalesce(v_role,'PLAYER'),'GAME_SESSION_CREATED','GAME_SESSION',v_session,jsonb_build_object('game_id',p_game_id,'provider_id',v_provider));

  return query select v_session,v_token,'ACTIVE'::text,v_expires,null::text;
end;
$$;

create or replace function public.close_demo_game_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_closed boolean := false;
  v_role text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.game_sessions
     set status='FINISHED', ended_at=now()
   where id=p_session_id and user_id=v_user and status in ('CREATED','ACTIVE')
  returning true into v_closed;

  if coalesce(v_closed,false) then
    select role into v_role from public.profiles where id=v_user;
    insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
    values(v_user,coalesce(v_role,'PLAYER'),'GAME_SESSION_CLOSED','GAME_SESSION',p_session_id,'{}'::jsonb);
  end if;

  return coalesce(v_closed,false);
end;
$$;

create or replace function public.play_demo_round_v2(p_session_id uuid,p_bet numeric,p_request_id uuid)
returns table(round_id uuid,bet_amount numeric,win_amount numeric,result text,multiplier numeric,new_balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_wallet uuid;
  v_balance numeric;
  v_game uuid;
  v_game_name text;
  v_status text;
  v_expires timestamptz;
  v_roll double precision;
  v_multiplier numeric;
  v_win numeric;
  v_round uuid;
  v_result text;
  v_existing public.demo_rounds%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_bet is null or not (p_bet = any(array[1,2,5,10,20,50,100]::numeric[])) then raise exception 'INVALID_BET'; end if;

  select * into v_existing from public.demo_rounds where user_id=v_user and request_id=p_request_id;
  if found then
    select public.get_my_demo_balance() into v_balance;
    return query select v_existing.id,v_existing.bet_amount,v_existing.win_amount,v_existing.result,v_existing.multiplier,v_balance;
    return;
  end if;

  select gs.game_id,gs.status,gs.expires_at,g.name
    into v_game,v_status,v_expires,v_game_name
  from public.game_sessions gs join public.games g on g.id=gs.game_id
  where gs.id=p_session_id and gs.user_id=v_user
  for update of gs;

  if v_game is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_status <> 'ACTIVE' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if v_expires is not null and v_expires <= now() then
    update public.game_sessions set status='EXPIRED',ended_at=now() where id=p_session_id;
    raise exception 'SESSION_EXPIRED';
  end if;
  if not exists(select 1 from public.games where id=v_game and status='ACTIVE' and is_demo=true) then raise exception 'GAME_UNAVAILABLE'; end if;

  select id into v_wallet from public.wallets where user_id=v_user and currency='DEMO';
  if v_wallet is null then raise exception 'WALLET_NOT_FOUND'; end if;
  select public.get_my_demo_balance() into v_balance;
  if p_bet > v_balance then raise exception 'INSUFFICIENT_DEMO_CREDITS'; end if;

  v_roll := random();
  v_multiplier := case when v_roll>0.94 then 5 when v_roll>0.78 then 2 when v_roll>0.62 then 1 else 0 end;
  v_win := round((p_bet*v_multiplier)::numeric,2);
  v_result := case when v_win>p_bet then 'WIN' when v_win=p_bet then 'PUSH' else 'LOSS' end;

  insert into public.wallet_transactions(wallet_id,user_id,type,amount,external_transaction_id,reference_type,reference_id,description,metadata)
  values(v_wallet,v_user,'BET',-p_bet,'bet:'||p_request_id::text,'GAME_SESSION',p_session_id,'Rodada DEMO • '||coalesce(v_game_name,'Jogo'),jsonb_build_object('request_id',p_request_id,'game_id',v_game,'session_id',p_session_id));

  if v_win>0 then
    insert into public.wallet_transactions(wallet_id,user_id,type,amount,external_transaction_id,reference_type,reference_id,description,metadata)
    values(v_wallet,v_user,'WIN',v_win,'win:'||p_request_id::text,'GAME_SESSION',p_session_id,'Resultado DEMO • '||coalesce(v_game_name,'Jogo'),jsonb_build_object('request_id',p_request_id,'game_id',v_game,'session_id',p_session_id,'multiplier',v_multiplier));
  end if;

  insert into public.demo_rounds(user_id,game_id,session_id,request_id,bet_amount,win_amount,result,multiplier)
  values(v_user,v_game,p_session_id,p_request_id,p_bet,v_win,v_result,v_multiplier)
  returning id into v_round;

  update public.game_sessions set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_round_at',now(),'last_round_id',v_round) where id=p_session_id;
  insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
  values(v_user,'PLAYER','DEMO_ROUND_V2','GAME_SESSION',p_session_id,jsonb_build_object('round_id',v_round,'game_id',v_game,'request_id',p_request_id));

  select public.get_my_demo_balance() into v_balance;
  return query select v_round,p_bet,v_win,v_result,v_multiplier,v_balance;
end;
$$;

revoke all on function public.create_demo_game_session(uuid) from public,anon;
revoke all on function public.close_demo_game_session(uuid) from public,anon;
revoke all on function public.play_demo_round_v2(uuid,numeric,uuid) from public,anon;
grant execute on function public.create_demo_game_session(uuid) to authenticated;
grant execute on function public.close_demo_game_session(uuid) to authenticated;
grant execute on function public.play_demo_round_v2(uuid,numeric,uuid) to authenticated;