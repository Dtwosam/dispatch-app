create table if not exists public.dispatch_state_snapshots (
  store_key text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.dispatch_state_snapshots is
  'Serialized Dispatch router state snapshots for Supabase Postgres-backed persistence.';

alter table public.dispatch_state_snapshots enable row level security;

revoke all on table public.dispatch_state_snapshots from anon;
revoke all on table public.dispatch_state_snapshots from authenticated;
