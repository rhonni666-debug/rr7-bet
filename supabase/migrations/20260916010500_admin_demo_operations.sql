create or replace function public.admin_adjust_demo_wallet(p_user_id uuid, p_amount numeric, p_reason text)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_wallet uuid;
  v_balance numeric;
  v_new_balance numeric;
  v_tx uuid := gen_random_uuid();
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000 then raise exception 'INVALID_ADJUSTMENT'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 or length(trim(p_reason)) > 200 then raise exception 'INVALID_REASON'; end if;

  select id into v_wallet from public.wallets where user_id=p_user_id and currency='DEMO';
  if v_wallet is null then raise exception 'WALLET_NOT_FOUND'; end if;

  select coalesce(sum(amount),0) into v_balance from public.wallet_transactions where wallet_id=v_wallet;
  v_new_balance := v_balance+p_amount;
  if v_new_balance < 0 then raise exception 'NEGATIVE_BALANCE_NOT_ALLOWED'; end if;

  insert into public.wallet_transactions(wallet_id,user_id,type,amount,external_transaction_id,reference_type,reference_id,description,metadata)
  values(v_wallet,p_user_id,'ADMIN_ADJUSTMENT',p_amount,'admin-adjust:'||v_tx::text,'ADMIN',v_actor,'Ajuste administrativo DEMO',jsonb_build_object('actor_id',v_actor,'reason',trim(p_reason),'previous_balance',v_balance,'new_balance',v_new_balance));

  insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
  values(v_actor,'ADMIN','ADMIN_WALLET_ADJUSTMENT','WALLET',v_wallet,jsonb_build_object('target_user_id',p_user_id,'amount',p_amount,'reason',trim(p_reason),'previous_balance',v_balance,'new_balance',v_new_balance));

  return v_new_balance;
end;
$$;

create or replace function public.admin_close_game_session(p_session_id uuid,p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_target_user uuid;
  v_closed boolean := false;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 or length(trim(p_reason)) > 200 then raise exception 'INVALID_REASON'; end if;

  update public.game_sessions
     set status='FINISHED',ended_at=coalesce(ended_at,now()),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('admin_closed_by',v_actor,'admin_close_reason',trim(p_reason),'admin_closed_at',now())
   where id=p_session_id and status in ('CREATED','ACTIVE')
  returning user_id,true into v_target_user,v_closed;

  if coalesce(v_closed,false) then
    insert into public.audit_logs(user_id,actor_role,action,resource_type,resource_id,metadata)
    values(v_actor,'ADMIN','ADMIN_SESSION_CLOSED','GAME_SESSION',p_session_id,jsonb_build_object('target_user_id',v_target_user,'reason',trim(p_reason)));
  end if;

  return coalesce(v_closed,false);
end;
$$;

revoke all on function public.admin_adjust_demo_wallet(uuid,numeric,text) from public,anon;
revoke all on function public.admin_close_game_session(uuid,text) from public,anon;
grant execute on function public.admin_adjust_demo_wallet(uuid,numeric,text) to authenticated;
grant execute on function public.admin_close_game_session(uuid,text) to authenticated;
