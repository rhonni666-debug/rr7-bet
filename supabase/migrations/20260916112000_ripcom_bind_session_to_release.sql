create or replace function public.ripcom_bind_session_release()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_release uuid;
  v_release_game uuid;
begin
  if new.game_release_id is not null then
    select game_id into v_release_game
    from public.ripcom_game_releases
    where id = new.game_release_id;

    if v_release_game is null or v_release_game <> new.game_id then
      raise exception 'RIPCOM_RELEASE_GAME_MISMATCH';
    end if;
    return new;
  end if;

  select og.release_id into v_release
  from public.ripcom_operator_games og
  where og.operator_id = new.operator_id
    and og.game_id = new.game_id
    and og.enabled = true;

  if v_release is null then
    raise exception 'RIPCOM_RELEASE_NOT_ASSIGNED';
  end if;

  new.game_release_id := v_release;
  return new;
end;
$$;

revoke all on function public.ripcom_bind_session_release() from public, anon, authenticated;

drop trigger if exists ripcom_b2b_sessions_bind_release on public.ripcom_b2b_sessions;
create trigger ripcom_b2b_sessions_bind_release
before insert on public.ripcom_b2b_sessions
for each row execute function public.ripcom_bind_session_release();

update public.ripcom_b2b_sessions s
set game_release_id = og.release_id,
    updated_at = now()
from public.ripcom_operator_games og
where s.game_release_id is null
  and og.operator_id = s.operator_id
  and og.game_id = s.game_id
  and og.enabled = true
  and og.release_id is not null;
