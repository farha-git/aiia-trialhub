import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  MoreHorizontal,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PlatformHeader, ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  getCurrentStageIndex,
  getStudyProgress,
  useWorkflow,
  workflowStages,
  type WorkflowStudy,
  type WorkflowSafetyCase,
  type ComplianceRisk,
  type AuditEntry,
  type DocumentRecord,
  type ConsentRecord,
} from "@/components/workflow-state";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { computeRisk } from "@/lib/risk";
import { calculateDeadline } from "@/lib/deadlines";
import { rulePacks } from "@/lib/rule-packs";
import { useNow } from "@/hooks/use-now";

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
  component: () => (
    <AuthGuard
      roles={[
        "ADMIN",
        "PI",
        "CRC",
        "SAFETY_OFFICER",
        "COMPLIANCE_OFFICER",
        "DATA_MANAGER",
        "REGULATOR",
      ]}
    >
      <StudyDetail />
    </AuthGuard>
  ),
});

const tabs = [
  "Overview",
  "Participants",
  "Visits",
  "Safety",
  "Compliance",
  "Documents",
  "Audit Trail",
];

function StudyDetail() {
  const { studyId } = Route.useParams();
  const [tab, setTab] = useState("Overview");
  const [enrollmentBatch, setEnrollmentBatch] = useState(10);
  const [visitBatch, setVisitBatch] = useState(10);
  const workflow = useWorkflow();
  const now = useNow();
  const currentTime = new Date(now.getTime() + workflow.demoClockOffsetHours * 60 * 60 * 1000);
  const { profile } = useAuth();
  const role = profile?.role;
  const study = workflow.getStudy(studyId);
  const stageIndex = study ? getCurrentStageIndex(study.stage) : 0;
  const enrolledPercent = study ? getStudyProgress(study) : 0;
  const studyRisks = workflow.risks.filter((risk) => risk.studyId === studyId && !risk.resolved);
  const openSaes = workflow.getOpenSaes(studyId);
  const studyCases = workflow.safetyCases.filter((item) => item.studyId === studyId);
  const studyAudit = workflow.auditEntries.filter((item) => item.studyId === studyId);
  const allStudyRisks = workflow.risks.filter((risk) => risk.studyId === studyId);
  const studyDocuments = workflow.documents.filter((document) => document.studyId === studyId);
  const computedRisk = study
    ? computeRisk(study, workflow.safetyCases, workflow.milestones, workflow.risks, currentTime)
    : null;
  const [integrity, setIntegrity] = useState<"pass" | "fail" | null>(null);

  if (!study)
    return (
      <div className="min-h-screen bg-background">
        <PlatformHeader />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="font-display text-2xl font-semibold">Study not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This study is not available in the current workspace.
          </p>
          <Link to="/studies" className="mt-5 inline-flex text-sm font-medium text-secondary">
            Return to studies
          </Link>
        </main>
      </div>
    );

  const moveToNextStage = async () => {
    if (!can(role, "studies:update")) return;
    try {
      const result = await workflow.advanceStudy(studyId);
      if (result.ok) toast.success(result.message);
      else toast.warning(result.message);
    } catch (error) {
      console.error("Failed to persist study stage:", error);
      toast.error("Failed to update study.");
    }
  };

  const recordEnrollment = async () => {
    if (!can(role, "enrollment:update")) return;
    try {
      const result = await workflow.recordEnrollments(studyId, enrollmentBatch);
      if (result.ok) toast.success(result.message);
      else toast.warning(result.message);
    } catch (error) {
      console.error("Failed to persist enrollment:", error);
      toast.error("Failed to record enrollment.");
    }
  };

  const recordVisits = async () => {
    if (!can(role, "visits:update")) return;
    try {
      const result = await workflow.recordVisits(studyId, visitBatch);
      if (result.ok) toast.success(result.message);
      else toast.warning(result.message);
    } catch (error) {
      console.error("Failed to persist visits:", error);
      toast.error("Failed to record visits.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader />
      <main className="mx-auto max-w-[1480px] px-4 py-7 lg:px-8">
        <Link
          to="/studies"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All studies
        </Link>
        <div className="mt-5 grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-secondary">{studyId}</span>
              <StatusPill
                tone={
                  study.stage === "closed"
                    ? "neutral"
                    : study.stage === "recruitment"
                      ? "good"
                      : "warn"
                }
              >
                {study.status}
              </StatusPill>
              <StatusPill
                tone={
                  computedRisk?.level === "High"
                    ? "risk"
                    : computedRisk?.level === "Moderate"
                      ? "warn"
                      : "good"
                }
              >
                {computedRisk?.level ?? "Low"} risk · {computedRisk?.score ?? 0}
              </StatusPill>
            </div>
            <h1 className="mt-3 max-w-4xl font-display text-2xl font-semibold leading-tight sm:text-3xl">
              {study.title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {study.phase} · Principal Investigator: {study.lead} · {study.activatedSites} active
              sites
            </p>
          </div>
          <Button variant="secondary" onClick={() => setTab("Audit Trail")}>
            <MoreHorizontal className="size-4" />
            Study activity
          </Button>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Ethics status",
              stageIndex > 1 ? "Approved" : "Pending",
              stageIndex > 1 ? "IEC approval recorded" : "Protocol review required",
            ],
            [
              "CTRI readiness",
              stageIndex > 2 ? "Registered" : "Pending",
              stageIndex > 2
                ? "Prospective registration recorded"
                : "Register before site activation",
            ],
            ["Recruitment", `${study.enrolled} / ${study.target}`, `${enrolledPercent}% of target`],
            [
              "Safety",
              `${workflow.getOpenSaes(studyId)} open SAEs`,
              "Resolve before database lock",
            ],
          ].map(([label, value, detail], index) => (
            <div key={label} className="bg-surface p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {index === 0 ? (
                  <CheckCircle2 className="size-4 text-positive" />
                ) : index === 1 || index === 3 ? (
                  <CircleAlert className="size-4 text-risk" />
                ) : (
                  <UserRound className="size-4 text-secondary" />
                )}
                <strong className="text-sm">{value}</strong>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
              {index === 2 && (
                <div className="mt-3">
                  <ProgressBar value={enrolledPercent} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-7 overflow-x-auto border-b border-border">
          <div className="flex min-w-max gap-7">
            {tabs.map((item) => (
              <Button
                key={item}
                variant="ghost"
                onClick={() => setTab(item)}
                className={`h-11 rounded-none border-b-2 px-0 text-xs ${tab === item ? "border-secondary text-primary" : "border-transparent"}`}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-7">
          {tab === "Overview" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
              <section className="rounded-lg border border-border bg-surface p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
                      Study journey
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold">Current workflow</h2>
                  </div>
                  <StatusPill tone={study.stage === "closed" ? "good" : "warn"}>
                    {study.status}
                  </StatusPill>
                </div>
                <div className="mt-7">
                  <Timeline
                    items={workflowStages.map((stage, index) => ({
                      title: stage.label,
                      detail:
                        index < stageIndex
                          ? "Milestone recorded in this session"
                          : index === stageIndex
                            ? "Current stage"
                            : "Pending prerequisite",
                      time: index < stageIndex ? "Done" : index === stageIndex ? "Now" : "Next",
                      ...(index < stageIndex
                        ? { state: "done" as const }
                        : index === stageIndex
                          ? { state: "current" as const }
                          : {}),
                    }))}
                  />
                </div>
                <section className="mt-2 rounded-md border border-secondary/20 bg-secondary/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
                    Next required action
                  </p>
                  <h3 className="mt-1 font-display text-base font-semibold">
                    {study.stage === "protocol"
                      ? "Submit protocol for IEC review"
                      : study.stage === "ethics"
                        ? "Record IEC approval"
                        : study.stage === "ctri"
                          ? "Record prospective CTRI registration"
                          : study.stage === "sites"
                            ? "Activate the first study site"
                            : study.stage === "recruitment"
                              ? study.enrolled < study.target
                                ? "Record participant enrollment"
                                : "Begin follow-up"
                              : study.stage === "follow-up"
                                ? study.visitsComplete < study.enrolled
                                  ? "Complete outstanding follow-up visits"
                                  : "Submit study for close-out"
                                : study.stage === "close-out"
                                  ? "Lock database and close study"
                                  : "Study lifecycle complete"}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Each transition is recorded in the session audit trail. Gates prevent moving
                    forward before enrollment, visits, or safety cases are addressed.
                  </p>
                  {study.stage === "recruitment" && study.enrolled < study.target ? (
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <label className="text-xs font-medium">
                        Participants to record
                        <Input
                          type="number"
                          min={1}
                          max={study.target - study.enrolled}
                          value={enrollmentBatch}
                          onChange={(event) => setEnrollmentBatch(Number(event.target.value))}
                          className="mt-1 w-28"
                        />
                      </label>
                      <Button
                        disabled={!can(role, "enrollment:update")}
                        title={
                          !can(role, "enrollment:update") ? "Regulator is read-only" : undefined
                        }
                        onClick={recordEnrollment}
                      >
                        Record enrollment
                      </Button>
                    </div>
                  ) : study.stage === "follow-up" && study.visitsComplete < study.enrolled ? (
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <label className="text-xs font-medium">
                        Visits to complete
                        <Input
                          type="number"
                          min={1}
                          max={study.enrolled - study.visitsComplete}
                          value={visitBatch}
                          onChange={(event) => setVisitBatch(Number(event.target.value))}
                          className="mt-1 w-28"
                        />
                      </label>
                      <Button
                        disabled={!can(role, "visits:update")}
                        title={!can(role, "visits:update") ? "Regulator is read-only" : undefined}
                        onClick={recordVisits}
                      >
                        Record visits
                      </Button>
                    </div>
                  ) : (
                    study.stage !== "closed" && (
                      <Button
                        className="mt-4"
                        disabled={
                          !can(role, "studies:update") ||
                          (study.stage === "close-out" && openSaes > 0)
                        }
                        title={!can(role, "studies:update") ? "Regulator is read-only" : undefined}
                        onClick={moveToNextStage}
                      >
                        {study.stage === "protocol"
                          ? "Submit to IEC"
                          : study.stage === "ethics"
                            ? "Record IEC approval"
                            : study.stage === "ctri"
                              ? "Register on CTRI"
                              : study.stage === "sites"
                                ? "Activate site"
                                : study.stage === "recruitment"
                                  ? "Begin follow-up"
                                  : study.stage === "follow-up"
                                    ? "Start close-out"
                                    : "Lock and close"}
                      </Button>
                    )
                  )}
                  {study.stage === "close-out" && openSaes > 0 && (
                    <p className="mt-2 text-xs text-risk">
                      Resolve {openSaes} open SAE {openSaes === 1 ? "case" : "cases"} before
                      database lock.
                    </p>
                  )}
                </section>
              </section>
              <aside className="space-y-6">
                <section className="rounded-lg border border-risk/20 bg-risk/5 p-5">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 size-5 shrink-0 text-risk" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">
                        Study oversight
                      </p>
                      <h2 className="mt-2 font-display text-lg font-semibold">
                        {studyRisks.length + openSaes} open items
                      </h2>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {studyRisks[0]?.detail ??
                          (openSaes > 0
                            ? `${openSaes} open SAE cases require review before close-out.`
                            : "No open safety or compliance items are recorded for this study.")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-risk/15 pt-4">
                    <p className="text-xs text-muted-foreground">Accountable owner</p>
                    <p className="mt-1 text-sm font-semibold">{study.lead}</p>
                  </div>
                  <Button
                    className="mt-5 w-full"
                    onClick={() => setTab(studyRisks.length ? "Compliance" : "Safety")}
                  >
                    Review open items
                  </Button>
                </section>
                <section className="rounded-lg border border-border bg-surface p-5">
                  <FileText className="size-5 text-secondary" />
                  <h2 className="mt-4 text-sm font-semibold">Study record</h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Enrollment target {study.target} · {study.activatedSites} active sites ·{" "}
                    {study.visitsComplete} of {study.enrolled} follow-up visits complete.
                  </p>
                </section>
              </aside>
              <Collapsible className="mt-6 rounded-md border border-border bg-muted/20">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold">
                  Why this score{" "}
                  <span className="text-xs text-muted-foreground">
                    {computedRisk?.score ?? 0} points
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border px-4 py-4">
                  {computedRisk?.factors.length ? (
                    <div className="space-y-3">
                      {computedRisk.factors.map((factor) => (
                        <div
                          key={factor.label}
                          className="flex items-start justify-between gap-4 text-xs"
                        >
                          <div>
                            <p className="font-semibold">{factor.label}</p>
                            <p className="mt-1 text-muted-foreground">{factor.detail}</p>
                          </div>
                          <strong className="shrink-0 text-risk">+{factor.points}</strong>
                        </div>
                      ))}
                      <p className="border-t border-border pt-3 text-sm font-semibold">
                        Total score: {computedRisk.score}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No active risk factors contribute to this score.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : (
            <StudyTabPanel
              tab={tab}
              study={study}
              safetyCases={studyCases}
              risks={allStudyRisks}
              documents={studyDocuments}
              auditEntries={studyAudit}
              consentRecords={workflow.consentRecords.filter(
                (record) => record.studyId === studyId,
              )}
              integrity={integrity}
              onVerifyIntegrity={async () =>
                setIntegrity((await workflow.verifyAuditIntegrity()) ? "pass" : "fail")
              }
              onRecordEnrollments={workflow.recordEnrollments}
              onRecordVisits={workflow.recordVisits}
              onRecordConsent={workflow.recordConsent}
              onAdvanceSafetyCase={workflow.advanceSafetyCase}
              onResolveRisk={workflow.resolveRisk}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function StudyTabPanel({
  tab,
  study,
  safetyCases,
  risks,
  documents,
  auditEntries,
  consentRecords,
  integrity,
  onVerifyIntegrity,
  onRecordEnrollments,
  onRecordVisits,
  onRecordConsent,
  onAdvanceSafetyCase,
  onResolveRisk,
}: {
  tab: string;
  study: WorkflowStudy;
  safetyCases: WorkflowSafetyCase[];
  risks: ComplianceRisk[];
  documents: DocumentRecord[];
  auditEntries: AuditEntry[];
  consentRecords: ConsentRecord[];
  integrity: "pass" | "fail" | null;
  onVerifyIntegrity: () => Promise<void>;
  onRecordEnrollments: (
    studyId: string,
    count: number,
  ) => Promise<{ ok: boolean; message: string }>;
  onRecordVisits: (studyId: string, count: number) => Promise<{ ok: boolean; message: string }>;
  onAdvanceSafetyCase: (caseId: string) => Promise<void>;
  onResolveRisk: (riskId: string) => Promise<void>;
  onRecordConsent: (input: Omit<ConsentRecord, "id" | "timestamp">) => ConsentRecord;
}) {
  const [batch, setBatch] = useState(10);
  const workflow = useWorkflow();
  const now = useNow();
  const currentTime = new Date(now.getTime() + workflow.demoClockOffsetHours * 60 * 60 * 1000);
  const { profile } = useAuth();
  const role = profile?.role;
  const stageIndex = getCurrentStageIndex(study.stage);
  const reportResult = (result: { ok: boolean; message: string }) =>
    result.ok ? toast.success(result.message) : toast.warning(result.message);
  const deadlineFor = (item: WorkflowSafetyCase) => {
    if (item.stage === "closed") return "Closed";
    if (item.severity !== "SAE") return "Review";
    return (
      calculateDeadline(item.awareAt, rulePacks[study.rulePack].saeInitialReportHours, currentTime)
        ?.label ?? "Not dated"
    );
  };
  const stageLabels: Record<WorkflowSafetyCase["stage"], string> = {
    reported: "Reported",
    "medical-review": "Medical review",
    "regulatory-reporting": "Regulatory reporting",
    "follow-up": "Follow-up",
    "ready-to-close": "Ready to close",
    "signal-review": "Signal review",
    closed: "Closed",
  };

  if (tab === "Participants")
    return (
      <ConsentPanel
        study={study}
        consentRecords={consentRecords}
        onRecordConsent={onRecordConsent}
        onRecordEnrollments={onRecordEnrollments}
      />
    );

  if (tab === "Visits")
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Visit schedule
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">
          {study.visitsComplete} of {study.enrolled} follow-up visits complete
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record completed follow-up visits in batches. Close-out is gated until enrolled
          participants have completed follow-up.
        </p>
        <div className="mt-6">
          <ProgressBar
            value={study.enrolled ? Math.round((study.visitsComplete / study.enrolled) * 100) : 0}
          />
        </div>
        {study.stage === "follow-up" && study.visitsComplete < study.enrolled ? (
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Visits completed
              <Input
                type="number"
                min={1}
                max={study.enrolled - study.visitsComplete}
                value={batch}
                onChange={(event) => setBatch(Number(event.target.value))}
                className="mt-1 w-32"
              />
            </label>
            <Button
              disabled={!can(role, "visits:update")}
              title={!can(role, "visits:update") ? "Regulator is read-only" : undefined}
              onClick={() => {
                void onRecordVisits(study.id, batch)
                  .then(reportResult)
                  .catch((error) => {
                    console.error("Failed to persist visits:", error);
                    toast.error("Failed to record visits.");
                  });
              }}
            >
              Record visits
            </Button>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Visit entry becomes available when this study reaches follow-up.
          </p>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Screening", "Eligibility and consent"],
            ["Intervention", "Protocol visit window"],
            ["Follow-up", "Outcome and safety review"],
          ].map(([visit, detail]) => (
            <article key={visit} className="border-l-2 border-secondary bg-muted/30 px-4 py-3">
              <h3 className="text-sm font-semibold">{visit}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </article>
          ))}
        </div>
      </section>
    );

  if (tab === "Safety")
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">
              Pharmacovigilance
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">Study safety cases</h2>
          </div>
          <StatusPill tone="risk">
            {
              safetyCases.filter((item) => item.severity === "SAE" && item.stage !== "closed")
                .length
            }{" "}
            open SAEs
          </StatusPill>
        </div>
        {safetyCases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No safety cases are recorded for this study.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {safetyCases.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">
                      {item.id} · {item.title}
                    </strong>
                    <StatusPill tone={item.severity === "SAE" ? "risk" : "warn"}>
                      {item.severity}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stageLabels[item.stage]} · Owner: {item.owner} · Due: {deadlineFor(item)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Causality: {item.causality ?? "Not recorded"} · Prakriti:{" "}
                    {item.prakriti ?? "Not recorded"} · Batch: {item.batchId ?? "Not linked"} ·
                    Interaction suspected: {item.interactionSuspected ? "Yes" : "No"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Concomitant drugs:{" "}
                    {item.concomitantMeds?.length
                      ? item.concomitantMeds.join(", ")
                      : "None recorded"}
                  </p>
                </div>
                {item.stage !== "closed" && (
                  <Button
                    disabled={!can(role, "safety:update")}
                    title={!can(role, "safety:update") ? "Regulator is read-only" : undefined}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (can(role, "safety:update"))
                        void onAdvanceSafetyCase(item.id).catch((error) => {
                          console.error("Failed to persist safety stage:", error);
                          toast.error("Failed to update safety case.");
                        });
                    }}
                  >
                    {item.stage === "reported"
                      ? "Start medical review"
                      : item.stage === "medical-review"
                        ? "Submit regulatory report"
                        : item.stage === "regulatory-reporting"
                          ? "Request follow-up"
                          : item.stage === "follow-up"
                            ? "Confirm follow-up"
                            : item.stage === "ready-to-close"
                              ? "Close case"
                              : "Submit signal"}
                    <ArrowRight className="size-3.5" />
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    );

  if (tab === "Compliance")
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Ethics and regulatory
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">Compliance actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resolve each evidence gap before the corresponding milestone is considered
          inspection-ready.
        </p>
        <div className="mt-5 divide-y divide-border">
          {risks.map((risk) => (
            <article
              key={risk.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{risk.title}</h3>
                  <StatusPill
                    tone={risk.resolved ? "good" : risk.severity === "High" ? "risk" : "warn"}
                  >
                    {risk.resolved ? "Resolved" : risk.severity}
                  </StatusPill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {risk.detail} · Owner: {risk.owner}
                </p>
              </div>
              {!risk.resolved && (
                <Button
                  disabled={!can(role, "compliance:update")}
                  title={!can(role, "compliance:update") ? "Regulator is read-only" : undefined}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!can(role, "compliance:update")) return;
                    void onResolveRisk(risk.id)
                      .then(() => toast.success(`${risk.title} resolved during this session.`))
                      .catch((error) => {
                        console.error("Failed to persist compliance item:", error);
                        toast.error("Failed to resolve compliance item.");
                      });
                  }}
                >
                  Resolve item
                </Button>
              )}
            </article>
          ))}
        </div>
        {risks.length === 0 && (
          <p className="mt-5 text-sm text-muted-foreground">
            No compliance items have been recorded for this study.
          </p>
        )}
      </section>
    );

  if (tab === "Audit Trail")
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Session audit trail
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">Recorded workflow actions</h2>
          </div>
          <div className="flex items-center gap-2">
            {integrity && (
              <StatusPill tone={integrity === "pass" ? "good" : "risk"}>
                {integrity === "pass" ? "Integrity passed" : "Integrity failed"}
              </StatusPill>
            )}
            <Button variant="secondary" size="sm" onClick={() => void onVerifyIntegrity()}>
              Verify integrity
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only for this browser session; refreshing clears this session history.
        </p>
        {auditEntries.length === 0 ? (
          <p className="mt-6 rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">
            No actions recorded yet. Workflow stage changes, enrollment, visits, safety updates, and
            compliance resolutions will appear here.
          </p>
        ) : (
          <div className="mt-6">
            <Timeline
              items={auditEntries.map((entry) => ({
                title: entry.action,
                detail: `${entry.actor} · ${entry.studyId}`,
                time: new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                state: "done" as const,
              }))}
            />
          </div>
        )}
      </section>
    );

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-secondary" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
            Controlled documents
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">Study documents</h2>
        </div>
      </div>
      {documents.length ? (
        <div className="mt-6 divide-y divide-border">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm font-semibold">
                  {document.title}{" "}
                  <span className="text-xs text-muted-foreground">v{document.version}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Owner: {document.owner}</p>
              </div>
              <StatusPill
                tone={
                  document.status === "Approved"
                    ? "good"
                    : document.status === "In review"
                      ? "warn"
                      : "neutral"
                }
              >
                {document.status}
              </StatusPill>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No document records are available for this study.
        </p>
      )}
    </section>
  );
}

const consentLanguages = {
  en: {
    name: "English",
    title: "Participant information and consent",
    intro:
      "You are invited to take part in this research study. Participation is voluntary. The study team will explain the purpose, procedures, possible benefits, risks, and alternatives before you decide.",
    voluntary: "You may refuse or withdraw at any time without losing your usual care or benefits.",
    data: "Your study information will be coded and handled only by authorised study staff according to the approved protocol.",
    understand: "I have had the opportunity to ask questions and received answers I understand.",
  },
  hi: {
    name: "हिन्दी",
    title: "प्रतिभागी जानकारी और सहमति",
    intro:
      "आपको इस शोध अध्ययन में भाग लेने के लिए आमंत्रित किया गया है। भाग लेना स्वैच्छिक है। निर्णय लेने से पहले अध्ययन दल आपको उद्देश्य, प्रक्रिया, संभावित लाभ, जोखिम और विकल्प समझाएगा।",
    voluntary:
      "आप बिना अपनी नियमित देखभाल या लाभ खोए कभी भी मना कर सकते हैं या भाग लेना बंद कर सकते हैं।",
    data: "आपकी अध्ययन जानकारी को कोड किया जाएगा और स्वीकृत प्रोटोकॉल के अनुसार केवल अधिकृत अध्ययन कर्मचारी संभालेंगे।",
    understand: "मुझे प्रश्न पूछने का अवसर मिला है और मुझे समझ में आने वाले उत्तर मिले हैं।",
  },
  bn: {
    name: "বাংলা",
    title: "অংশগ্রহণকারীর তথ্য ও সম্মতি",
    intro:
      "আপনাকে এই গবেষণায় অংশগ্রহণের জন্য আমন্ত্রণ জানানো হচ্ছে। অংশগ্রহণ স্বেচ্ছামূলক। সিদ্ধান্ত নেওয়ার আগে গবেষণা দল উদ্দেশ্য, পদ্ধতি, সম্ভাব্য উপকার, ঝুঁকি ও বিকল্প ব্যাখ্যা করবে।",
    voluntary:
      "আপনি আপনার স্বাভাবিক চিকিৎসা বা সুবিধা না হারিয়ে যেকোনো সময় না বলতে বা অংশগ্রহণ বন্ধ করতে পারেন।",
    data: "অনুমোদিত প্রোটোকল অনুযায়ী আপনার গবেষণার তথ্য কোড করা হবে এবং শুধুমাত্র অনুমোদিত কর্মীরা ব্যবহার করবেন।",
    understand: "প্রশ্ন করার সুযোগ পেয়েছি এবং আমি বুঝতে পেরেছি এমন উত্তর পেয়েছি।",
  },
  mr: {
    name: "मराठी",
    title: "सहभागी माहिती आणि संमती",
    intro:
      "या संशोधन अभ्यासात सहभागी होण्यासाठी आपल्याला आमंत्रित केले आहे. सहभाग स्वेच्छेचा आहे. निर्णय घेण्यापूर्वी अभ्यासाचा उद्देश, प्रक्रिया, संभाव्य फायदे, धोके आणि पर्याय समजावले जातील.",
    voluntary:
      "आपली नियमित काळजी किंवा लाभ न गमावता आपण कधीही नकार देऊ शकता किंवा सहभाग थांबवू शकता.",
    data: "मंजूर प्रोटोकॉलनुसार आपली अभ्यासमाहिती कोड केली जाईल आणि केवळ अधिकृत कर्मचारी ती हाताळतील.",
    understand: "मला प्रश्न विचारण्याची संधी मिळाली आणि मला समजणारी उत्तरे मिळाली.",
  },
  ta: {
    name: "தமிழ்",
    title: "பங்கேற்பாளர் தகவல் மற்றும் சம்மதம்",
    intro:
      "இந்த ஆய்வில் பங்கேற்க உங்களுக்கு அழைப்பு விடுக்கப்படுகிறது. பங்கேற்பு விருப்பத்திற்குரியது. முடிவு செய்வதற்கு முன் நோக்கம், நடைமுறைகள், சாத்தியமான நன்மைகள், அபாயங்கள் மற்றும் மாற்றுகள் விளக்கப்படும்.",
    voluntary:
      "உங்கள் வழக்கமான சிகிச்சை அல்லது நன்மைகளை இழக்காமல் எந்த நேரத்திலும் மறுக்கலாம் அல்லது விலகலாம்.",
    data: "அங்கீகரிக்கப்பட்ட நெறிமுறையின்படி உங்கள் ஆய்வுத் தகவல் குறியிடப்பட்டு, அங்கீகரிக்கப்பட்ட பணியாளர்களால் மட்டுமே கையாளப்படும்.",
    understand: "கேள்விகள் கேட்க எனக்கு வாய்ப்பு கிடைத்தது; புரியும் பதில்கள் கிடைத்தன.",
  },
  te: {
    name: "తెలుగు",
    title: "పాల్గొనేవారి సమాచారం మరియు సమ్మతి",
    intro:
      "ఈ పరిశోధనా అధ్యయనంలో పాల్గొనమని మిమ్మల్ని ఆహ్వానిస్తున్నాము. పాల్గొనడం స్వచ్ఛందం. నిర్ణయం తీసుకునే ముందు ఉద్దేశ్యం, విధానాలు, ప్రయోజనాలు, ప్రమాదాలు మరియు ప్రత్యామ్నాయాలను బృందం వివరిస్తుంది.",
    voluntary:
      "మీ సాధారణ సంరక్షణ లేదా ప్రయోజనాలను కోల్పోకుండా ఎప్పుడైనా నిరాకరించవచ్చు లేదా వైదొలగవచ్చు.",
    data: "ఆమోదించిన ప్రోటోకాల్ ప్రకారం మీ అధ్యయన సమాచారం కోడ్ చేయబడుతుంది మరియు అధీకృత సిబ్బంది మాత్రమే నిర్వహిస్తారు.",
    understand: "ప్రశ్నలు అడిగే అవకాశం నాకు లభించింది మరియు అర్థమయ్యే సమాధానాలు పొందాను.",
  },
  gu: {
    name: "ગુજરાતી",
    title: "સહભાગી માહિતી અને સંમતિ",
    intro:
      "આ સંશોધન અભ્યાસમાં ભાગ લેવા માટે તમને આમંત્રિત કરવામાં આવે છે. ભાગ લેવો સ્વૈચ્છિક છે. નિર્ણય લેતા પહેલાં ટીમ હેતુ, પ્રક્રિયા, સંભવિત લાભ, જોખમો અને વિકલ્પો સમજાવશે.",
    voluntary:
      "તમારી સામાન્ય સારવાર અથવા લાભ ગુમાવ્યા વિના તમે કોઈપણ સમયે ના પાડી શકો અથવા ભાગ લેવાનું બંધ કરી શકો છો.",
    data: "મંજૂર પ્રોટોકોલ મુજબ તમારી અભ્યાસ માહિતી કોડ કરવામાં આવશે અને માત્ર અધિકૃત કર્મચારીઓ તેને સંભાળશે.",
    understand: "મને પ્રશ્નો પૂછવાની તક મળી અને મને સમજાય તેવા જવાબો મળ્યા.",
  },
  kn: {
    name: "ಕನ್ನಡ",
    title: "ಭಾಗವಹಿಸುವವರ ಮಾಹಿತಿ ಮತ್ತು ಸಮ್ಮತಿ",
    intro:
      "ಈ ಸಂಶೋಧನಾ ಅಧ್ಯಯನದಲ್ಲಿ ಭಾಗವಹಿಸಲು ನಿಮ್ಮನ್ನು ಆಹ್ವಾನಿಸಲಾಗಿದೆ. ಭಾಗವಹಿಸುವುದು ಸ್ವಯಂಪ್ರೇರಿತ. ನಿರ್ಧಾರಕ್ಕೆ ಮೊದಲು ಉದ್ದೇಶ, ವಿಧಾನಗಳು, ಪ್ರಯೋಜನಗಳು, ಅಪಾಯಗಳು ಮತ್ತು ಪರ್ಯಾಯಗಳನ್ನು ತಂಡ ವಿವರಿಸುತ್ತದೆ.",
    voluntary:
      "ನಿಮ್ಮ ಸಾಮಾನ್ಯ ಆರೈಕೆ ಅಥವಾ ಪ್ರಯೋಜನಗಳನ್ನು ಕಳೆದುಕೊಳ್ಳದೆ ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ನಿರಾಕರಿಸಬಹುದು ಅಥವಾ ಹಿಂದೆ ಸರಿಯಬಹುದು.",
    data: "ಅನುಮೋದಿತ ಪ್ರೋಟೋಕಾಲ್ ಪ್ರಕಾರ ನಿಮ್ಮ ಅಧ್ಯಯನ ಮಾಹಿತಿಯನ್ನು ಕೋಡ್ ಮಾಡಲಾಗುತ್ತದೆ ಮತ್ತು ಅಧಿಕೃತ ಸಿಬ್ಬಂದಿ ಮಾತ್ರ ನಿರ್ವಹಿಸುತ್ತಾರೆ.",
    understand: "ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಲು ನನಗೆ ಅವಕಾಶ ದೊರೆತಿದೆ ಮತ್ತು ಅರ್ಥವಾಗುವ ಉತ್ತರಗಳನ್ನು ಪಡೆದಿದ್ದೇನೆ.",
  },
  ml: {
    name: "മലയാളം",
    title: "പങ്കാളിയുടെ വിവരങ്ങളും സമ്മതവും",
    intro:
      "ഈ ഗവേഷണ പഠനത്തിൽ പങ്കെടുക്കാൻ നിങ്ങളെ ക്ഷണിക്കുന്നു. പങ്കെടുക്കുന്നത് സ്വമേധയാ ആണ്. തീരുമാനിക്കുന്നതിന് മുമ്പ് ഉദ്ദേശ്യം, നടപടികൾ, ഗുണങ്ങൾ, അപകടസാധ്യതകൾ, മറ്റ് മാർഗങ്ങൾ എന്നിവ പഠനസംഘം വിശദീകരിക്കും.",
    voluntary:
      "നിങ്ങളുടെ സാധാരണ പരിചരണമോ ആനുകൂല്യങ്ങളോ നഷ്ടപ്പെടാതെ എപ്പോൾ വേണമെങ്കിലും നിരസിക്കുകയോ പിന്മാറുകയോ ചെയ്യാം.",
    data: "അംഗീകരിച്ച പ്രോട്ടോക്കോൾ പ്രകാരം നിങ്ങളുടെ പഠനവിവരങ്ങൾ കോഡ് ചെയ്ത്, അധികാരമുള്ള ജീവനക്കാർ മാത്രം കൈകാര്യം ചെയ്യും.",
    understand:
      "ചോദ്യങ്ങൾ ചോദിക്കാൻ എനിക്ക് അവസരം ലഭിക്കുകയും മനസ്സിലാകുന്ന ഉത്തരങ്ങൾ ലഭിക്കുകയും ചെയ്തു.",
  },
  pa: {
    name: "ਪੰਜਾਬੀ",
    title: "ਭਾਗੀਦਾਰ ਜਾਣਕਾਰੀ ਅਤੇ ਸਹਿਮਤੀ",
    intro:
      "ਤੁਹਾਨੂੰ ਇਸ ਖੋਜ ਅਧਿਐਨ ਵਿੱਚ ਹਿੱਸਾ ਲੈਣ ਲਈ ਸੱਦਾ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਹਿੱਸਾ ਲੈਣਾ ਸਵੈਇੱਛਿਕ ਹੈ। ਫੈਸਲਾ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਟੀਮ ਮਕਸਦ, ਪ੍ਰਕਿਰਿਆਵਾਂ, ਸੰਭਾਵੀ ਲਾਭ, ਖਤਰੇ ਅਤੇ ਵਿਕਲਪ ਸਮਝਾਏਗੀ।",
    voluntary: "ਤੁਸੀਂ ਆਪਣੀ ਆਮ ਦੇਖਭਾਲ ਜਾਂ ਲਾਭ ਗੁਆਏ ਬਿਨਾਂ ਕਿਸੇ ਵੀ ਸਮੇਂ ਇਨਕਾਰ ਜਾਂ ਵਾਪਸ ਹੋ ਸਕਦੇ ਹੋ।",
    data: "ਮਨਜ਼ੂਰਸ਼ੁਦਾ ਪ੍ਰੋਟੋਕੋਲ ਅਨੁਸਾਰ ਤੁਹਾਡੀ ਅਧਿਐਨ ਜਾਣਕਾਰੀ ਕੋਡ ਕੀਤੀ ਜਾਵੇਗੀ ਅਤੇ ਸਿਰਫ਼ ਅਧਿਕਾਰਤ ਕਰਮਚਾਰੀ ਇਸਨੂੰ ਸੰਭਾਲਣਗੇ।",
    understand: "ਮੈਨੂੰ ਸਵਾਲ ਪੁੱਛਣ ਦਾ ਮੌਕਾ ਮਿਲਿਆ ਅਤੇ ਮੈਨੂੰ ਸਮਝ ਆਉਣ ਵਾਲੇ ਜਵਾਬ ਮਿਲੇ।",
  },
} as const;

type ConsentLanguage = keyof typeof consentLanguages;

function ConsentPanel({
  study,
  consentRecords,
  onRecordConsent,
  onRecordEnrollments,
}: {
  study: WorkflowStudy;
  consentRecords: ConsentRecord[];
  onRecordConsent: (input: Omit<ConsentRecord, "id" | "timestamp">) => ConsentRecord;
  onRecordEnrollments: (
    studyId: string,
    count: number,
  ) => Promise<{ ok: boolean; message: string }>;
}) {
  const { role } = useAuth();
  const [language, setLanguage] = useState<ConsentLanguage>("hi");
  const [participantCode, setParticipantCode] = useState("");
  const [participantMark, setParticipantMark] = useState("");
  const [staffInitials, setStaffInitials] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [voluntary, setVoluntary] = useState(false);
  const [enrollmentBatch, setEnrollmentBatch] = useState(1);
  const content = consentLanguages[language];
  const saveConsent = (decision: ConsentRecord["decision"]) => {
    if (
      !participantCode.trim() ||
      !participantMark.trim() ||
      !staffInitials.trim() ||
      !understood ||
      !voluntary
    ) {
      toast.warning(
        "Complete the participant code, initials, staff initials, and both confirmations first.",
      );
      return;
    }
    onRecordConsent({
      studyId: study.id,
      participantCode: participantCode.trim(),
      language,
      languageName: content.name,
      documentVersion: "ICF-v1.0",
      decision,
      participantMark: participantMark.trim(),
      staffInitials: staffInitials.trim(),
    });
    toast.success(
      decision === "consented"
        ? "Consent recorded in this session."
        : "Declined decision recorded in this session.",
    );
    setParticipantCode("");
    setParticipantMark("");
    setStaffInitials("");
    setUnderstood(false);
    setVoluntary(false);
  };
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Enrollment and consent
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              {study.enrolled} of {study.target} participants
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete consent before recording a participant. Identifiers remain in this browser
              session only.
            </p>
          </div>
          <StatusPill tone={study.stage === "recruitment" ? "good" : "neutral"}>
            {study.stage === "recruitment" ? "Recruiting" : "Recruitment stage complete"}
          </StatusPill>
        </div>
        <div className="mt-6">
          <ProgressBar value={getStudyProgress(study)} />
        </div>
        {study.stage === "recruitment" && study.enrolled < study.target && (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Participants to enroll
              <Input
                type="number"
                min={1}
                max={study.target - study.enrolled}
                value={enrollmentBatch}
                onChange={(event) => setEnrollmentBatch(Number(event.target.value))}
                className="mt-1 w-32"
              />
            </label>
            <Button
              disabled={!can(role, "enrollment:update")}
              title={!can(role, "enrollment:update") ? "Regulator is read-only" : undefined}
              onClick={() => {
                void onRecordEnrollments(study.id, enrollmentBatch)
                  .then((result) =>
                    result.ok ? toast.success(result.message) : toast.warning(result.message),
                  )
                  .catch((error) => {
                    console.error("Failed to persist enrollment:", error);
                    toast.error("Failed to record enrollment.");
                  });
              }}
            >
              Record enrollment
            </Button>
          </div>
        )}
      </section>
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Multilingual ICF template
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">{content.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Document version ICF-v1.0 · Select the participant's preferred language before reading
              aloud.
            </p>
          </div>
          <label className="text-xs font-medium">
            Language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as ConsentLanguage)}
              className="mt-1 block h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(consentLanguages).map(([code, item]) => (
                <option key={code} value={code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6 grid gap-3 text-sm leading-6">
          <p>{content.intro}</p>
          <p>{content.voluntary}</p>
          <p>{content.data}</p>
        </div>
        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <label className="text-xs font-medium">
            Participant code
            <Input
              value={participantCode}
              onChange={(event) => setParticipantCode(event.target.value)}
              placeholder="e.g. AIIA-001"
              className="mt-1"
            />
          </label>
          <label className="text-xs font-medium">
            Participant initials / mark
            <Input
              value={participantMark}
              onChange={(event) => setParticipantMark(event.target.value)}
              placeholder="Initials or mark"
              className="mt-1"
            />
          </label>
          <label className="text-xs font-medium">
            Staff initials
            <Input
              value={staffInitials}
              onChange={(event) => setStaffInitials(event.target.value)}
              placeholder="Staff initials"
              className="mt-1"
            />
          </label>
        </div>
        <div className="mt-5 grid gap-3 text-sm">
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
              className="mt-1"
            />
            {content.understand}
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={voluntary}
              onChange={(event) => setVoluntary(event.target.checked)}
              className="mt-1"
            />
            {content.voluntary}
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={!can(role, "consent:update")} onClick={() => saveConsent("consented")}>
            Record consent
          </Button>
          <Button
            disabled={!can(role, "consent:update")}
            variant="secondary"
            onClick={() => saveConsent("declined")}
          >
            Record declined
          </Button>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Template notice: replace this content with the current IEC-approved translated ICF before
          production use. This demo does not constitute participant consent or regulatory approval.
        </p>
      </section>
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Consent receipts
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold">Recorded this session</h2>
        {consentRecords.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No participant consent decisions recorded yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {consentRecords.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <strong>{record.participantCode}</strong>
                  <p className="text-xs text-muted-foreground">
                    {record.languageName} · {record.documentVersion} · Staff {record.staffInitials}
                  </p>
                </div>
                <StatusPill tone={record.decision === "consented" ? "good" : "warn"}>
                  {record.decision === "consented" ? "Consented" : "Declined"}
                </StatusPill>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
