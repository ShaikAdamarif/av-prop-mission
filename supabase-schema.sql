-- Run this in the Supabase SQL Editor once.
-- Creates a single key/value table, enables Realtime, and locks down access.

create table if not exists public.kv_store (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- Realtime: stream all changes on this table
alter publication supabase_realtime add table public.kv_store;

-- RLS: allow read for everyone (anon key) but block direct writes — writes
-- only happen through the Vercel API using the service-role key, which
-- bypasses RLS automatically.
alter table public.kv_store enable row level security;

drop policy if exists "kv read" on public.kv_store;
create policy "kv read" on public.kv_store for select using (true);

-- (No insert/update/delete policy on purpose — anon clients cannot write.)
