-- Candleflow Supabase schema
-- Run in the Supabase SQL editor (or via dashboard: Database -> SQL) before starting the server.
-- Tables: profiles, activities, contacts
--
-- NOTE: Postgres folds unquoted identifiers to lowercase, so the columns below are
-- stored as "passwordhash" and "sessionnonce" (not "passwordHash"/"sessionNonce").
-- The code in backend/services/store.js talks to those lowercase column names and
-- maps them to camelCase in application code. Do not quote/camelCase them here or
-- the backend will stop matching this table.

create table if not exists public.profiles (
  id uuid primary key,
  name text not null,
  email text not null unique,
  role text not null default 'Trader',
  created date not null,
  accounts jsonb not null default '{}'::jsonb,
  passwordhash text,
  sessionnonce text
);

alter table public.profiles enable row level security;

create table if not exists public.activities (
  id uuid primary key,
  type text not null,
  timestamp timestamptz not null default now(),
  user_id uuid,
  name text,
  email text,
  role text,
  detail text,
  amount numeric,
  mode text,
  ip text
);

create index if not exists activities_timestamp_idx on public.activities (timestamp desc);

alter table public.activities enable row level security;

create table if not exists public.contacts (
  id uuid primary key,
  name text not null,
  email text not null,
  message text not null,
  ip text,
  created timestamptz not null default now()
);

alter table public.contacts enable row level security;

-- The backend talks to PostgREST with the service-role key (bypasses RLS),
-- but expose safe read paths to authenticated app users if you add client keys:
-- create policy "profiles self select" on public.profiles
--  for select using (auth.uid() = id);