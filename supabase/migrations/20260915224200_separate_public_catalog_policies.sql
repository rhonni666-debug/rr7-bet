drop policy if exists providers_read on public.providers;
create policy providers_read_anon on public.providers for select to anon using (status = 'ACTIVE');
create policy providers_read_authenticated on public.providers for select to authenticated using (status = 'ACTIVE' or (select public.is_admin()));

drop policy if exists categories_read on public.game_categories;
create policy categories_read_anon on public.game_categories for select to anon using (active = true);
create policy categories_read_authenticated on public.game_categories for select to authenticated using (active = true or (select public.is_admin()));

drop policy if exists games_read on public.games;
create policy games_read_anon on public.games for select to anon using (status = 'ACTIVE');
create policy games_read_authenticated on public.games for select to authenticated using (status = 'ACTIVE' or (select public.is_admin()));

drop policy if exists banners_read on public.banners;
create policy banners_read_anon on public.banners for select to anon using (active = true);
create policy banners_read_authenticated on public.banners for select to authenticated using (active = true or (select public.is_admin()));

drop policy if exists promotions_read on public.promotions;
create policy promotions_read_anon on public.promotions for select to anon using (active = true);
create policy promotions_read_authenticated on public.promotions for select to authenticated using (active = true or (select public.is_admin()));
