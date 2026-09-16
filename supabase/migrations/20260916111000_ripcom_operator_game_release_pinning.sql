alter table public.ripcom_operator_games
  add column if not exists release_id uuid references public.ripcom_game_releases(id) on delete set null;

alter table public.ripcom_b2b_sessions
  add column if not exists game_release_id uuid references public.ripcom_game_releases(id) on delete set null;

create index if not exists idx_ripcom_operator_games_release
on public.ripcom_operator_games(release_id);

create index if not exists idx_ripcom_b2b_sessions_release
on public.ripcom_b2b_sessions(game_release_id);

update public.ripcom_operator_games og
set release_id = r.id,
    updated_at = now()
from public.ripcom_game_releases r
where r.game_id = og.game_id
  and r.status in ('SANDBOX','RELEASED')
  and r.version = (
    select r2.version
    from public.ripcom_game_releases r2
    where r2.game_id=og.game_id and r2.status in ('SANDBOX','RELEASED')
    order by string_to_array(r2.version,'.')::int[] desc, r2.created_at desc
    limit 1
  )
  and og.release_id is null;
