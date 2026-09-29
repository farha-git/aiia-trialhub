import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getStudies } from "../lib/studies";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import type { RulePackId } from "../lib/rule-packs";
import { computeRisk } from "../lib/risk";

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
export type WorkflowStudy = {
  id: string;
  title: string;
  phase: string;
  status: string;
  enrolled: number;
  target: number;
  activatedSites: number;
  lead: string;
  stage: WorkflowStage;
  visitsComplete: number;
  dataCompleteness: number;
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
  onsetAt?: string | undefined;
  awareAt?: string | undefined;
  reportedAt?: string | undefined;
  batchId?: string | undefined;
  causality?: "Certain" | "Probable" | "Possible" | "Unlikely" | "Conditional/Unclassified" | "Unassessable/Unclassifiable" | undefined;
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
  heavyMetalStatus: "Pending" | "Pass" | "Fail";
  microbialStatus: "Pending" | "Pass" | "Fail";
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
  eventOrder?: number | undefined;
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

async function hashAuditEntry(entry: AuditEntry) {
  const { hash: _hash, eventOrder: _eventOrder, ...content } = entry;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${entry.prevHash ?? ""}${JSON.stringify(content)}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const initialStudies: WorkflowStudy[] = [
  { id: "AIIA-OA-024", title: "Comparative efficacy of classical formulation in knee osteoarthritis", phase: "Phase III · Multi-centre", status: "Recruiting", enrolled: 136, target: 200, activatedSites: 4, lead: "Dr. Meera Nair", stage: "recruitment", visitsComplete: 0, dataCompleteness: 88, archived: false, startedOn: daysFromNow(-120), plannedEnd: daysFromNow(90), ethicsApprovedOn: daysFromNow(-100), ethicsExpiresOn: daysFromNow(18), rulePack: "regulatory-ndct" },
  { id: "AIIA-RA-019", title: "Integrative Ayurveda protocol for rheumatoid arthritis", phase: "Phase II · Interventional", status: "Active", enrolled: 162, target: 200, activatedSites: 2, lead: "Dr. R. Kulkarni", stage: "recruitment", visitsComplete: 0, dataCompleteness: 91, archived: false, startedOn: daysFromNow(-80), plannedEnd: daysFromNow(180), ethicsApprovedOn: daysFromNow(-70), ethicsExpiresOn: daysFromNow(90), rulePack: "academic-asu" },
  { id: "AIIA-DM-031", title: "Metabolic outcomes with Nishamalaki intervention", phase: "Observational · Cohort", status: "Recruiting", enrolled: 92, target: 200, activatedSites: 3, lead: "Dr. S. Menon", stage: "recruitment", visitsComplete: 0, dataCompleteness: 84, archived: false, startedOn: daysFromNow(-45), plannedEnd: daysFromNow(240), ethicsApprovedOn: daysFromNow(-40), ethicsExpiresOn: daysFromNow(-2), rulePack: "institutional-sop" },
  { id: "AIIA-PS-017", title: "Prakriti stratification in chronic psoriasis", phase: "Prospective · Registry", status: "Follow-up", enrolled: 92, target: 100, activatedSites: 1, lead: "Dr. A. Sharma", stage: "follow-up", visitsComplete: 87, dataCompleteness: 95, archived: false, startedOn: daysFromNow(-240), plannedEnd: daysFromNow(12), ethicsApprovedOn: daysFromNow(-230), ethicsExpiresOn: daysFromNow(140), rulePack: "academic-asu" },
  { id: "AIIA-HT-008", title: "Completed observational care-pathway study", phase: "Observational · Cohort", status: "Closed", enrolled: 100, target: 100, activatedSites: 2, lead: "Dr. N. Iyer", stage: "closed", visitsComplete: 100, dataCompleteness: 0, archived: true, startedOn: daysFromNow(-500), plannedEnd: daysFromNow(-30), ethicsApprovedOn: daysFromNow(-490), ethicsExpiresOn: daysFromNow(-100), rulePack: "academic-asu" },
];

const initialSafetyCases: WorkflowSafetyCase[] = [
  { id: "SAE-2026-014", studyId: "AIIA-OA-024", title: "Acute hepatic injury", severity: "SAE", stage: "reported", owner: "Dr. Kavita Rao", awareAt: hoursFromNow(5), onsetAt: hoursFromNow(4) },
  { id: "SAE-2026-015", studyId: "AIIA-OA-024", title: "Unplanned hospitalisation", severity: "SAE", stage: "medical-review", owner: "Safety physician", awareAt: hoursFromNow(-18), onsetAt: hoursFromNow(-20) },
  { id: "SAE-2026-011", studyId: "AIIA-RA-019", title: "Hospitalisation", severity: "SAE", stage: "follow-up", owner: "Safety physician", awareAt: daysFromNow(-3), onsetAt: daysFromNow(-4) },
  { id: "SAE-2026-006", studyId: "AIIA-DM-031", title: "Severe hypoglycaemia", severity: "SAE", stage: "regulatory-reporting", owner: "NPvCC reviewer", awareAt: daysFromNow(-1), onsetAt: daysFromNow(-2) },
  { id: "AE-2026-031", studyId: "AIIA-RA-019", title: "Gastrointestinal symptom cluster · 6 cases", severity: "AE", stage: "signal-review", owner: "Signal review board", awareAt: daysFromNow(-1), onsetAt: daysFromNow(-2) },
  { id: "SAE-2026-009", studyId: "AIIA-PS-017", title: "Fracture after fall", severity: "SAE", stage: "closed", owner: "PI, Jaipur site", awareAt: daysFromNow(-10), onsetAt: daysFromNow(-11), reportedAt: daysFromNow(-9) },
];

const initialRisks: ComplianceRisk[] = [
  { id: "RISK-CTRI-024", studyId: "AIIA-OA-024", title: "CTRI outcome mismatch", detail: "Secondary outcome wording differs from approved protocol v3.2", owner: "Regulatory Operations", severity: "High", resolved: false },
  { id: "RISK-GCP-004", studyId: "AIIA-OA-024", title: "Expired GCP certificate", detail: "Site 04 · Investigator 07", owner: "Site lead", severity: "Medium", resolved: false },
  { id: "RISK-CONSENT-031", studyId: "AIIA-DM-031", title: "Consent form superseded", detail: "Current approved consent version is not filed", owner: "Document controller", severity: "Medium", resolved: false },
];

function buildMilestones(studies: WorkflowStudy[]): Milestone[] {
  return studies.flatMap((study) => [
    ...(study.ethicsExpiresOn ? [{ id: `${study.id}-ethics-renewal`, studyId: study.id, kind: "Ethics renewal" as const, dueOn: study.ethicsExpiresOn, ...(study.archived ? { doneOn: study.ethicsExpiresOn } : {}) }] : []),
    ...(study.plannedEnd ? [{ id: `${study.id}-close-out`, studyId: study.id, kind: "Close-out" as const, dueOn: study.plannedEnd, ...(study.archived ? { doneOn: study.plannedEnd } : {}) }] : []),
  ]);
}

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
  milestones: Milestone[];
  auditEntries: AuditEntry[];
  documents: DocumentRecord[];
  batches: InterventionBatch[];
  createStudy: (input: NewStudy) => Promise<string>;
  advanceStudy: (studyId: string) => Promise<{ ok: boolean; message: string }>;
  recordEnrollments: (studyId: string, count: number) => Promise<{ ok: boolean; message: string }>;
  recordVisits: (studyId: string, count: number) => Promise<{ ok: boolean; message: string }>;
  addSafetyCase: (input: Omit<WorkflowSafetyCase, "id" | "stage" | "owner">) => Promise<string>;
  updateSafetyCase: (caseId: string, changes: Partial<Omit<WorkflowSafetyCase, "id" | "studyId">>) => Promise<void>;
  advanceSafetyCase: (caseId: string) => Promise<void>;
  createRisk: (input: Omit<ComplianceRisk, "id" | "resolved">) => Promise<string>;
  resolveRisk: (riskId: string) => Promise<void>;
  reopenRisk: (riskId: string) => Promise<void>;
  submitDocument: (documentId: string) => Promise<void>;
  approveDocument: (documentId: string) => Promise<void>;
  reviseDocument: (documentId: string) => Promise<void>;
  recordAudit: (studyId: string, action: string, persist?: boolean) => Promise<void>;
  verifyAuditIntegrity: () => Promise<boolean>;
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
  { id: "BATCH-OA-01", studyId: "AIIA-OA-024", formulation: "Classical formulation", lotNo: "OA-24-001", manufacturer: "AIIA Pharmacy", coaStatus: "Verified", heavyMetalStatus: "Pass", microbialStatus: "Pass", testedOn: new Date().toISOString() },
  { id: "BATCH-RA-01", studyId: "AIIA-RA-019", formulation: "Integrative formulation", lotNo: "RA-19-004", manufacturer: "AIIA Pharmacy", coaStatus: "Pending", heavyMetalStatus: "Pending", microbialStatus: "Pass" },
];

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [studies, setStudies] = useState<WorkflowStudy[]>(initialStudies);
  const [usingOfflineData, setUsingOfflineData] = useState(false);
  const [demoClockOffsetHours, setDemoClockOffsetHours] = useState(0);
  const [safetyCases, setSafetyCases] = useState(initialSafetyCases);
  const [risks, setRisks] = useState(initialRisks);
  const [milestones, setMilestones] = useState<Milestone[]>(() => buildMilestones(initialStudies));
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const auditChainRef = useRef<AuditEntry[]>([]);
  const auditQueueRef = useRef<Promise<void>>(Promise.resolve());
  const auditFailedRef = useRef(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [batches] = useState<InterventionBatch[]>(initialBatches);
  useEffect(() => {
    let active = true;

    async function loadWorkflow() {
      try {
        const [studyData, safetyResult, riskResult, documentResult, auditResult] = await Promise.all([
          getStudies(),
          supabase.from("safety_cases").select("*"),
          supabase.from("compliance_items").select("*"),
          supabase.from("documents").select("*"),
          supabase.from("audit_events").select("*").eq("user_id", user?.id ?? "").order("event_order", { ascending: true }),
        ]);
        if (safetyResult.error) throw safetyResult.error;
        if (riskResult.error) throw riskResult.error;
        if (documentResult.error) throw documentResult.error;
        if (auditResult.error) throw auditResult.error;

        const mappedStudies: WorkflowStudy[] = (studyData || []).map((study: any) => ({
          id: study.study_code,
          title: study.title,
          phase: study.phase,
          status: study.status,
          enrolled: study.enrolled_participants ?? 0,
          target: study.target_participants ?? 0,
          activatedSites: study.activated_sites ?? 0,
          lead: study.lead || study.principal_investigator || "",
          stage: (study.stage || "protocol") as WorkflowStage,
          visitsComplete: study.visits_complete ?? 0,
          dataCompleteness: study.data_completeness ?? 0,
          archived: study.archived ?? false,
          startedOn: study.started_on ?? undefined,
          plannedEnd: study.planned_end ?? undefined,
          ethicsApprovedOn: study.ethics_approved_on ?? undefined,
          ethicsExpiresOn: study.ethics_expires_on ?? undefined,
          ctriRef: study.ctri_ref ?? undefined,
          ctriRegisteredOn: study.ctri_registered_on ?? undefined,
          rulePack: study.rule_pack ?? "academic-asu",
        }));

        const mappedCases: WorkflowSafetyCase[] = (safetyResult.data ?? []).map((row) => ({
          id: row.id,
          studyId: row.study_id,
          title: row.title,
          severity: row.severity,
          stage: row.stage,
          owner: row.owner,
          onsetAt: row.onset_at ?? undefined,
          awareAt: row.aware_at ?? undefined,
          reportedAt: row.reported_at ?? undefined,
          batchId: row.batch_id ?? undefined,
          causality: row.causality ?? undefined,
          prakriti: row.prakriti ?? undefined,
          concomitantMeds: row.concomitant_meds ?? [],
          interactionSuspected: row.interaction_suspected ?? false,
          meddraTerm: row.meddra_term ?? undefined,
          namasteCode: row.namaste_code ?? undefined,
        }));
        const mappedRisks: ComplianceRisk[] = (riskResult.data ?? []).map((row) => ({
          id: row.id,
          studyId: row.study_id,
          title: row.title,
          detail: row.detail,
          owner: row.owner,
          severity: row.severity,
          resolved: row.resolved,
        }));
        const mappedDocuments: DocumentRecord[] = (documentResult.data ?? []).map((row) => ({
          id: row.record_key ?? row.id,
          studyId: row.study_id,
          title: row.title,
          version: row.version,
          status: row.status,
          owner: row.owner,
          updatedAt: row.updated_at,
        }));
        const mappedAudit: AuditEntry[] = (auditResult.data ?? []).map((row) => ({
          id: row.id,
          studyId: row.study_id ?? "",
          action: row.action,
          actor: row.metadata?.actor ?? "Research Operations",
          timestamp: row.metadata?.timestamp ?? new Date(row.created_at).toISOString(),
          prevHash: row.prev_hash ?? undefined,
          hash: row.hash ?? undefined,
          eventOrder: row.event_order ?? undefined,
        }));
        mappedAudit.sort((left, right) => (left.eventOrder ?? Number.MAX_SAFE_INTEGER) - (right.eventOrder ?? Number.MAX_SAFE_INTEGER) || new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

        if (!active) return;
        setSafetyCases([...new Map([...initialSafetyCases, ...mappedCases].map((item) => [item.id, item])).values()]);
        setRisks([...new Map([...initialRisks, ...mappedRisks].map((item) => [item.id, item])).values()]);
        setDocuments([...new Map([...initialDocuments, ...mappedDocuments].map((item) => [item.id, item])).values()]);
        auditChainRef.current = mappedAudit;
        auditFailedRef.current = false;
        setAuditEntries([...mappedAudit].reverse());

        if (mappedStudies.length > 0) {
          setStudies(mappedStudies);
          setMilestones(buildMilestones(mappedStudies));
          setUsingOfflineData(false);
        } else {
          setUsingOfflineData(true);
        }
      } catch (error) {
        console.error("Failed to load studies:", error);
        if (active) setUsingOfflineData(true);
      }
    }

    void loadWorkflow();
    return () => { active = false; };
  }, [user?.id]);

  const recordAudit = (studyId: string, action: string, persist = true) => {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const queued = auditQueueRef.current.then(async () => {
      const previousHash = auditChainRef.current.at(-1)?.hash;
      const entry: AuditEntry = { id, studyId, action, actor: "Research Operations", timestamp, prevHash: previousHash };
      const hash = await hashAuditEntry(entry);
      let eventOrder: number | undefined;
      if (persist) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData.user) throw new Error("Authentication is required to save audit events.");
        const { data: savedEvent, error } = await supabase.from("audit_events").insert({
          id,
          user_id: userData.user.id,
          study_id: studyId || null,
          action,
          resource_type: "workflow",
          resource_id: null,
          metadata: { actor: entry.actor, timestamp, chain_sequence: auditChainRef.current.length },
          prev_hash: previousHash ?? null,
          hash,
          created_at: timestamp,
        }).select("event_order").single();
        if (error) throw error;
        eventOrder = savedEvent.event_order;
      } else {
        auditFailedRef.current = false;
      }
      const finalized = { ...entry, hash, ...(eventOrder === undefined ? {} : { eventOrder }) };
      auditChainRef.current = [...auditChainRef.current, finalized];
      setAuditEntries([...auditChainRef.current].reverse());
    });
    auditQueueRef.current = queued.catch(() => { auditFailedRef.current = true; });
    return queued;
  };

  const verifyAuditIntegrity = async () => {
    await auditQueueRef.current;
    if (auditFailedRef.current) return false;
    let previousHash = "";
    for (const entry of auditChainRef.current) {
      if (entry.prevHash !== (previousHash || undefined) || !entry.hash || await hashAuditEntry(entry) !== entry.hash) return false;
      previousHash = entry.hash;
    }
    return true;
  };

 const createStudy = async (input: NewStudy) => {
 const studyCode = `AIIA-NEW-${Date.now()}`;
  const draftStudy: WorkflowStudy = {
    id: studyCode,
    title: input.title,
    phase: input.phase,
    status: "Protocol",
    enrolled: 0,
    target: input.target,
    activatedSites: 0,
    lead: input.lead,
    stage: "protocol",
    visitsComplete: 0,
    dataCompleteness: 0,
    archived: false,
    rulePack: input.rulePack ?? "academic-asu",
  };
  const initialRisk = computeRisk(draftStudy, safetyCases, milestones, risks);

  const { data, error } = await supabase
    .from("studies")
    .insert({
      study_code: studyCode,
      title: input.title,
      phase: input.phase,
      status: "Protocol",
      risk: initialRisk.level,
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
      rule_pack: input.rulePack ?? "academic-asu",
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
    enrolled: data.enrolled_participants,
    target: data.target_participants,
    activatedSites: data.activated_sites,
    lead: data.lead || data.principal_investigator,
    stage: data.stage as WorkflowStage,
    visitsComplete: data.visits_complete,
    dataCompleteness: data.data_completeness ?? 0,
    archived: data.archived,
    rulePack: input.rulePack ?? "academic-asu",
  };

  setStudies((items) => [...items, newStudy]);

  await recordAudit(data.study_code, "Draft protocol workspace created").catch((error) => console.error("Failed to persist audit event:", error));

  return data.study_code;
};

  const advanceStudy = async (studyId: string) => {
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
    const { error } = await supabase.rpc("persist_study_workflow", { p_study_code: studyId, p_operation: "advance", p_expected_stage: study.stage, p_next_stage: next });
    if (error) throw error;
    setStudies((items) => items.map((item) => item.id === studyId ? { ...item, stage: next, status: stageStatus(next), activatedSites: next === "recruitment" ? Math.max(item.activatedSites, 1) : item.activatedSites, archived: next === "closed" } : item));
    if (next === "closed") setMilestones((items) => items.map((milestone) => milestone.studyId === studyId ? { ...milestone, doneOn: new Date().toISOString() } : milestone));
    await recordAudit(studyId, `${stageStatus(study.stage)} completed; advanced to ${stageStatus(next)}`).catch((error) => console.error("Failed to persist audit event:", error));
    return { ok: true, message: `Study advanced to ${stageStatus(next)}.` };
  };

  const recordEnrollments = async (studyId: string, count: number) => {
    const study = studies.find((item) => item.id === studyId);
    if (!study || study.stage !== "recruitment") return { ok: false, message: "Enrollment is only available during recruitment." };
    const accepted = Math.min(Math.max(1, Math.floor(count)), study.target - study.enrolled);
    if (accepted <= 0) return { ok: false, message: "The enrollment target has already been reached." };
    const recorded = accepted;
    setStudies((items) => items.map((item) => item.id === studyId ? { ...item, enrolled: item.enrolled + recorded } : item));
    await recordAudit(studyId, `${recorded} participant${recorded === 1 ? "" : "s"} enrolled`, false);
    return { ok: true, message: `${recorded} participant${recorded === 1 ? "" : "s"} recorded.` };
  };

  const recordVisits = async (studyId: string, count: number) => {
    const study = studies.find((item) => item.id === studyId);
    if (!study || study.stage !== "follow-up") return { ok: false, message: "Visits can only be completed during follow-up." };
    const accepted = Math.min(Math.max(1, Math.floor(count)), study.enrolled - study.visitsComplete);
    if (accepted <= 0) return { ok: false, message: "All participant follow-up visits are complete." };
    const { data, error } = await supabase.rpc("persist_study_workflow", { p_study_code: studyId, p_operation: "visits", p_amount: accepted });
    if (error) throw error;
    const recorded = Number(data ?? accepted);
    setStudies((items) => items.map((item) => item.id === studyId ? { ...item, visitsComplete: item.visitsComplete + recorded } : item));
    await recordAudit(studyId, `${recorded} follow-up visit${recorded === 1 ? "" : "s"} completed`).catch((auditError) => console.error("Failed to persist audit event:", auditError));
    return { ok: true, message: `${recorded} follow-up visit${recorded === 1 ? "" : "s"} recorded.` };
  };

  const saveSafetyCase = async (item: WorkflowSafetyCase, persist = true) => {
    if (!persist) return;
    const { error } = await supabase.from("safety_cases").upsert({
      id: item.id,
      study_id: item.studyId,
      title: item.title,
      severity: item.severity,
      stage: item.stage,
      owner: item.owner,
      onset_at: item.onsetAt ?? null,
      aware_at: item.awareAt ?? null,
      reported_at: item.reportedAt ?? null,
      batch_id: item.batchId ?? null,
      causality: item.causality ?? null,
      prakriti: item.prakriti ?? null,
      concomitant_meds: item.concomitantMeds ?? [],
      interaction_suspected: item.interactionSuspected ?? false,
      meddra_term: item.meddraTerm ?? null,
      namaste_code: item.namasteCode ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) throw error;
  };

  const addSafetyCase = async (input: Omit<WorkflowSafetyCase, "id" | "stage" | "owner">) => {
    const number = safetyCases.length + 1;
    const id = `${input.severity}-${new Date().getFullYear()}-${String(number).padStart(3, "0")}`;
    const awareAt = input.awareAt ?? new Date(Date.now() + demoClockOffsetHours * 60 * 60 * 1000).toISOString();
    const newCase: WorkflowSafetyCase = { ...input, awareAt, id, stage: "reported", owner: "Safety physician" };
    await saveSafetyCase(newCase);
    setSafetyCases((items) => [newCase, ...items.filter((item) => item.id !== id)]);
    await recordAudit(input.studyId, `${input.severity} ${id} reported`).catch((error) => console.error("Failed to persist audit event:", error));
    return id;
  };

  const updateSafetyCase = async (caseId: string, changes: Partial<Omit<WorkflowSafetyCase, "id" | "studyId">>) => {
    const current = safetyCases.find((item) => item.id === caseId);
    if (!current) return;
    const updated = { ...current, ...changes };
    await saveSafetyCase(updated);
    setSafetyCases((items) => items.map((item) => item.id === caseId ? updated : item));
    await recordAudit(current.studyId, `Safety case updated: ${caseId}`).catch((error) => console.error("Failed to persist audit event:", error));
  };

  const advanceSafetyCase = async (caseId: string) => {
    const current = safetyCases.find((item) => item.id === caseId);
    const next = current && nextSafetyStage[current.stage];
    if (!current || !next) return;
    const updated = { ...current, stage: next };
    await saveSafetyCase(updated, false);
    setSafetyCases((items) => items.map((item) => item.id === caseId ? updated : item));
    await recordAudit(current.studyId, `${caseId} advanced to ${next.replaceAll("-", " ")}`, false);
  };

  const saveRisk = async (risk: ComplianceRisk, persist = true) => {
    if (!persist) return;
    const { error } = await supabase.from("compliance_items").upsert({
      id: risk.id,
      study_id: risk.studyId,
      title: risk.title,
      detail: risk.detail,
      owner: risk.owner,
      severity: risk.severity,
      resolved: risk.resolved,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) throw error;
  };

  const createRisk = async (input: Omit<ComplianceRisk, "id" | "resolved">) => {
    const risk: ComplianceRisk = { ...input, id: `RISK-${crypto.randomUUID()}`, resolved: false };
    await saveRisk(risk);
    setRisks((items) => [risk, ...items]);
    await recordAudit(risk.studyId, `Compliance item created: ${risk.title}`).catch((error) => console.error("Failed to persist audit event:", error));
    return risk.id;
  };

  const resolveRisk = async (riskId: string) => {
    const risk = risks.find((item) => item.id === riskId);
    if (!risk || risk.resolved) return;
    const updated = { ...risk, resolved: true };
    await saveRisk(updated, false);
    setRisks((items) => items.map((item) => item.id === riskId ? updated : item));
    await recordAudit(risk.studyId, `Compliance item resolved: ${risk.title}`, false);
  };

  const reopenRisk = async (riskId: string) => {
    const risk = risks.find((item) => item.id === riskId);
    if (!risk || !risk.resolved) return;
    const updated = { ...risk, resolved: false };
    await saveRisk(updated);
    setRisks((items) => items.map((item) => item.id === riskId ? updated : item));
    await recordAudit(risk.studyId, `Compliance item reopened: ${risk.title}`).catch((error) => console.error("Failed to persist audit event:", error));
  };

  const saveDocument = async (document: DocumentRecord) => {
    const { error } = await supabase.from("documents").upsert({
      record_key: document.id,
      study_id: document.studyId,
      title: document.title,
      version: document.version,
      status: document.status,
      owner: document.owner,
      updated_at: document.updatedAt,
    }, { onConflict: "record_key" });
    if (error) throw error;
  };

  const submitDocument = async (documentId: string) => {
    const document = documents.find((item) => item.id === documentId);
    if (!document || document.status !== "Draft") return;
    const updated = { ...document, status: "In review" as const, updatedAt: new Date().toISOString() };
    await saveDocument(updated);
    setDocuments((items) => items.map((item) => item.id === documentId ? updated : item));
    await recordAudit(document.studyId, `Document submitted: ${document.title} v${document.version}`).catch((error) => console.error("Failed to persist audit event:", error));
  };

  const approveDocument = async (documentId: string) => {
    const document = documents.find((item) => item.id === documentId);
    if (!document || document.status !== "In review") return;
    const updated = { ...document, status: "Approved" as const, updatedAt: new Date().toISOString() };
    await saveDocument(updated);
    setDocuments((items) => items.map((item) => item.id === documentId ? updated : item));
    await recordAudit(document.studyId, `Document approved: ${document.title} v${document.version}`).catch((error) => console.error("Failed to persist audit event:", error));
  };

  const reviseDocument = async (documentId: string) => {
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;
    const revised: DocumentRecord = { ...document, id: `${document.id}-v${document.version + 1}`, version: document.version + 1, status: "Draft", updatedAt: new Date().toISOString() };
    const superseded = { ...document, status: "Superseded" as const };
    const { error } = await supabase.from("documents").upsert([
      { record_key: superseded.id, study_id: superseded.studyId, title: superseded.title, version: superseded.version, status: superseded.status, owner: superseded.owner, updated_at: superseded.updatedAt },
      { record_key: revised.id, study_id: revised.studyId, title: revised.title, version: revised.version, status: revised.status, owner: revised.owner, updated_at: revised.updatedAt },
    ], { onConflict: "record_key" });
    if (error) throw error;
    setDocuments((items) => [...items.map((item) => item.id === documentId ? superseded : item), revised]);
    await recordAudit(document.studyId, `Document revised: ${document.title} v${revised.version}`).catch((auditError) => console.error("Failed to persist audit event:", auditError));
  };

  const value: WorkflowState = {
    studies,
    usingOfflineData,
    demoClockOffsetHours,
    setDemoClockOffsetHours,
    safetyCases,
    risks,
    milestones,
    auditEntries,
    documents,
    batches,
    createStudy,
    advanceStudy,
    recordEnrollments,
    recordVisits,
    addSafetyCase,
    updateSafetyCase,
    advanceSafetyCase,
    createRisk,
    resolveRisk,
    reopenRisk,
    submitDocument,
    approveDocument,
    reviseDocument,
    recordAudit,
    verifyAuditIntegrity,
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
