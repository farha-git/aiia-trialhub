create table public.study_members (
  id uuid primary key default gen_random_uuid(),
  study_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (study_id, user_id)
);

alter table public.study_members enable row level security;

create or replace function public.can_access_study(required_study_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role() = 'ADMIN'
    or public.get_my_role() = 'DATA_MANAGER'
    or exists (
      select 1 from public.study_members
      where study_id = required_study_id and user_id = (select auth.uid())
    );
$$;

create policy study_members_read_self_or_admin
on public.study_members for select to authenticated
using (user_id = (select auth.uid()) or public.has_role('ADMIN'));

create policy study_members_manage_admin
on public.study_members for all to authenticated
using (public.has_role('ADMIN'))
with check (public.has_role('ADMIN'));

alter table public.studies enable row level security;

create policy studies_read_authorized
on public.studies for select to authenticated
using (public.can_access_study(study_code));

create policy studies_insert_admin_or_pi
on public.studies for insert to authenticated
with check (public.has_role('ADMIN') or public.has_role('PI'));

create policy studies_update_authorized
on public.studies for update to authenticated
using (public.get_my_role() = 'ADMIN' or (public.get_my_role() = 'PI' and public.can_access_study(study_code)))
with check (public.get_my_role() = 'ADMIN' or (public.get_my_role() = 'PI' and public.can_access_study(study_code)));
