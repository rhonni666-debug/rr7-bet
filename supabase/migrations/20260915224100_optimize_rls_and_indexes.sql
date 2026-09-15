create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_demo_rounds_game on public.demo_rounds(game_id);
create index if not exists idx_favorites_game on public.favorites(game_id);
create index if not exists idx_game_sessions_game on public.game_sessions(game_id);
create index if not exists idx_game_sessions_provider on public.game_sessions(provider_id);
create index if not exists idx_game_sessions_user on public.game_sessions(user_id);
create index if not exists idx_recent_games_game on public.recent_games(game_id);
create index if not exists idx_wallet_transactions_wallet on public.wallet_transactions(wallet_id);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists recent_own on public.recent_games;
create policy recent_own on public.recent_games for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists wallets_own on public.wallets;
create policy wallets_own on public.wallets for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists wallet_tx_own on public.wallet_transactions;
create policy wallet_tx_own on public.wallet_transactions for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists sessions_own_read on public.game_sessions;
create policy sessions_own_read on public.game_sessions for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists rounds_own_read on public.demo_rounds;
create policy rounds_own_read on public.demo_rounds for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists providers_read on public.providers;
create policy providers_read on public.providers for select to anon, authenticated
using (status = 'ACTIVE' or (select public.is_admin()));
drop policy if exists providers_admin on public.providers;
create policy providers_admin_insert on public.providers for insert to authenticated with check ((select public.is_admin()));
create policy providers_admin_update on public.providers for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy providers_admin_delete on public.providers for delete to authenticated using ((select public.is_admin()));

drop policy if exists categories_read on public.game_categories;
create policy categories_read on public.game_categories for select to anon, authenticated
using (active = true or (select public.is_admin()));
drop policy if exists categories_admin on public.game_categories;
create policy categories_admin_insert on public.game_categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.game_categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.game_categories for delete to authenticated using ((select public.is_admin()));

drop policy if exists games_read on public.games;
create policy games_read on public.games for select to anon, authenticated
using (status = 'ACTIVE' or (select public.is_admin()));
drop policy if exists games_admin on public.games;
create policy games_admin_insert on public.games for insert to authenticated with check ((select public.is_admin()));
create policy games_admin_update on public.games for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy games_admin_delete on public.games for delete to authenticated using ((select public.is_admin()));

drop policy if exists banners_read on public.banners;
create policy banners_read on public.banners for select to anon, authenticated
using (active = true or (select public.is_admin()));
drop policy if exists banners_admin on public.banners;
create policy banners_admin_insert on public.banners for insert to authenticated with check ((select public.is_admin()));
create policy banners_admin_update on public.banners for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy banners_admin_delete on public.banners for delete to authenticated using ((select public.is_admin()));

drop policy if exists promotions_read on public.promotions;
create policy promotions_read on public.promotions for select to anon, authenticated
using (active = true or (select public.is_admin()));
drop policy if exists promotions_admin on public.promotions;
create policy promotions_admin_insert on public.promotions for insert to authenticated with check ((select public.is_admin()));
create policy promotions_admin_update on public.promotions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy promotions_admin_delete on public.promotions for delete to authenticated using ((select public.is_admin()));
