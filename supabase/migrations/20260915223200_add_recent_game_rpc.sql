create or replace function public.mark_recent_game(p_game_slug text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_game uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select id into v_game
  from public.games
  where slug = p_game_slug and status = 'ACTIVE';

  if v_game is null then raise exception 'GAME_UNAVAILABLE'; end if;

  insert into public.recent_games (user_id, game_id, last_played_at, play_count)
  values (v_user, v_game, now(), 1)
  on conflict (user_id, game_id) do update
    set last_played_at = excluded.last_played_at,
        play_count = public.recent_games.play_count + 1;

  insert into public.audit_logs (user_id, actor_role, action, resource_type, resource_id)
  values (v_user, 'PLAYER', 'GAME_OPEN', 'GAME', v_game);
end;
$$;

revoke all on function public.mark_recent_game(text) from public;
grant execute on function public.mark_recent_game(text) to authenticated;
