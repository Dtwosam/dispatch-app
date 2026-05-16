create table if not exists public.dispatch_state_snapshots (
  store_key text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.dispatch_state_snapshots is
  'Serialized Dispatch router state snapshots for Supabase Postgres-backed persistence.';
