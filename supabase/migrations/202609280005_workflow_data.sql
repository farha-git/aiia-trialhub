-- Persist the operational records that power safety, compliance, documents,
-- intervention batches, and the audit timeline. Seed rows are synthetic demo data.

create table if not exists public.safety_cases (
  id text primary key,
  study_id text not null,
  title text not null,
  severity text not null check (severity in ('AE', 'SAE')),
  stage text not null check (stage in ('reported', 'medical-review', 'regulatory-reporting', 'follow-up', 'ready-to-close', 'signal-review', 'closed')),
  owner text not null,
  due text not null default '',
  onset_at timestamptz,
  aware_at timestamptz,
  reported_at timestamptz,
  batch_id text,
  causality text,
  prakriti text,
  concomitant_meds text[] not null default '{}',
  interaction_suspected boolean,
  meddra_term text,
  namaste_code text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_risks (
  id text primary key,
  study_id text not null,
  title text not null,
  detail text not null,
  owner text not null,
  severity text not null check (severity in ('High', 'Medium')),
  resolved boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.intervention_batches (
  id text primary key,
  study_id text not null,
  formulation text not null,
  lot_no text not null,
  manufacturer text not null,
  coa_status text not null check (coa_status in ('Pending', 'Verified', 'Failed')),
  heavy_metals text not null check (heavy_metals in ('Pending', 'Pass', 'Fail')),
  microbial text not null check (microbial in ('Pending', 'Pass', 'Fail')),
  tested_on timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.studies add column if not exists is_demo boolean not null default false;
alter table public.documents add column if not exists is_demo boolean not null default false;

alter table public.safety_cases enable row level security;
alter table public.compliance_risks enable row level security;
alter table public.intervention_batches enable row level security;

drop policy if exists documents_authenticated_read on public.documents;
drop policy if exists documents_read_study_members on public.documents;
create policy documents_read_study_members
on public.documents for select to authenticated
using (public.can_access_study(study_id));
drop policy if exists documents_insert_study_operators on public.documents;
create policy documents_insert_study_operators
on public.documents for insert to authenticated
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'COMPLIANCE_OFFICER')
);
drop policy if exists documents_update_study_operators on public.documents;
create policy documents_update_study_operators
on public.documents for update to authenticated
using (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'COMPLIANCE_OFFICER')
)
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'COMPLIANCE_OFFICER')
);

drop policy if exists safety_cases_read_study_members on public.safety_cases;
create policy safety_cases_read_study_members
on public.safety_cases for select to authenticated
using (public.can_access_study(study_id));
drop policy if exists safety_cases_insert_study_operators on public.safety_cases;
create policy safety_cases_insert_study_operators
on public.safety_cases for insert to authenticated
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'SAFETY_OFFICER')
);
drop policy if exists safety_cases_update_study_operators on public.safety_cases;
create policy safety_cases_update_study_operators
on public.safety_cases for update to authenticated
using (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'SAFETY_OFFICER')
)
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'SAFETY_OFFICER')
);

drop policy if exists compliance_risks_read_study_members on public.compliance_risks;
create policy compliance_risks_read_study_members
on public.compliance_risks for select to authenticated
using (public.can_access_study(study_id));
drop policy if exists compliance_risks_update_study_operators on public.compliance_risks;
create policy compliance_risks_update_study_operators
on public.compliance_risks for update to authenticated
using (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'COMPLIANCE_OFFICER')
)
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'COMPLIANCE_OFFICER')
);

drop policy if exists intervention_batches_read_study_members on public.intervention_batches;
create policy intervention_batches_read_study_members
on public.intervention_batches for select to authenticated
using (public.can_access_study(study_id));
drop policy if exists intervention_batches_manage_study_operators on public.intervention_batches;
create policy intervention_batches_manage_study_operators
on public.intervention_batches for all to authenticated
using (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'DATA_MANAGER')
)
with check (
  public.can_access_study(study_id)
  and public.get_my_role() in ('ADMIN', 'PI', 'DATA_MANAGER')
);

drop policy if exists audit_events_authenticated_read on public.audit_events;
drop policy if exists audit_events_read_authorized_studies on public.audit_events;
create policy audit_events_read_authorized_studies
on public.audit_events for select to authenticated
using (
  (study_id is not null and public.can_access_study(study_id))
  or (study_id is null and public.has_role('ADMIN'))
);

grant select, insert, update on public.documents to authenticated;
grant select, insert, update on public.safety_cases to authenticated;
grant select, update on public.compliance_risks to authenticated;
grant select, insert, update on public.intervention_batches to authenticated;
grant select, insert on public.audit_events to authenticated;

insert into public.studies (
  study_code, title, phase, status, risk, target_participants, enrolled_participants,
  principal_investigator, activated_sites, lead, stage, visits_complete, archived,
  open_saes, data_completeness, ethics_status, ctri_status, is_demo
)
values
  ('AIIA-OA-024', 'Comparative efficacy of classical formulation in knee osteoarthritis', 'Phase III · Multi-centre', 'Recruiting', 'High', 200, 136, 'Dr. Meera Nair', 4, 'Dr. Meera Nair', 'recruitment', 0, false, 2, 88, 'Approved', 'Reconciliation due', true),
  ('AIIA-RA-019', 'Integrative Ayurveda protocol for rheumatoid arthritis', 'Phase II · Interventional', 'Active', 'Moderate', 200, 162, 'Dr. R. Kulkarni', 2, 'Dr. R. Kulkarni', 'recruitment', 0, false, 1, 91, 'Approved', 'Current', true),
  ('AIIA-DM-031', 'Metabolic outcomes with Nishamalaki intervention', 'Observational · Cohort', 'Recruiting', 'Low', 200, 92, 'Dr. S. Menon', 3, 'Dr. S. Menon', 'recruitment', 0, false, 1, 84, 'Renewal due', 'Current', true),
  ('AIIA-PS-017', 'Prakriti stratification in chronic psoriasis', 'Prospective · Registry', 'Follow-up', 'Low', 100, 92, 'Dr. A. Sharma', 1, 'Dr. A. Sharma', 'follow-up', 87, false, 0, 95, 'Approved', 'Current', true),
  ('AIIA-HT-008', 'Completed observational care-pathway study', 'Observational · Cohort', 'Closed', 'Low', 100, 100, 'Dr. N. Iyer', 2, 'Dr. N. Iyer', 'closed', 100, true, 0, 100, 'Approved', 'Current', true)
on conflict (study_code) do nothing;

insert into public.safety_cases (id, study_id, title, severity, stage, owner, due, onset_at, aware_at, reported_at, is_demo)
values
  ('SAE-2026-014', 'AIIA-OA-024', 'Acute hepatic injury', 'SAE', 'reported', 'Dr. Kavita Rao', '', now() + interval '4 hours', now() + interval '5 hours', null, true),
  ('SAE-2026-015', 'AIIA-OA-024', 'Unplanned hospitalisation', 'SAE', 'medical-review', 'Safety physician', '', now() - interval '14 hours', now() - interval '12 hours', null, true),
  ('SAE-2026-011', 'AIIA-RA-019', 'Hospitalisation', 'SAE', 'follow-up', 'Safety physician', '', now() - interval '4 days', now() - interval '3 days', null, true),
  ('SAE-2026-006', 'AIIA-DM-031', 'Severe hypoglycaemia', 'SAE', 'regulatory-reporting', 'NPvCC reviewer', '', now() - interval '2 days', now() - interval '1 day', null, true),
  ('AE-2026-031', 'AIIA-RA-019', 'Gastrointestinal symptom cluster · 6 cases', 'AE', 'signal-review', 'Signal review board', '', now() - interval '2 days', now() - interval '1 day', null, true),
  ('SAE-2026-009', 'AIIA-PS-017', 'Fracture after fall', 'SAE', 'closed', 'PI, Jaipur site', '', now() - interval '11 days', now() - interval '10 days', now() - interval '9 days', true)
on conflict (id) do nothing;

insert into public.compliance_risks (id, study_id, title, detail, owner, severity, resolved, is_demo)
values
  ('RISK-CTRI-024', 'AIIA-OA-024', 'CTRI outcome mismatch', 'Secondary outcome wording differs from approved protocol v3.2', 'Regulatory Operations', 'High', false, true),
  ('RISK-GCP-004', 'AIIA-OA-024', 'Expired GCP certificate', 'Site 04 · Investigator 07', 'Site lead', 'Medium', false, true),
  ('RISK-CONSENT-031', 'AIIA-DM-031', 'Consent form superseded', 'Current approved consent version is not filed', 'Document controller', 'Medium', false, true)
on conflict (id) do nothing;

insert into public.intervention_batches (id, study_id, formulation, lot_no, manufacturer, coa_status, heavy_metals, microbial, tested_on, is_demo)
values
  ('BATCH-OA-01', 'AIIA-OA-024', 'Classical formulation', 'OA-24-001', 'AIIA Pharmacy', 'Verified', 'Pass', 'Pass', now(), true),
  ('BATCH-RA-01', 'AIIA-RA-019', 'Integrative formulation', 'RA-19-004', 'AIIA Pharmacy', 'Pending', 'Pending', 'Pass', null, true)
on conflict (id) do nothing;

insert into public.documents (id, study_id, title, version, status, owner, updated_at, is_demo)
values
  ('00000000-0000-4000-8000-000000000001', 'AIIA-OA-024', 'Protocol and amendments', 3, 'In review', 'Study operations', now(), true),
  ('00000000-0000-4000-8000-000000000002', 'AIIA-OA-024', 'IEC approval letter', 1, 'Approved', 'Compliance', now(), true),
  ('00000000-0000-4000-8000-000000000003', 'AIIA-RA-019', 'Investigator brochure', 2, 'Draft', 'Medical affairs', now(), true),
  ('00000000-0000-4000-8000-000000000004', 'AIIA-DM-031', 'Consent and source records', 1, 'In review', 'Document control', now(), true)
on conflict (id) do nothing;

insert into public.audit_events (id, study_id, action, resource_type, metadata, created_at)
values
  ('00000000-0000-4000-8000-000000000101', 'AIIA-OA-024', 'Demo protocol workspace created', 'study', '{"actor":"Research Operations","demo_seed":true}'::jsonb, now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000102', 'AIIA-RA-019', 'Demo safety case entered for review', 'safety_case', '{"actor":"Safety physician","demo_seed":true}'::jsonb, now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000103', 'AIIA-OA-024', 'Demo compliance item flagged for review', 'compliance_risk', '{"actor":"Regulatory Operations","demo_seed":true}'::jsonb, now() - interval '12 hours')
on conflict (id) do nothing;