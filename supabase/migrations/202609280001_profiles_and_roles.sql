-- Stage 1: profiles and the application role model.

create type public.app_role as enum (
  'ADMIN',
  'PI',
  'CRC',
  'SAFETY_OFFICER',
  'COMPLIANCE_OFFICER',
  'DATA_MANAGER'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role public.app_role not null default 'CRC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile and role for each authenticated user.';
comment on column public.profiles.role is 'Assigned by the database; public registration always defaults to CRC.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid());
$$;

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role() = required_role;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'CRC'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- A user can read their own profile. Admins can read all profiles without
-- querying profiles from a policy, which avoids recursive RLS evaluation.
alter table public.profiles enable row level security;

create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.has_role('ADMIN')
);

-- Users may update their own non-role profile fields. The trigger below blocks
-- changing a user's own role, while this policy lets admins update other users.
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy profiles_update_other_users_admin
on public.profiles
for update
to authenticated
using (public.has_role('ADMIN') and id <> (select auth.uid()))
with check (public.has_role('ADMIN') and id <> (select auth.uid()));

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (select auth.uid()) = old.id and new.role is distinct from old.role then
    raise exception 'Users cannot change their own role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
before update on public.profiles
for each row
execute function public.prevent_self_role_change();

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;