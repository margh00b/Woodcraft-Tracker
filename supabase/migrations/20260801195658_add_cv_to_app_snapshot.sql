-- Create the local_data table for agent execution payloads
create table if not exists public.local_data (
  id uuid default gen_random_uuid() primary key,
  machine_name text unique not null,
  payload jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.local_data enable row level security;

-- Create an open prototype policy allowing anonymous read/write access
create policy "Allow anonymous read/write access on local_data"
  on public.local_data
  for all
  using (true)
  with check (true);

-- Enable Supabase Realtime for database changes on local_data
alter publication supabase_realtime add table public.local_data;