create or replace function public.can_access_study(required_study_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role() in (
    'ADMIN',
    'PI',
    'CRC',
    'SAFETY_OFFICER',
    'COMPLIANCE_OFFICER',
    'DATA_MANAGER'
  )
  or exists (
    select 1 from public.study_members
    where study_id = required_study_id and user_id = (select auth.uid())
  );
$$;

drop policy if exists audit_events_read_authorized_studies on public.audit_events;
create policy audit_events_read_authorized_studies
on public.audit_events for select to authenticated
using (
  public.get_my_role() in (
    'ADMIN',
    'PI',
    'CRC',
    'SAFETY_OFFICER',
    'COMPLIANCE_OFFICER',
    'DATA_MANAGER'
  )
);
