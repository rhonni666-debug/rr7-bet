drop policy if exists ripcom_operators_admin_all on public.ripcom_operators;
create policy ripcom_operators_admin_all on public.ripcom_operators
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_operator_games_admin_all on public.ripcom_operator_games;
create policy ripcom_operator_games_admin_all on public.ripcom_operator_games
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_api_requests_admin_read on public.ripcom_api_requests;
create policy ripcom_api_requests_admin_read on public.ripcom_api_requests
for select to authenticated
using ((select public.is_admin()));

drop policy if exists ripcom_b2b_sessions_admin_read on public.ripcom_b2b_sessions;
create policy ripcom_b2b_sessions_admin_read on public.ripcom_b2b_sessions
for select to authenticated
using ((select public.is_admin()));

drop policy if exists ripcom_b2b_rounds_admin_read on public.ripcom_b2b_rounds;
create policy ripcom_b2b_rounds_admin_read on public.ripcom_b2b_rounds
for select to authenticated
using ((select public.is_admin()));
