revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.get_my_demo_balance() from anon;
revoke execute on function public.play_demo_round(uuid,numeric,uuid) from anon;
revoke execute on function public.mark_recent_game(text) from anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_my_demo_balance() to authenticated;
grant execute on function public.play_demo_round(uuid,numeric,uuid) to authenticated;
grant execute on function public.mark_recent_game(text) to authenticated;
