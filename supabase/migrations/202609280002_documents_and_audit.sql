-- Prototype-grade persistence for controlled documents and append-only audit events.
-- These policies require real authentication and must be reviewed before production use.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  study_id text not null,
  title text not null,
  version integer not null default 1 check (version > 0),
  status text not null check (status in ('Draft', 'In review', 'Approved', 'Superseded')),
  owner text not null,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  study_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb,
  prev_hash text,
  hash text,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.audit_events enable row level security;

create policy documents_authenticated_read
on public.documents for select to authenticated
using (true);

create policy audit_events_authenticated_read
on public.audit_events for select to authenticated
using (true);

create policy audit_events_authenticated_insert
on public.audit_events for insert to authenticated
with check (user_id = (select auth.uid()));
