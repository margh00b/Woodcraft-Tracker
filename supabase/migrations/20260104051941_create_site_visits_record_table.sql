create table public.site_visits (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  job_id bigint references public.jobs(id) on delete set null,
  visit_date date not null,
  notes text,
  created_by text
);

alter table public.site_visits enable row level security;

create policy "Enable all access for authenticated users"
on public.site_visits
for all
to authenticated
using (true);