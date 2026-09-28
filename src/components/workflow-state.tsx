import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getStudies } from "../lib/studies";
import { supabase } from "../lib/supabase";

export const workflowStages = [
  { id: "protocol", label: "Protocol" },
  { id: "ethics", label: "Ethics" },
  { id: "ctri", label: "CTRI" },
  { id: "sites", label: "Sites" },
  { id: "recruitment", label: "Recruitment" },
  { id: "follow-up", label: "Follow-up" },
  { id: "close-out", label: "Close-out" },
  { id: "closed", label: "Closed" },
] as const;

export type WorkflowStage = (typeof workflowStages)[number]["id"];
export type StudyRisk = "High" | "Moderate" | "Low";

export type WorkflowStudy = {
  id: string;
  title: string;
  phase: string;
  status: string;
  risk: StudyRisk;
  enrolled: number;
  target: number;
  activatedSites: number;
  lead: string;
  stage: WorkflowStage;
  visitsComplete: number;
  archived: boolean;
};

export type SafetyCaseStage = "reported" | "medical-review" | "regulatory-reporting" | "follow-up" | "ready-to-close" | "signal-review" | "closed";
export type WorkflowSafetyCase = {
  id: string;
  studyId: string;
  title: string;
  severity: "AE" | "SAE";
  stage: SafetyCaseStage;
  owner: string;
  due: string;
};

export type ComplianceRisk = {
  id: string;
  studyId: string;
  title: string;
  detail: string;
  owner: string;
  severity: "High" | "Medium";
  resolved: boolean;
};

export type AuditEntry = {
  id: string;
  studyId: string;
  action: string;
  actor: string;
  timestamp: string;
};

type NewStudy = Pick<WorkflowStudy, "title" | "phase" | "target" | "lead">;

const initialStudies: WorkflowStudy[] = [
  { id: "AIIA-OA-024", title: "Comparative efficacy of classical formulation in knee osteoarthritis", phase: "Phase III · Multi-centre", status: "Recruiting", risk: "High", enrolled: 136, target: 200, activatedSites: 4, lead: "Dr. Meera Nair", stage: "recruitment", visitsComplete: 0, archived: false },
  { id: "AIIA-RA-019", title: "Integrative Ayurveda protocol for rheumatoid arthritis", phase: "Phase II · Interventional", status: "Active", risk: "Moderate", enrolled: 162, target: 200, activatedSites: 2, lead: "Dr. R. Kulkarni", stage: "recruitment", visitsComplete: 0, archived: false },
  { id: "AIIA-DM-031", title: "Metabolic outcomes with Nishamalaki intervention", phase: "Observational · Cohort", status: "Recruiting", risk: "Low", enrolled: 92, target: 200, activatedSites: 3, lead: "Dr. S. Menon", stage: "recruitment", visitsComplete: 0, archived: false },
  { id: "AIIA-PS-017", title: "Prakriti stratification in chronic psoriasis", phase: "Prospective · Registry", status: "Follow-up", risk: "Low", enrolled: 92, target: 100, activatedSites: 1, lead: "Dr. A. Sharma", stage: "follow-up", visitsComplete: 87, archived: false },
  { id: "AIIA-HT-008", title: "Completed observational care-pathway study", phase: "Observational · Cohort", status: "Closed", risk: "Low", enrolled: 100, target: 100, activatedSites: 2, lead: "Dr. N. Iyer", stage: "closed", visitsComplete: 100, archived: true },
];

const initialSafetyCases: WorkflowSafetyCase[] = [
  { id: "SAE-2026-014", studyId: "AIIA-OA-024", title: "Acute hepatic injury", severity: "SAE", stage: "reported", owner: "Dr. Kavita Rao", due: "18h" },
  { id: "SAE-2026-015", studyId: "AIIA-OA-024", title: "Unplanned hospitalisation", severity: "SAE", stage: "medical-review", owner: "Safety physician", due: "24h" },
  { id: "SAE-2026-011", studyId: "AIIA-RA-019", title: "Hospitalisation", severity: "SAE", stage: "follow-up", owner: "Safety physician", due: "Overdue" },
  { id: "SAE-2026-006", studyId: "AIIA-DM-031", title: "Severe hypoglycaemia", severity: "SAE", stage: "regulatory-reporting", owner: "NPvCC reviewer", due: "12h" },
  { id: "AE-2026-031", studyId: "AIIA-RA-019", title: "Gastrointestinal symptom cluster · 6 cases", severity: "AE", stage: "signal-review", owner: "Signal review board", due: "Review" },
  { id: "SAE-2026-009", studyId: "AIIA-PS-017", title: "Fracture after fall", severity: "SAE", stage: "closed", owner: "PI, Jaipur site", due: "Closed" },
];

const initialRisks: ComplianceRisk[] = [
  { id: "RISK-CTRI-024", studyId: "AIIA-OA-024", title: "CTRI outcome mismatch", detail: "Secondary outcome wording differs from approved protocol v3.2", owner: "Regulatory Operations", severity: "High", resolved: false },
  { id: "RISK-GCP-004", studyId: "AIIA-OA-024", title: "Expired GCP certificate", detail: "Site 04 · Investigator 07", owner: "Site lead", severity: "Medium", resolved: false },
  { id: "RISK-CONSENT-031", studyId: "AIIA-DM-031", title: "Consent form superseded", detail: "Current approved consent version is not filed", owner: "Document controller", severity: "Medium", resolved: false },
];

const stageOrder = workflowStages.map((stage) => stage.id);
const nextStage: Partial<Record<WorkflowStage, WorkflowStage>> = {
  protocol: "ethics",
  ethics: "ctri",
  ctri: "sites",
  sites: "recruitment",
  recruitment: "follow-up",
  "follow-up": "close-out",
  "close-out": "closed",
};
const nextSafetyStage: Partial<Record<SafetyCaseStage, SafetyCaseStage>> = {
  reported: "medical-review",
  "medical-review": "regulatory-reporting",
  "regulatory-reporting": "follow-up",
  "follow-up": "ready-to-close",
  "ready-to-close": "closed",
  "signal-review": "regulatory-reporting",
};

function stageStatus(stage: WorkflowStage) {
  return workflowStages.find((item) => item.id === stage)?.label ?? "Planning";
}

type WorkflowState = {
  studies: WorkflowStudy[];
  safetyCases: WorkflowSafetyCase[];
  risks: ComplianceRisk[];
  auditEntries: AuditEntry[];
  createStudy: (input: NewStudy) => Promise<string>;
  advanceStudy: (studyId: string) => { ok: boolean; message: string };
  recordEnrollments: (studyId: string, count: number) => { ok: boolean; message: string };
  recordVisits: (studyId: string, count: number) => { ok: boolean; message: string };
  addSafetyCase: (input: Omit<WorkflowSafetyCase, "id" | "stage" | "owner" | "due">) => string;
  advanceSafetyCase: (caseId: string) => void;
  resolveRisk: (riskId: string) => void;
  getStudy: (studyId: string) => WorkflowStudy | undefined;
  getOpenSaes: (studyId: string) => number;
};

const WorkflowContext = createContext<WorkflowState | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [studies, setStudies] = useState(initialStudies);
  const [safetyCases, setSafetyCases] = useState(initialSafetyCases);
  const [risks, setRisks] = useState(initialRisks);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  

  const recordAudit = (studyId: string, action: string) => {
    setAuditEntries((entries) => [{ id: `${Date.now()}-${Math.random()}`, studyId, action, actor: "Research Operations (demo)", timestamp: new Date().toISOString() }, ...entries]);
  };

 const createStudy = async (input: NewStudy) => {
  const number =
    studies.filter((study) => study.id.startsWith("AIIA-NEW-")).length + 1;

  const studyCode = `AIIA-NEW-${String(number).padStart(3, "0")}`;

  const { data, error } = await supabase
    .from("studies")
    .insert({
      study_code: studyCode,
      title: input.title,
      phase: input.phase,
      status: "Protocol",
      risk: "Low",
      target_participants: input.target,
      enrolled_participants: 0,
      principal_investigator: input.lead,
      activated_sites: 0,
      lead: input.lead,
      stage: "protocol",
      visits_complete: 0,
      archived: false,
      open_saes: 0,
      data_completeness: 0,
      ethics_status: "Pending",
      ctri_status: "Pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create study:", error);
    throw error;
  }

  const newStudy: WorkflowStudy = {
    id: data.study_code,
    title: data.title,
    phase: data.phase,
    status: data.status,
    risk: data.risk as StudyRisk,
    enrolled: data.enrolled_participants,
    target: data.target_participants,
    activatedSites: data.activated_sites,
    lead: data.lead || data.principal_investigator,
    stage: data.stage as WorkflowStage,
    visitsComplete: data.visits_complete,
    archived: data.archived,
  };

  setStudies((items) => [...items, newStudy]);

  recordAudit(data.study_code, "Draft protocol workspace created");

  return data.study_code;
};

  const advanceStudy = (studyId: string) => {
    const study = studies.find((item) => item.id === studyId);
    if (!study) return { ok: false, message: "Study not found." };
    const next = nextStage[study.stage];
    if (!next) return { ok: false, message: "This study is already closed." };
    if (study.stage === "recruitment" && study.enrolled < study.target) {
      return { ok: false, message: `Recruitment is ${study.target - study.enrolled} participants short of target.` };
    }
    if (study.stage === "follow-up" && study.visitsComplete < study.enrolled) {
      return { ok: false, message: `${study.enrolled - study.visitsComplete} participant follow-up visits remain.` };
    }
    if (study.stage === "close-out" && safetyCases.some((item) => item.studyId === studyId && item.severity === "SAE" && item.stage !== "closed")) {
      return { ok: false, message: "Close or document every open SAE before database lock." };
    }
    setStudies((items) => items.map((item) => item.id === studyId ? { ...item, stage: next, status: stageStatus(next), activatedSites: next === "recruitment" ? Math.max(item.activatedSites, 1) : item.activatedSites, archived: next === "closed" } : item));
    recordAudit(studyId, `${stageStatus(study.stage)} completed; advanced to ${stageStatus(next)}`);
    return { ok: true, message: `Study advanced to ${stageStatus(next)}.` };
  };

  const recordEnrollments = (studyId: string, count: number) => {
    const study = studies.find((item) => item.id === studyId);
    if (!study || study.stage !== "recruitment") return { ok: false, message: "Enrollment is only available during recruitment." };
    const accepted = Math.min(Math.max(1, Math.floor(count)), study.target - study.enrolled);
    if (accepted <= 0) return { ok: false, message: "The enrollment target has already been reached." };
    setStudies((items) => items.map((item) => item.id === studyId ? { ...item, enrolled: item.enrolled + accepted } : item));
    recordAudit(studyId, `${accepted} participant${accepted === 1 ? "" : "s"} enrolled`);
    return { ok: true, message: `${accepted} participant${accepted === 1 ? "" : "s"} recorded.` };
  };

  const recordVisits = (studyId: string, count: number) => {
    const study = studies.find((item) => item.id === studyId);
    if (!study || study.stage !== "follow-up") return { ok: false, message: "Visits can only be completed during follow-up." };
    const accepted = Math.min(Math.max(1, Math.floor(count)), study.enrolled - study.visitsComplete);
    if (accepted <= 0) return { ok: false, message: "All participant follow-up visits are complete." };
    setStudies((items) => items.map((item) => item.id === studyId ? { ...item, visitsComplete: item.visitsComplete + accepted } : item));
    recordAudit(studyId, `${accepted} follow-up visit${accepted === 1 ? "" : "s"} completed`);
    return { ok: true, message: `${accepted} follow-up visit${accepted === 1 ? "" : "s"} recorded.` };
  };

  const addSafetyCase = (input: Omit<WorkflowSafetyCase, "id" | "stage" | "owner" | "due">) => {
    const number = safetyCases.length + 1;
    const id = `${input.severity}-${new Date().getFullYear()}-${String(number).padStart(3, "0")}`;
    setSafetyCases((items) => [{ ...input, id, stage: "reported", owner: "Safety physician", due: input.severity === "SAE" ? "24h" : "Review" }, ...items]);
    recordAudit(input.studyId, `${input.severity} ${id} reported`);
    return id;
  };

  const advanceSafetyCase = (caseId: string) => {
    const current = safetyCases.find((item) => item.id === caseId);
    const next = current && nextSafetyStage[current.stage];
    if (!current || !next) return;
    setSafetyCases((items) => items.map((item) => item.id === caseId ? { ...item, stage: next, due: next === "closed" ? "Closed" : item.due } : item));
    recordAudit(current.studyId, `${caseId} advanced to ${next.replaceAll("-", " ")}`);
  };

  const resolveRisk = (riskId: string) => {
    const risk = risks.find((item) => item.id === riskId);
    if (!risk || risk.resolved) return;
    setRisks((items) => items.map((item) => item.id === riskId ? { ...item, resolved: true } : item));
    recordAudit(risk.studyId, `Compliance item resolved: ${risk.title}`);
  };

  const value: WorkflowState = {
    studies,
    safetyCases,
    risks,
    auditEntries,
    createStudy,
    advanceStudy,
    recordEnrollments,
    recordVisits,
    addSafetyCase,
    advanceSafetyCase,
    resolveRisk,
    getStudy: (studyId) => studies.find((study) => study.id === studyId),
    getOpenSaes: (studyId) => safetyCases.filter((item) => item.studyId === studyId && item.severity === "SAE" && item.stage !== "closed").length,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const workflow = useContext(WorkflowContext);
  if (!workflow) throw new Error("useWorkflow must be used within WorkflowProvider");
  return workflow;
}

export function getStudyProgress(study: WorkflowStudy) {
  return Math.round((study.enrolled / Math.max(study.target, 1)) * 100);
}

export function getCurrentStageIndex(stage: WorkflowStage) {
  return stageOrder.indexOf(stage);
}
