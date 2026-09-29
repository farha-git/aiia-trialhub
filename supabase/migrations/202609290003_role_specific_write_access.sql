create or replace function public.enforce_crc_study_update_scope()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.get_my_role() = 'CRC'
    and (to_jsonb(new) - 'enrolled_participants' - 'visits_complete')
      is distinct from (to_jsonb(old) - 'enrolled_participants' - 'visits_complete') then
    raise exception 'CRC users may update enrollment and visit counts only';
  end if;
  return new;
end;
$$;

drop trigger if exists studies_enforce_crc_update_scope on public.studies;
create trigger studies_enforce_crc_update_scope
before update on public.studies
for each row
execute function public.enforce_crc_study_update_scope();

drop policy if exists studies_update_authorized on public.studies;
create policy studies_update_authorized
on public.studies for update to authenticated
using (
  public.get_my_role() in ('ADMIN', 'PI', 'CRC')
  and public.can_access_study(study_code)
)
with check (
  public.get_my_role() in ('ADMIN', 'PI', 'CRC')
  and public.can_access_study(study_code)
);

drop policy if exists safety_cases_insert_study_operators on public.safety_cases;
create policy safety_cases_insert_study_operators
on public.safety_cases for insert to authenticated
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'SAFETY_OFFICER')
);

drop policy if exists safety_cases_update_study_operators on public.safety_cases;
create policy safety_cases_update_study_operators
on public.safety_cases for update to authenticated
using (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'SAFETY_OFFICER')
)
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'SAFETY_OFFICER')
);
