create table if not exists public.ripcom_company_profile (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trade_name text default 'RIPCOM',
  tax_id text,
  country_code text not null default 'BR',
  business_email text,
  business_phone text,
  website_url text,
  contract_contact_name text,
  contract_contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ripcom_company_profile_country_code check (char_length(country_code)=2)
);

alter table public.ripcom_company_profile enable row level security;

drop policy if exists ripcom_company_profile_admin_select on public.ripcom_company_profile;
create policy ripcom_company_profile_admin_select on public.ripcom_company_profile
for select to authenticated
using ((select public.is_admin()));

drop policy if exists ripcom_company_profile_admin_insert on public.ripcom_company_profile;
create policy ripcom_company_profile_admin_insert on public.ripcom_company_profile
for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists ripcom_company_profile_admin_update on public.ripcom_company_profile;
create policy ripcom_company_profile_admin_update on public.ripcom_company_profile
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists ripcom_company_profile_admin_delete on public.ripcom_company_profile;
create policy ripcom_company_profile_admin_delete on public.ripcom_company_profile
for delete to authenticated
using ((select public.is_admin()));

insert into public.ripcom_company_profile(trade_name,country_code,notes)
select 'RIPCOM','BR','Perfil empresarial privado. Preencher dados reais somente pelo painel administrativo.'
where not exists (select 1 from public.ripcom_company_profile);
