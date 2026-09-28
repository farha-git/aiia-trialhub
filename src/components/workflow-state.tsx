import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getStudies } from "../lib/studies";
import { supabase } from "../lib/supabase";
import type { RulePackId } from "../lib/rule-packs";

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
  startedOn?: string | undefined;
  plannedEnd?: string | undefined;
  ethicsApprovedOn?: string | undefined;
  ethicsExpiresOn?: string | undefined;
  ctriRef?: string | undefined;
  ctriRegisteredOn?: string | undefined;
  rulePack: RulePackId;
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
  onsetAt?: string | undefined;
  awareAt?: string | undefined;
  reportedAt?: string | undefined;
  batchId?: string | undefined;
  causality?: "Certain" | "Probable" | "Possible" | "Unlikely" | "Unrelated" | "Unassessable" | undefined;
  prakriti?: "Vata" | "Pitta" | "Kapha" | "Vata-Pitta" | "Pitta-Kapha" | "Vata-Kapha" | "Sama" | undefined;
  concomitantMeds?: string[] | undefined;
  interactionSuspected?: boolean | undefined;
  meddraTerm?: string | undefined;
  namasteCode?: string | undefined;
};

export type InterventionBatch = {
  id: string;
  studyId: string;
  formulation: string;
  lotNo: string;
  manufacturer: string;
  coaStatus: "Pending" | "Verified" | "Failed";
  heavyMetals: "Pending" | "Pass" | "Fail";
  microbial: "Pending" | "Pass" | "Fail";
  testedOn?: string | undefined;
};

export type Milestone = {
  id: string;
  studyId: string;
  kind: "Ethics renewal" | "CTRI update" | "Annual report" | "Close-out";
  dueOn: string;
  doneOn?: string | undefined;
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
  hash?: string | undefined;
  prevHash?: string | undefined;
};

export type DocumentRecord = {
  id: string;
  studyId: string;
  title: string;
  version: number;
  status: "Draft" | "In review" | "Approved" | "Superseded";
  owner: string;
  updatedAt: string;
};

type NewStudy = Pick<WorkflowStudy, "title" | "phase" | "target" | "lead"> & { rulePack?: RulePackId | undefined };

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const initialStudies: WorkflowStudy[] = [
  { id: "AIIA-OA-024", title: "Comparative efficacy of classical formulation in knee osteoarthritis", phase: "Phase III · Multi-centre", status: "Recruiting", risk: "High", enrolled: 136, target: 200, activatedSites: 4, lead: "Dr. Meera Nair", stage: "recruitment", visitsComplete: 0, archived: false, startedOn: daysFromNow(-120), plannedEnd: daysFromNow(90), ethicsApprovedOn: daysFromNow(-100), ethicsExpiresOn: daysFromNow(18), rulePack: "regulatory-ndct" },
  { id: "AIIA-RA-019", title: "Integrative Ayurveda protocol for rheumatoid arthritis", phase: "Phase II · Interventional", status: "Active", risk: "Moderate", enrolled: 162, target: 200, activatedSites: 2, lead: "Dr. R. Kulkarni", stage: "recruitment", visitsComplete: 0, archived: false, startedOn: daysFromNow(-80), plannedEnd: daysFromNow(180), ethicsApprovedOn: daysFromNow(-70), ethicsExpiresOn: daysFromNow(90), rulePack: "academic-asu" },
  { id: "AIIA-DM-031", title: "Metabolic outcomes with Nishamalaki intervention", phase: "Observational · Cohort", status: "Recruiting", risk: "Low", enrolled: 92, target: 200, activatedSites: 3, lead: "Dr. S. Menon", stage: "recruitment", visitsComplete: 0, archived: false, startedOn: daysFromNow(-45), plannedEnd: daysFromNow(240), ethicsApprovedOn: daysFromNow(-40), ethicsExpiresOn: daysFromNow(-2), rulePack: "institutional-sop" },
  { id: "AIIA-PS-017", title: "Prakriti stratification in chronic psoriasis", phase: "Prospective · Registry", status: "Follow-up", risk: "Low", enrolled: 92, target: 100, activatedSites: 1, lead: "Dr. A. Sharma", stage: "follow-up", visitsComplete: 87, archived: false, startedOn: daysFromNow(-240), plannedEnd: daysFromNow(12), ethicsApprovedOn: daysFromNow(-230), ethicsExpiresOn: daysFromNow(140), rulePack: "academic-asu" },
  { id: "AIIA-HT-008", title: "Completed observational care-pathway study", phase: "Observational · Cohort", status: "Closed", risk: "Low", enrolled: 100, target: 100, activatedSites: 2, lead: "Dr. N. Iyer", stage: "closed", visitsComplete: 100, archived: true, startedOn: daysFromNow(-500), plannedEnd: daysFromNow(-30), ethicsApprovedOn: daysFromNow(-490), ethicsExpiresOn: daysFromNow(-100), rulePack: "academic-asu" },
];

const initialSafetyCases: WorkflowSafetyCase[] = [
  { id: "SAE-2026-014", studyId: "AIIA-OA-024", title: "Acute hepatic injury", severity: "SAE", stage: "reported", owner: "Dr. Kavita Rao", due: "", awareAt: hoursFromNow(5), onsetAt: hoursFromNow(4) },
  { id: "SAE-2026-015", studyId: "AIIA-OA-024", title: "Unplanned hospitalisation", severity: "SAE", stage: "medical-review", owner: "Safety physician", due: "", awareAt: hoursFromNow(-12), onsetAt: hoursFromNow(-14) },
  { id: "SAE-2026-011", studyId: "AIIA-RA-019", title: "Hospitalisation", severity: "SAE", stage: "follow-up", owner: "Safety physician", due: "", awareAt: daysFromNow(-3), onsetAt: daysFromNow(-4) },
  { id: "SAE-2026-006", studyId: "AIIA-DM-031", title: "Severe hypoglycaemia", severity: "SAE", stage: "regulatory-reporting", owner: "NPvCC reviewer", due: "", awareAt: daysFromNow(-1), onsetAt: daysFromNow(-2) },
  { id: "AE-2026-031", studyId: "AIIA-RA-019", title: "Gastrointestinal symptom cluster · 6 cases", severity: "AE", stage: "signal-review", owner: "Signal review board", due: "", awareAt: daysFromNow(-1), onsetAt: daysFromNow(-2) },
  { id: "SAE-2026-009", studyId: "AIIA-PS-017", title: "Fracture after fall", severity: "SAE", stage: "closed", owner: "PI, Jaipur site", due: "", awareAt: daysFromNow(-10), onsetAt: daysFromNow(-11), reportedAt: daysFromNow(-9) },
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
  usingOfflineData: boolean;
  demoClockOffsetHours: number;
  setDemoClockOffsetHours: (hours: number) => void;
  safetyCases: WorkflowSafetyCase[];
  risks: ComplianceRisk[];
  auditEntries: AuditEntry[];
  documents: DocumentRecord[];
  batches: InterventionBatch[];
  createStudy: (input: NewStudy) => Promise<string>;
  advanceStudy: (studyId: string) => { ok: boolean; message: string };
  recordEnrollments: (studyId: string, count: number) => { ok: boolean; message: string };
  recordVisits: (studyId: string, count: number) => { ok: boolean; message: string };
  addSafetyCase: (input: Omit<WorkflowSafetyCase, "id" | "stage" | "owner" | "due">) => string;
  advanceSafetyCase: (caseId: string) => void;
  resolveRisk: (riskId: string) => void;
  submitDocument: (documentId: string) => void;
  approveDocument: (documentId: string) => void;
  reviseDocument: (documentId: string) => void;
  getStudy: (studyId: string) => WorkflowStudy | undefined;
  getOpenSaes: (studyId: string) => number;
};

const WorkflowContext = createContext<WorkflowState | null>(null);

const initialDocuments: DocumentRecord[] = [
  { id: "DOC-OA-001", studyId: "AIIA-OA-024", title: "Protocol and amendments", version: 3, status: "In review", owner: "Study operations", updatedAt: new Date().toISOString() },
  { id: "DOC-OA-002", studyId: "AIIA-OA-024", title: "IEC approval letter", version: 1, status: "Approved", owner: "Compliance", updatedAt: new Date().toISOString() },
  { id: "DOC-RA-001", studyId: "AIIA-RA-019", title: "Investigator brochure", version: 2, status: "Draft", owner: "Medical affairs", updatedAt: new Date().toISOString() },
  { id: "DOC-DM-001", studyId: "AIIA-DM-031", title: "Consent and source records", version: 1, status: "In review", owner: "Document control", updatedAt: new Date().toISOString() },
];

const initialBatches: InterventionBatch[] = [
  { id: "BATCH-OA-01", studyId: "AIIA-OA-024", formulation: "Classical formulation", lotNo: "OA-24-001", manufacturer: "AIIA Pharmacy", coaStatus: "Verified", heavyMetals: "Pass", microbial: "Pass", testedOn: new Date().toISOString() },
  { id: "BATCH-RA-01", studyId: "AIIA-RA-019", formulation: "Integrative formulation", lotNo: "RA-19-004", manufacturer: "AIIA Pharmacy", coaStatus: "Pending", heavyMetals: "Pending", microbial: "Pass" },
];

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [studies, setStudies] = useState<WorkflowStudy[]>(initialStudies);
  const [usingOfflineData, setUsingOfflineData] = useState(false);
  const [demoClockOffsetHours, setDemoClockOffsetHours] = useState(0);
  const [safetyCases, setSafetyCases] = useState(initialSafetyCases);
  const [risks, setRisks] = useState(initialRisks);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [batches] = useState<InterventionBatch[]>(initialBatches);
    useEffect(() => {
    async function loadStudies() {
      try {
        const data = await getStudies();

        const mappedStudies: WorkflowStudy[] = (data || []).map((study: any) => ({
          id: study.study_code,
          title: study.title,
          phase: study.phase,
          status: study.status,
          risk: (study.risk || "Low") as StudyRisk,
          enrolled: study.enrolled_participants ?? 0,
          target: study.target_participants ?? 0,
          activatedSites: study.activated_sites ?? 0,
          lead: study.lead || study.principal_investigator || "",
          stage: (study.stage || "protocol") as WorkflowStage,
          visitsComplete: study.visits_complete ?? 0,
          archived: study.archived ?? false,
          startedOn: study.started_on ?? undefined,
          plannedEnd: study.planned_end ?? undefined,
          ethicsApprovedOn: study.ethics_approved_on ?? undefined,
          ethicsExpiresOn: study.ethics_expires_on ?? undefined,
          ctriRef: study.ctri_ref ?? undefined,
          ctriRegisteredOn: study.ctri_registered_on ?? undefined,
          rulePack: study.rule_pack ?? "academic-asu",
        }));

        if (mappedStudies.length > 0) {
          setStudies(mappedStudies);
          setUsingOfflineData(false);
        } else {
          setUsingOfflineData(true);
        }
      } catch (error) {
        console.error("Failed to load studies:", error);
        setUsingOfflineData(true);
      }
    }

    void loadStudies();
  }, []);
  

  const recordAudit = (studyId: string, action: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const timestamp = new Date().toISOString();
    setAuditEntries((entries) => {
      const entry: AuditEntry = { id, studyId, action, actor: "Research Operations", timestamp, prevHash: entries[0]?.hash };
      void crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${entry.prevHash ?? ""}${JSON.stringify(entry)}`)).then((digest) => {
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        setAuditEntries((current) => current.map((item) => item.id === id ? { ...item, hash } : item));
      }).catch(() => undefined);
      return [entry, ...entries];
    });
  };

 const createStudy = async (input: NewStudy) => {
 const studyCode = `AIIA-NEW-${Date.now()}`;

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
    rulePack: input.rulePack ?? "academic-asu",
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

  const submitDocument = (documentId: string) => {
    const document = documents.find((item) => item.id === documentId);
    if (!document || document.status !== "Draft") return;
    setDocuments((items) => items.map((item) => item.id === documentId ? { ...item, status: "In review", updatedAt: new Date().toISOString() } : item));
    recordAudit(document.studyId, `Document submitted: ${document.title} v${document.version}`);
  };

  const approveDocument = (documentId: string) => {
    const document = documents.find((item) => item.id === documentId);
    if (!document || document.status !== "In review") return;
    setDocuments((items) => items.map((item) => item.id === documentId ? { ...item, status: "Approved", updatedAt: new Date().toISOString() } : item));
    recordAudit(document.studyId, `Document approved: ${document.title} v${document.version}`);
  };

  const reviseDocument = (documentId: string) => {
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;
    const revised: DocumentRecord = { ...document, id: `${document.id}-v${document.version + 1}`, version: document.version + 1, status: "Draft", updatedAt: new Date().toISOString() };
    setDocuments((items) => [...items.map((item) => item.id === documentId ? { ...item, status: "Superseded" as const } : item), revised]);
    recordAudit(document.studyId, `Document revised: ${document.title} v${revised.version}`);
  };

  const value: WorkflowState = {
    studies,
    usingOfflineData,
    demoClockOffsetHours,
    setDemoClockOffsetHours,
    safetyCases,
    risks,
    auditEntries,
    documents,
    batches,
    createStudy,
    advanceStudy,
    recordEnrollments,
    recordVisits,
    addSafetyCase,
    advanceSafetyCase,
    resolveRisk,
    submitDocument,
    approveDocument,
    reviseDocument,
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
