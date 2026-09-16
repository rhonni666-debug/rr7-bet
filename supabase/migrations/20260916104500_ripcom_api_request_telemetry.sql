alter table public.ripcom_api_requests
  add column if not exists duration_ms numeric,
  add column if not exists completed_at timestamptz;

create index if not exists idx_ripcom_api_requests_operator_created
  on public.ripcom_api_requests(operator_id, created_at desc);

create or replace function public.set_ripcom_api_request_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.response_status is not null and old.response_status is null then
    new.completed_at := coalesce(new.completed_at, now());
    new.duration_ms := greatest(0, extract(epoch from (new.completed_at - new.created_at)) * 1000);
  end if;
  return new;
end;
$$;

drop trigger if exists ripcom_api_requests_completion on public.ripcom_api_requests;
create trigger ripcom_api_requests_completion
before update of response_status on public.ripcom_api_requests
for each row execute function public.set_ripcom_api_request_completion();
