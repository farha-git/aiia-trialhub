-- Synthetic sample records for video walkthroughs. SAMPLE study codes keep
-- these examples distinguishable from live clinical studies.

alter table public.studies
  add column if not exists started_on timestamptz,
  add column if not exists planned_end timestamptz,
  add column if not exists ethics_expires_on timestamptz;

insert into public.studies (
  study_code, title, phase, status, risk, target_participants, enrolled_participants,
  principal_investigator, activated_sites, lead, stage, visits_complete, archived,
  open_saes, data_completeness, ethics_status, ctri_status, is_demo, rule_pack,
  started_on, planned_end, ethics_expires_on
)
values
  (
    'SAMPLE-HR-001', 'Sample · Integrative care pathway in chronic pain', 'Phase III · Multi-centre',
    'Recruiting', 'High', 120, 0, 'Dr. Anika Rao', 2, 'Dr. Anika Rao', 'recruitment', 0,
    false, 0, 72, 'Renewal due', 'Reconciliation due', true, 'regulatory-ndct',
    now() - interval '90 days', now() + interval '30 days', now() - interval '1 day'
  ),
  (
    'SAMPLE-HR-002', 'Sample · Metabolic outcomes in type 2 diabetes', 'Phase II · Interventional',
    'Recruiting', 'High', 120, 0, 'Dr. Vivek Menon', 1, 'Dr. Vivek Menon', 'recruitment', 0,
    false, 0, 68, 'Renewal due', 'Pending', true, 'academic-asu',
    now() - interval '90 days', now() + interval '30 days', now() - interval '1 day'
  ),
  (
    'SAMPLE-HR-003', 'Sample · Ayurveda protocol for rheumatoid arthritis', 'Phase II · Interventional',
    'Recruiting', 'High', 120, 0, 'Dr. Nisha Kulkarni', 2, 'Dr. Nisha Kulkarni', 'recruitment', 0,
    false, 0, 75, 'Renewal due', 'Reconciliation due', true, 'institutional-sop',
    now() - interval '90 days', now() + interval '30 days', now() - interval '1 day'
  ),
  (
    'SAMPLE-HR-004', 'Sample · Prospective registry for chronic skin conditions', 'Prospective · Registry',
    'Recruiting', 'High', 120, 0, 'Dr. Farah Iyer', 1, 'Dr. Farah Iyer', 'recruitment', 0,
    false, 0, 70, 'Renewal due', 'Pending', true, 'academic-asu',
    now() - interval '90 days', now() + interval '30 days', now() - interval '1 day'
  )
on conflict (study_code) do nothing;

insert into public.compliance_items (id, study_id, title, detail, owner, severity, resolved)
values
  ('SAMPLE-HR-001-RISK-01', 'SAMPLE-HR-001', 'Sample · Ethics renewal overdue', 'Simulated training scenario; approval renewal date has passed.', 'Sample Compliance Team', 'High', false),
  ('SAMPLE-HR-001-RISK-02', 'SAMPLE-HR-001', 'Sample · Enrollment review overdue', 'Simulated training scenario; recruitment is behind the planned pace.', 'Sample Study Team', 'High', false),
  ('SAMPLE-HR-001-RISK-03', 'SAMPLE-HR-001', 'Sample · Documentation reconciliation', 'Simulated training scenario; protocol documentation needs reconciliation.', 'Sample Regulatory Team', 'High', false),
  ('SAMPLE-HR-002-RISK-01', 'SAMPLE-HR-002', 'Sample · Ethics renewal overdue', 'Simulated training scenario; approval renewal date has passed.', 'Sample Compliance Team', 'High', false),
  ('SAMPLE-HR-002-RISK-02', 'SAMPLE-HR-002', 'Sample · Enrollment review overdue', 'Simulated training scenario; recruitment is behind the planned pace.', 'Sample Study Team', 'High', false),
  ('SAMPLE-HR-002-RISK-03', 'SAMPLE-HR-002', 'Sample · Documentation reconciliation', 'Simulated training scenario; protocol documentation needs reconciliation.', 'Sample Regulatory Team', 'High', false),
  ('SAMPLE-HR-003-RISK-01', 'SAMPLE-HR-003', 'Sample · Ethics renewal overdue', 'Simulated training scenario; approval renewal date has passed.', 'Sample Compliance Team', 'High', false),
  ('SAMPLE-HR-003-RISK-02', 'SAMPLE-HR-003', 'Sample · Enrollment review overdue', 'Simulated training scenario; recruitment is behind the planned pace.', 'Sample Study Team', 'High', false),
  ('SAMPLE-HR-003-RISK-03', 'SAMPLE-HR-003', 'Sample · Documentation reconciliation', 'Simulated training scenario; protocol documentation needs reconciliation.', 'Sample Regulatory Team', 'High', false),
  ('SAMPLE-HR-004-RISK-01', 'SAMPLE-HR-004', 'Sample · Ethics renewal overdue', 'Simulated training scenario; approval renewal date has passed.', 'Sample Compliance Team', 'High', false),
  ('SAMPLE-HR-004-RISK-02', 'SAMPLE-HR-004', 'Sample · Enrollment review overdue', 'Simulated training scenario; recruitment is behind the planned pace.', 'Sample Study Team', 'High', false),
  ('SAMPLE-HR-004-RISK-03', 'SAMPLE-HR-004', 'Sample · Documentation reconciliation', 'Simulated training scenario; protocol documentation needs reconciliation.', 'Sample Regulatory Team', 'High', false)
on conflict (id) do nothing;
