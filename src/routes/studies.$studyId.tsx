import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Clock3, FileText, MoreHorizontal, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PlatformHeader, ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentStageIndex, getStudyProgress, useWorkflow, workflowStages, type WorkflowStudy, type WorkflowSafetyCase, type ComplianceRisk, type AuditEntry } from "@/components/workflow-state";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";

export const Route = createFileRoute("/studies/$studyId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.studyId} — AIIA TrialShield` },
      { name: "description", content: "Clinical study workspace and evidence trail." },
      { property: "og:title", content: `${params.studyId} — AIIA TrialShield` },
      { property: "og:description", content: "Clinical study workspace and evidence trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthGuard roles={["ADMIN", "PI", "CRC", "SAFETY_OFFICER", "COMPLIANCE_OFFICER", "DATA_MANAGER"]}><StudyDetail /></AuthGuard>,
});

const tabs = ["Overview", "Participants", "Visits", "Safety", "Compliance", "Documents", "Audit Trail"];

function StudyDetail() {
  const { studyId } = Route.useParams();
  const [tab, setTab] = useState("Overview");
  const [enrollmentBatch, setEnrollmentBatch] = useState(10);
  const [visitBatch, setVisitBatch] = useState(10);
  const workflow = useWorkflow();
  const { role } = useAuth();
  const study = workflow.getStudy(studyId);
  const stageIndex = study ? getCurrentStageIndex(study.stage) : 0;
  const enrolledPercent = study ? getStudyProgress(study) : 0;
  const studyRisks = workflow.risks.filter((risk) => risk.studyId === studyId && !risk.resolved);
  const openSaes = workflow.getOpenSaes(studyId);
  const studyCases = workflow.safetyCases.filter((item) => item.studyId === studyId);
  const studyAudit = workflow.auditEntries.filter((item) => item.studyId === studyId);
  const allStudyRisks = workflow.risks.filter((risk) => risk.studyId === studyId);

  if (!study) return <div className="min-h-screen bg-background"><PlatformHeader /><main className="mx-auto max-w-3xl px-4 py-16"><h1 className="font-display text-2xl font-semibold">Study not found</h1><p className="mt-2 text-sm text-muted-foreground">This study is not available in the current workspace.</p><Link to="/studies" className="mt-5 inline-flex text-sm font-medium text-secondary">Return to studies</Link></main></div>;

  const moveToNextStage = () => {
    const result = workflow.advanceStudy(studyId);
    if (result.ok) toast.success(result.message);
    else toast.warning(result.message);
  };

  const recordEnrollment = () => {
    const result = workflow.recordEnrollments(studyId, enrollmentBatch);
    if (result.ok) toast.success(result.message);
    else toast.warning(result.message);
  };

  const recordVisits = () => {
    const result = workflow.recordVisits(studyId, visitBatch);
    if (result.ok) toast.success(result.message);
    else toast.warning(result.message);
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader />
      <main className="mx-auto max-w-[1480px] px-4 py-7 lg:px-8">
        <Link to="/studies" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />All studies
        </Link>
        <div className="mt-5 grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-secondary">{studyId}</span>
              <StatusPill tone={study.stage === "closed" ? "neutral" : study.stage === "recruitment" ? "good" : "warn"}>{study.status}</StatusPill>
              <StatusPill tone={study.risk === "High" ? "risk" : study.risk === "Moderate" ? "warn" : "good"}>{study.risk} risk</StatusPill>
            </div>
            <h1 className="mt-3 max-w-4xl font-display text-2xl font-semibold leading-tight sm:text-3xl">{study.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{study.phase} · Principal Investigator: {study.lead} · {study.activatedSites} active sites</p>
          </div>
          <Button variant="secondary" onClick={() => setTab("Audit Trail")}>
            <MoreHorizontal className="size-4" />Study activity
          </Button>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[["Ethics status", stageIndex > 1 ? "Approved" : "Pending", stageIndex > 1 ? "IEC approval recorded" : "Protocol review required"], ["CTRI readiness", stageIndex > 2 ? "Registered" : "Pending", stageIndex > 2 ? "Prospective registration recorded" : "Register before site activation"], ["Recruitment", `${study.enrolled} / ${study.target}`, `${enrolledPercent}% of target`], ["Safety", `${workflow.getOpenSaes(studyId)} open SAEs`, "Resolve before database lock"]].map(([label, value, detail], index) => (
            <div key={label} className="bg-surface p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <div className="mt-3 flex items-center gap-2">
                {index === 0 ? <CheckCircle2 className="size-4 text-positive" /> : index === 1 || index === 3 ? <CircleAlert className="size-4 text-risk" /> : <UserRound className="size-4 text-secondary" />}
                <strong className="text-sm">{value}</strong>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
              {index === 2 && <div className="mt-3"><ProgressBar value={enrolledPercent} /></div>}
            </div>
          ))}
        </div>
        <div className="mt-7 overflow-x-auto border-b border-border">
          <div className="flex min-w-max gap-7">
            {tabs.map((item) => <Button key={item} variant="ghost" onClick={() => setTab(item)} className={`h-11 rounded-none border-b-2 px-0 text-xs ${tab === item ? "border-secondary text-primary" : "border-transparent"}`}>{item}</Button>)}
          </div>
        </div>
        <div className="mt-7">
          {tab === "Overview" ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
            <section className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Study journey</p><h2 className="mt-1 font-display text-xl font-semibold">Current workflow</h2></div>
                <StatusPill tone={study.stage === "closed" ? "good" : "warn"}>{study.status}</StatusPill>
              </div>
              <div className="mt-7"><Timeline items={workflowStages.map((stage, index) => ({ title: stage.label, detail: index < stageIndex ? "Milestone recorded in this demo session" : index === stageIndex ? "Current stage" : "Pending prerequisite", time: index < stageIndex ? "Done" : index === stageIndex ? "Now" : "Next", ...(index < stageIndex ? { state: "done" as const } : index === stageIndex ? { state: "current" as const } : {}) }))} /></div>
              <section className="mt-2 rounded-md border border-secondary/20 bg-secondary/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">Next required action</p>
                <h3 className="mt-1 font-display text-base font-semibold">{study.stage === "protocol" ? "Submit protocol for IEC review" : study.stage === "ethics" ? "Record IEC approval" : study.stage === "ctri" ? "Record prospective CTRI registration" : study.stage === "sites" ? "Activate the first study site" : study.stage === "recruitment" ? study.enrolled < study.target ? "Record participant enrollment" : "Begin follow-up" : study.stage === "follow-up" ? study.visitsComplete < study.enrolled ? "Complete outstanding follow-up visits" : "Submit study for close-out" : study.stage === "close-out" ? "Lock database and close study" : "Study lifecycle complete"}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Each transition is recorded in the session audit trail. Gates prevent moving forward before enrollment, visits, or safety cases are addressed.</p>
                {study.stage === "recruitment" && study.enrolled < study.target ? <div className="mt-4 flex flex-wrap items-end gap-2"><label className="text-xs font-medium">Participants to record<Input type="number" min={1} max={study.target - study.enrolled} value={enrollmentBatch} onChange={(event) => setEnrollmentBatch(Number(event.target.value))} className="mt-1 w-28" /></label><Button disabled={!can(role, "enrollment:update")} onClick={recordEnrollment}>Record enrollment</Button></div> : study.stage === "follow-up" && study.visitsComplete < study.enrolled ? <div className="mt-4 flex flex-wrap items-end gap-2"><label className="text-xs font-medium">Visits to complete<Input type="number" min={1} max={study.enrolled - study.visitsComplete} value={visitBatch} onChange={(event) => setVisitBatch(Number(event.target.value))} className="mt-1 w-28" /></label><Button disabled={!can(role, "visits:update")} onClick={recordVisits}>Record visits</Button></div> : study.stage !== "closed" && <Button className="mt-4" disabled={!can(role, "studies:update") || (study.stage === "close-out" && openSaes > 0)} onClick={moveToNextStage}>{study.stage === "protocol" ? "Submit to IEC" : study.stage === "ethics" ? "Record IEC approval" : study.stage === "ctri" ? "Register on CTRI" : study.stage === "sites" ? "Activate site" : study.stage === "recruitment" ? "Begin follow-up" : study.stage === "follow-up" ? "Start close-out" : "Lock and close"}</Button>}
                {study.stage === "close-out" && openSaes > 0 && <p className="mt-2 text-xs text-risk">Resolve {openSaes} open SAE {openSaes === 1 ? "case" : "cases"} before database lock.</p>}
              </section>
            </section>
            <aside className="space-y-6">
              <section className="rounded-lg border border-risk/20 bg-risk/5 p-5">
                <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-risk" /><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Study oversight</p><h2 className="mt-2 font-display text-lg font-semibold">{studyRisks.length + openSaes} open items</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{studyRisks[0]?.detail ?? (openSaes > 0 ? `${openSaes} open SAE cases require review before close-out.` : "No open safety or compliance items are recorded for this study.")}</p></div></div>
                <div className="mt-5 border-t border-risk/15 pt-4"><p className="text-xs text-muted-foreground">Accountable owner</p><p className="mt-1 text-sm font-semibold">{study.lead}</p></div>
                <Button className="mt-5 w-full" onClick={() => setTab(studyRisks.length ? "Compliance" : "Safety")}>Review open items</Button>
              </section>
              <section className="rounded-lg border border-border bg-surface p-5"><FileText className="size-5 text-secondary" /><h2 className="mt-4 text-sm font-semibold">Study record</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Enrollment target {study.target} · {study.activatedSites} active sites · {study.visitsComplete} of {study.enrolled} follow-up visits complete.</p></section>
            </aside>
          </div> : <StudyTabPanel tab={tab} study={study} safetyCases={studyCases} risks={allStudyRisks} auditEntries={studyAudit} onRecordEnrollments={workflow.recordEnrollments} onRecordVisits={workflow.recordVisits} onAdvanceSafetyCase={workflow.advanceSafetyCase} onResolveRisk={workflow.resolveRisk} />}
        </div>
      </main>
    </div>
  );
}

function StudyTabPanel({ tab, study, safetyCases, risks, auditEntries, onRecordEnrollments, onRecordVisits, onAdvanceSafetyCase, onResolveRisk }: {
  tab: string;
  study: WorkflowStudy;
  safetyCases: WorkflowSafetyCase[];
  risks: ComplianceRisk[];
  auditEntries: AuditEntry[];
  onRecordEnrollments: (studyId: string, count: number) => { ok: boolean; message: string };
  onRecordVisits: (studyId: string, count: number) => { ok: boolean; message: string };
  onAdvanceSafetyCase: (caseId: string) => void;
  onResolveRisk: (riskId: string) => void;
}) {
  const [batch, setBatch] = useState(10);
  const { role } = useAuth();
  const stageIndex = getCurrentStageIndex(study.stage);
  const reportResult = (result: { ok: boolean; message: string }) => result.ok ? toast.success(result.message) : toast.warning(result.message);
  const stageLabels: Record<WorkflowSafetyCase["stage"], string> = {
    reported: "Reported",
    "medical-review": "Medical review",
    "regulatory-reporting": "Regulatory reporting",
    "follow-up": "Follow-up",
    "ready-to-close": "Ready to close",
    "signal-review": "Signal review",
    closed: "Closed",
  };

  if (tab === "Participants") return <section className="rounded-lg border border-border bg-surface p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Enrollment</p><h2 className="mt-1 font-display text-xl font-semibold">{study.enrolled} of {study.target} participants</h2><p className="mt-1 text-sm text-muted-foreground">Enrollment is recorded in batches and linked to this study's session audit trail.</p></div><StatusPill tone={study.stage === "recruitment" ? "good" : "neutral"}>{study.stage === "recruitment" ? "Recruiting" : "Recruitment stage complete"}</StatusPill></div>
    <div className="mt-6"><ProgressBar value={getStudyProgress(study)} /></div>
    {study.stage === "recruitment" && study.enrolled < study.target ? <div className="mt-6 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Participants to enroll<Input type="number" min={1} max={study.target - study.enrolled} value={batch} onChange={(event) => setBatch(Number(event.target.value))} className="mt-1 w-32" /></label><Button disabled={!can(role, "enrollment:update")} onClick={() => reportResult(onRecordEnrollments(study.id, batch))}>Record enrollment</Button></div> : <p className="mt-5 text-sm text-muted-foreground">To enter recruitment, complete protocol, ethics, CTRI registration, and site activation in Overview.</p>}
    <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">Participant-level identifiers are intentionally not included in this workflow.</div>
  </section>;

  if (tab === "Visits") return <section className="rounded-lg border border-border bg-surface p-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Visit schedule</p><h2 className="mt-1 font-display text-xl font-semibold">{study.visitsComplete} of {study.enrolled} follow-up visits complete</h2><p className="mt-1 text-sm text-muted-foreground">Record completed follow-up visits in batches. Close-out is gated until enrolled participants have completed follow-up.</p>
    <div className="mt-6"><ProgressBar value={study.enrolled ? Math.round(study.visitsComplete / study.enrolled * 100) : 0} /></div>
    {study.stage === "follow-up" && study.visitsComplete < study.enrolled ? <div className="mt-6 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Visits completed<Input type="number" min={1} max={study.enrolled - study.visitsComplete} value={batch} onChange={(event) => setBatch(Number(event.target.value))} className="mt-1 w-32" /></label><Button disabled={!can(role, "visits:update")} onClick={() => reportResult(onRecordVisits(study.id, batch))}>Record visits</Button></div> : <p className="mt-5 text-sm text-muted-foreground">Visit entry becomes available when this study reaches follow-up.</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Screening", "Eligibility and consent"], ["Intervention", "Protocol visit window"], ["Follow-up", "Outcome and safety review"]].map(([visit, detail]) => <article key={visit} className="border-l-2 border-secondary bg-muted/30 px-4 py-3"><h3 className="text-sm font-semibold">{visit}</h3><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>)}</div>
  </section>;

  if (tab === "Safety") return <section className="rounded-lg border border-border bg-surface p-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Pharmacovigilance</p><h2 className="mt-1 font-display text-xl font-semibold">Study safety cases</h2></div><StatusPill tone="risk">{safetyCases.filter((item) => item.severity === "SAE" && item.stage !== "closed").length} open SAEs</StatusPill></div>
    {safetyCases.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No safety cases are recorded for this study.</p> : <div className="divide-y divide-border">{safetyCases.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.id} · {item.title}</strong><StatusPill tone={item.severity === "SAE" ? "risk" : "warn"}>{item.severity}</StatusPill></div><p className="mt-1 text-xs text-muted-foreground">{stageLabels[item.stage]} · Owner: {item.owner} · Due: {item.due}</p></div>{item.stage !== "closed" && <Button disabled={!can(role, "safety:update")} size="sm" variant="secondary" onClick={() => onAdvanceSafetyCase(item.id)}>{item.stage === "reported" ? "Start medical review" : item.stage === "medical-review" ? "Submit regulatory report" : item.stage === "regulatory-reporting" ? "Request follow-up" : item.stage === "follow-up" ? "Confirm follow-up" : item.stage === "ready-to-close" ? "Close case" : "Submit signal"}<ArrowRight className="size-3.5" /></Button>}</article>)}</div>}
  </section>;

  if (tab === "Compliance") return <section className="rounded-lg border border-border bg-surface p-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Ethics and regulatory</p><h2 className="mt-1 font-display text-xl font-semibold">Compliance actions</h2><p className="mt-1 text-sm text-muted-foreground">Resolve each evidence gap before the corresponding milestone is considered inspection-ready.</p>
    <div className="mt-5 divide-y divide-border">{risks.map((risk) => <article key={risk.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{risk.title}</h3><StatusPill tone={risk.resolved ? "good" : risk.severity === "High" ? "risk" : "warn"}>{risk.resolved ? "Resolved" : risk.severity}</StatusPill></div><p className="mt-1 text-xs text-muted-foreground">{risk.detail} · Owner: {risk.owner}</p></div>{!risk.resolved && <Button disabled={!can(role, "compliance:update")} size="sm" variant="secondary" onClick={() => { onResolveRisk(risk.id); toast.success(`${risk.title} resolved in this demo session.`); }}>Resolve item</Button>}</article>)}</div>
    {risks.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No compliance items have been recorded for this study.</p>}
  </section>;

  if (tab === "Audit Trail") return <section className="rounded-lg border border-border bg-surface p-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Session audit trail</p><h2 className="mt-1 font-display text-xl font-semibold">Recorded workflow actions</h2><p className="mt-1 text-sm text-muted-foreground">Append-only for this browser session; refreshing the demo clears this session history.</p>
    {auditEntries.length === 0 ? <p className="mt-6 rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">No actions recorded yet. Workflow stage changes, enrollment, visits, safety updates, and compliance resolutions will appear here.</p> : <div className="mt-6"><Timeline items={auditEntries.map((entry) => ({ title: entry.action, detail: `${entry.actor} · ${entry.studyId}`, time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), state: "done" as const }))} /></div>}
  </section>;

  return <section className="rounded-lg border border-border bg-surface p-6">
    <div className="flex items-center gap-3"><FileText className="size-5 text-secondary" /><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Controlled documents</p><h2 className="mt-1 font-display text-xl font-semibold">Study document checklist</h2></div></div>
    <div className="mt-6 divide-y divide-border">{[["Protocol and amendments", stageIndex > 0 ? "Ready for review" : "Draft required"], ["IEC approval letter", stageIndex > 1 ? "Recorded" : "Pending"], ["CTRI registration record", stageIndex > 2 ? "Recorded" : "Pending"], ["Site delegation and training", stageIndex > 3 ? "Site activated" : "Pending activation"], ["Consent and visit source records", study.enrolled > 0 ? "Collection in progress" : "Pending first participant"]].map(([document, status]) => <div key={document} className="flex items-center justify-between gap-4 py-4"><span className="text-sm font-medium">{document}</span><StatusPill tone={status === "Recorded" || status === "Ready for review" || status === "Site activated" ? "good" : "neutral"}>{status}</StatusPill></div>)}</div>
  </section>;
}