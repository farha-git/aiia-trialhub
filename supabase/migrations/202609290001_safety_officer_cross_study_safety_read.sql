drop policy if exists safety_cases_read_study_members on public.safety_cases;

create policy safety_cases_read_study_members
on public.safety_cases for select to authenticated
using (
  public.can_access_study(study_id)
  or public.has_role('SAFETY_OFFICER')
);
