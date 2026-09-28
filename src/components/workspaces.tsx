import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Archive, ArrowUpRight, CheckCircle2, Download, FileText, Filter, FolderOpen, MoreHorizontal, Plus, Search, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AttentionItem, PlatformPage, ProgressBar, StatusPill, Timeline, WorkflowModal } from "@/components/trialshield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildClinicalReportRows, downloadClinicalReport, downloadTsCsv, type ClinicalReportFormat } from "@/lib/clinical-report";
import { useWorkflow, getStudyProgress } from "@/components/workflow-state";
import { useNow } from "@/hooks/use-now";
import { computeDueAt, formatRemaining, remainingMs, statusFor } from "@/lib/deadlines";
import { rulePacks } from "@/lib/rule-packs";
import { computeRisk } from "@/lib/risk";
import { appRoles, useAuth, type AppRole } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

export function StudiesWorkspace() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { studies, createStudy, safetyCases, risks } = useWorkflow();
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("Phase I · Interventional");
  const [target, setTarget] = useState(20);
  const [lead, setLead] = useState("");
  if (pathname !== "/studies") return <Outlet />;
  const visibleStudies = studies.filter((study) => study.archived === showArchived)
    .filter((study) => !recruitingOnly || study.status === "Recruiting")
    .filter((study) => `${study.id} ${study.title} ${study.lead}`.toLowerCase().includes(query.toLowerCase()));

  const submitStudy = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  try {
    const studyId = await createStudy({
      title: title.trim(),
      phase,
      target,
      lead: lead.trim(),
    });

    setCreateOpen(false);
    toast.success(`${studyId} created. Start with the protocol package.`);
    void navigate({
      to: "/studies/$studyId",
      params: { studyId },
    });
  } catch (error) {
    console.error(error);
    toast.error("Failed to create study.");
  }
};
  return <PlatformPage eyebrow="Study operations" title="Studies" description="Follow each protocol from ethics readiness through recruitment, intervention and close-out." actions={<Button disabled={!can(role, "studies:create")} onClick={() => setCreateOpen(true)}><Plus className="size-4" />New study</Button>}>
    <WorkflowModal open={createOpen} title="Register a study" description="Create a study record. The workflow will start at protocol preparation." onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitStudy} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">Study title<Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Ayurveda intervention outcomes" /></label>
          <label className="block space-y-1.5 text-sm font-medium">Study design<select value={phase} onChange={(event) => setPhase(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Phase I · Interventional</option><option>Phase II · Interventional</option><option>Phase III · Multi-centre</option><option>Observational · Cohort</option><option>Prospective · Registry</option></select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Enrollment target<Input type="number" min={1} max={10000} required value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label><label className="block space-y-1.5 text-sm font-medium">Principal investigator<Input required value={lead} onChange={(event) => setLead(event.target.value)} placeholder="Investigator name" /></label></div>
          <div className="flex justify-end"><Button type="submit"><Plus className="size-4" />Create study</Button></div>
        </form>
    </WorkflowModal>
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 border-b border-border pb-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted-foreground"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" placeholder="Search study, investigator or CTRI ID" /></label>
        <Button variant={recruitingOnly ? "default" : "secondary"} onClick={() => setRecruitingOnly((current) => !current)}><Filter className="size-4" />{recruitingOnly ? "Recruiting only" : "Filter recruiting"}</Button><Button variant={showArchived ? "secondary" : "ghost"} onClick={() => setShowArchived((current) => !current)}><Archive className="size-4" />{showArchived ? "Current studies" : "Archived"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Showing {visibleStudies.length} {showArchived ? "archived" : "current"} {visibleStudies.length === 1 ? "study" : "studies"}</p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        {visibleStudies.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No studies match this view.</p> : visibleStudies.map((study) => <Link key={study.id} to="/studies/$studyId" params={{ studyId: study.id }} className="group grid gap-4 border-b border-border p-5 transition-colors last:border-0 hover:bg-muted/60 lg:grid-cols-[90px_minmax(0,1fr)_130px_160px_120px] lg:items-center">
          <p className="text-[11px] font-semibold text-secondary">{study.id}</p>
          <div className="min-w-0"><h2 className="font-display text-sm font-semibold text-foreground group-hover:text-primary">{study.title}</h2><p className="mt-1 text-xs text-muted-foreground">{study.phase} · {study.activatedSites} active sites · {study.lead}</p></div>
          <StatusPill tone={study.status === "Recruiting" ? "good" : study.stage === "closed" ? "neutral" : "warn"}>{study.status}</StatusPill>
          <div><div className="mb-2 flex justify-between text-[11px]"><span className="text-muted-foreground">Recruitment</span><strong>{getStudyProgress(study)}%</strong></div><ProgressBar value={getStudyProgress(study)} /></div>
          <div className="flex items-center justify-between">{(() => { const risk = computeRisk(study, safetyCases, [], risks); return <StatusPill tone={risk.level === "High" ? "risk" : risk.level === "Moderate" ? "warn" : "good"}>{risk.level} risk</StatusPill>; })()}<ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div>
        </Link>)}
      </div>
    </div>
  </PlatformPage>;
}

export function SafetyWorkspace() {
  const { safetyCases, studies, batches, addSafetyCase, advanceSafetyCase, demoClockOffsetHours, setDemoClockOffsetHours } = useWorkflow();
  const { role } = useAuth();
  const now = useNow();
  const currentTime = new Date(now.getTime() + demoClockOffsetHours * 60 * 60 * 1000);
  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [severity, setSeverity] = useState<"AE" | "SAE">("SAE");
  const [batchId, setBatchId] = useState("");
  const openCases = safetyCases.filter((item) => item.stage !== "closed");
  const openSaes = openCases.filter((item) => item.severity === "SAE").length;
  const batchCounts = new Map(safetyCases.filter((item) => item.batchId).map((item) => [item.batchId, safetyCases.filter((candidate) => candidate.batchId === item.batchId).length]));
  const signalForReview = safetyCases.some((item) => item.batchId && (batchCounts.get(item.batchId) ?? 0) >= 2) || safetyCases.some((item) => item.batchId && batches.find((batch) => batch.id === item.batchId)?.coaStatus === "Failed");
  const dueCase = openCases[0];
  const stageLabel: Record<(typeof safetyCases)[number]["stage"], string> = { reported: "Reported", "medical-review": "Medical review", "regulatory-reporting": "Regulatory reporting", "follow-up": "Follow-up", "ready-to-close": "Ready to close", "signal-review": "Signal review", closed: "Closed" };
  const nextAction: Record<(typeof safetyCases)[number]["stage"], string> = { reported: "Start review", "medical-review": "Submit report", "regulatory-reporting": "Request follow-up", "follow-up": "Confirm follow-up", "ready-to-close": "Close case", "signal-review": "Assess signal", closed: "Closed" };
  const deadlineFor = (item: (typeof safetyCases)[number]) => {
    if (item.stage === "closed") return "Closed";
    if (!item.awareAt) return "Not dated";
    const study = studies.find((candidate) => candidate.id === item.studyId);
    const pack = rulePacks[study?.rulePack ?? "academic-asu"];
    return formatRemaining(remainingMs(computeDueAt(item.awareAt, pack.saeInitialReportHours), currentTime));
  };
  const submitCase = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim() || !studyId) return;
    const caseId = addSafetyCase({ studyId, title: description.trim(), severity, batchId: batchId || undefined });
    setDescription("");
    setCreateOpen(false);
    toast.success(`${caseId} added to the safety workflow.`);
  };
  return <PlatformPage eyebrow="Pharmacovigilance" title="Safety workspace" description="Investigate adverse events, track reporting timelines, and move each case through review and close-out." actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setDemoClockOffsetHours(0)}>Reset time</Button><Button variant="secondary" onClick={() => setDemoClockOffsetHours(demoClockOffsetHours + 6)}>Advance simulated time +6h</Button><Button disabled={!can(role, "safety:create")} onClick={() => setCreateOpen(true)}><Plus className="size-4" />Log safety event</Button></div>}>
    <WorkflowModal open={createOpen} title="Report an adverse event" description="Record an adverse event. Qualified clinical and regulatory review is required before reporting decisions." onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCase} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">Related study<select value={studyId} onChange={(event) => setStudyId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{studies.filter((study) => !study.archived).map((study) => <option key={study.id} value={study.id}>{study.id} · {study.title}</option>)}</select></label>
          <label className="block space-y-1.5 text-sm font-medium">Event description<Input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the event" /></label>
          <label className="block space-y-1.5 text-sm font-medium">Report type<select value={severity} onChange={(event) => setSeverity(event.target.value as "AE" | "SAE")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="AE">Adverse event (AE)</option><option value="SAE">Serious adverse event (SAE)</option></select></label>
          <label className="block space-y-1.5 text-sm font-medium">Intervention batch<select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">No batch linked</option>{batches.filter((batch) => batch.studyId === studyId).map((batch) => <option key={batch.id} value={batch.id}>{batch.lotNo} · {batch.coaStatus}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted-foreground">Manual batch linkage only; do not enter personal identifiers.</span></label>
          <div className="flex justify-end"><Button type="submit"><Plus className="size-4" />Create safety report</Button></div>
        </form>
    </WorkflowModal>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.7fr)]">
      {signalForReview && <div className="xl:col-span-2 border border-risk/30 bg-risk/10 px-4 py-3 text-sm font-semibold text-risk">Signal for review: linked safety events share an intervention batch or a batch has a failed quality test.</div>}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-xs"><div className="mb-2 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Needs attention</p><h2 className="mt-1 font-display text-xl font-semibold">Safety reports in progress</h2></div><StatusPill tone="risk">{openSaes} open SAEs</StatusPill></div>
        {openCases.map((item) => <AttentionItem key={item.id} severity={item.severity === "SAE" ? "critical" : "warning"} title={`${item.id} · ${item.title}`} meta={`${item.studyId} · ${stageLabel[item.stage]} · ${deadlineFor(item)}`} owner={item.owner} action={nextAction[item.stage]} onAction={() => { if (!can(role, "safety:update")) return; advanceSafetyCase(item.id); toast.success(`${item.id} moved to the next review step.`); }} />)}
        {openCases.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No open safety reports.</p>}
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{safetyCases.filter((item) => item.stage === "closed").length} closed case(s).</p>
      </section>
      <aside className="space-y-6"><section className="rounded-lg bg-primary p-6 text-primary-foreground"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">Nearest deadline</p><p className="mt-4 font-display text-3xl font-semibold">{dueCase ? deadlineFor(dueCase) : "None"}</p><p className="mt-2 text-sm text-primary-foreground/70">{dueCase ? `${dueCase.id} · ${dueCase.title}` : "No active safety deadlines"}</p><Button disabled={!can(role, "safety:update")} variant="accent" className="mt-6 w-full" onClick={() => dueCase ? advanceSafetyCase(dueCase.id) : toast.info("No open safety case to review.")}>{dueCase ? nextAction[dueCase.stage] : "No action due"}<ArrowUpRight className="size-4" /></Button></section>
      <section className="rounded-lg border border-border bg-surface p-5"><h2 className="mb-5 font-display text-base font-semibold">Review workflow</h2><Timeline items={openCases.slice(0, 4).map((item, index) => ({ title: stageLabel[item.stage], detail: `${item.id} · ${item.title}`, time: deadlineFor(item), state: statusFor(remainingMs(item.awareAt ? computeDueAt(item.awareAt, 24) : new Date().toISOString(), currentTime)) === "red" ? "risk" as const : index === 0 ? "current" as const : "done" as const }))} /></section></aside>
    </div>
  </PlatformPage>;
}

export function ComplianceWorkspace() {
  const { risks, resolveRisk } = useWorkflow();
  const { role } = useAuth();
  const openRiskCount = risks.filter((risk) => !risk.resolved).length;
  return <PlatformPage eyebrow="Governance" title="Compliance center" description="A single evidence trail for ethics approvals, CTRI readiness, amendments and institutional review." actions={<Button variant="secondary" onClick={() => { const opened = downloadClinicalReport("pdf"); if (opened) toast.success("Print-ready audit brief opened."); else toast.error("Allow pop-ups to open the audit brief."); }}><Download className="size-4" />Audit brief</Button>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <section className="rounded-lg border border-border bg-surface p-6"><div className="flex items-end justify-between border-b border-border pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Institutional evidence trail</p><h2 className="mt-1 font-display text-xl font-semibold">Readiness journey</h2></div><StatusPill tone={openRiskCount ? "warn" : "good"}>{openRiskCount} actions open</StatusPill></div><div className="mt-6"><Timeline items={risks.slice(0, 5).map((risk) => ({ title: risk.title, detail: `${risk.studyId} · ${risk.resolved ? "Resolved in this demo session" : `Owner: ${risk.owner}`}`, time: risk.resolved ? "Done" : risk.severity, state: risk.resolved ? "done" as const : risk.severity === "High" ? "risk" as const : "current" as const }))} /></div>{risks.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No compliance actions are recorded.</p>}</section>
      <aside className="space-y-4"><h2 className="font-display text-base font-semibold">Compliance items</h2>{risks.map((risk) => <article key={risk.id} className="rounded-lg border border-border bg-surface p-5"><div className="flex items-start justify-between gap-4"><ShieldAlert className={`size-5 ${risk.resolved ? "text-positive" : "text-risk"}`} /><StatusPill tone={risk.resolved ? "good" : risk.severity === "High" ? "risk" : "warn"}>{risk.resolved ? "Resolved" : risk.severity}</StatusPill></div><h3 className="mt-4 text-sm font-semibold">{risk.title}</h3><p className="mt-1 text-xs text-muted-foreground">{risk.studyId} · {risk.detail}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-muted-foreground">{risk.owner}</span>{!risk.resolved && <Button variant="ghost" size="sm" onClick={() => { resolveRisk(risk.id); toast.success(`${risk.title} resolved for this demo session.`); }}>Resolve<ArrowUpRight className="size-3.5" /></Button>}</div></article>)}<section className="rounded-lg border border-border bg-surface p-5"><h2 className="font-display text-base font-semibold">Rule packs</h2><div className="mt-3 space-y-3">{Object.entries(rulePacks).map(([id, pack]) => <div key={id} className="border-t border-border pt-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{pack.label}</p><StatusPill tone={pack.verified ? "good" : "warn"}>{pack.verified ? "Verified source" : "Unverified"}</StatusPill></div><p className="mt-1 text-xs text-muted-foreground">SAE initial report: {pack.saeInitialReportHours}h · full report: {pack.saeFullReportDays}d</p><p className="mt-1 text-[11px] text-muted-foreground">{pack.source}</p></div>)}</div></section></aside>
    </div>
  </PlatformPage>;
}

export function DocumentsWorkspace() {
  const { documents, studies, submitDocument, approveDocument, reviseDocument } = useWorkflow();
  const studyTitle = (studyId: string) => studies.find((study) => study.id === studyId)?.title ?? studyId;
  return <PlatformPage eyebrow="Controlled evidence" title="Documents" description="Versioned protocols, approvals, source evidence and safety records arranged by study journey.">
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(130px,.6fr)_minmax(110px,.5fr)_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span>Document</span><span>Study</span><span>Status</span><span>Actions</span></div>
      {documents.map((document) => <article key={document.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(130px,.6fr)_minmax(110px,.5fr)_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-0"><div><p className="text-sm font-semibold">{document.title} <span className="text-xs text-muted-foreground">v{document.version}</span></p><p className="mt-1 text-xs text-muted-foreground">{document.owner} · updated {new Date(document.updatedAt).toLocaleDateString()}</p></div><span className="text-xs text-muted-foreground">{studyTitle(document.studyId)}</span><StatusPill tone={document.status === "Approved" ? "good" : document.status === "In review" ? "warn" : document.status === "Superseded" ? "neutral" : "neutral"}>{document.status}</StatusPill><div className="flex flex-wrap justify-end gap-1">{document.status === "Draft" && <Button size="sm" variant="ghost" onClick={() => submitDocument(document.id)}>Submit</Button>}{document.status === "In review" && <Button size="sm" variant="ghost" onClick={() => approveDocument(document.id)}>Approve</Button>}{document.status !== "Superseded" && <Button size="sm" variant="ghost" onClick={() => reviseDocument(document.id)}>Revise</Button>}</div></article>)}
    </section>
  </PlatformPage>;
}

export function AdminWorkspace() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<Array<{ id: string; email: string | null; full_name: string | null; role: AppRole }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!can(role, "users:manage")) return;
    void supabase.from("profiles").select("id, email, full_name, role").then(({ data, error: queryError }) => {
      if (queryError) {
        console.error("Failed to load profiles:", queryError);
        setError("Unable to load users.");
        return;
      }
      setProfiles((data ?? []) as Array<{ id: string; email: string | null; full_name: string | null; role: AppRole }>);
    });
  }, [role]);

  const updateRole = async (id: string, nextRole: AppRole) => {
    const { error: updateError } = await supabase.from("profiles").update({ role: nextRole }).eq("id", id);
    if (updateError) {
      console.error("Failed to update user role:", updateError);
      setError(updateError.message);
      return;
    }
    setProfiles((items) => items.map((profile) => profile.id === id ? { ...profile, role: nextRole } : profile));
  };

  return <PlatformPage eyebrow="Administration" title="Users and roles" description="Assign one of the six controlled application roles. Passwords remain managed by Supabase Auth.">
    {error && <p role="alert" className="mb-4 border border-risk/20 bg-risk/5 p-3 text-sm text-risk">{error}</p>}
    <section className="overflow-hidden rounded-lg border border-border bg-surface"><div className="grid grid-cols-[minmax(0,1.2fr)_minmax(140px,.8fr)_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span>User</span><span>Role</span><span>Control</span></div>{profiles.map((profile) => <div key={profile.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(140px,.8fr)_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-0"><div><p className="text-sm font-semibold">{profile.full_name || "Unnamed user"}</p><p className="mt-1 text-xs text-muted-foreground">{profile.email ?? "No email"}</p></div><span className="text-xs font-semibold">{profile.role}</span><select value={profile.role} onChange={(event) => void updateRole(profile.id, event.target.value as AppRole)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">{appRoles.map((appRole) => <option key={appRole} value={appRole}>{appRole}</option>)}</select></div>)}</section>
  </PlatformPage>;
}

const utilityContent = {
  analytics: { eyebrow: "Research intelligence", title: "Analytics", description: "Portfolio performance, recruitment trends, safety oversight and data quality in one report.", icon: <CheckCircle2 className="size-5" />, heading: "Portfolio signal review", detail: "Recruitment velocity has stabilised across three studies. Site 04 remains the only material source of protocol deviation risk." },
  documents: { eyebrow: "Controlled evidence", title: "Documents", description: "Versioned protocols, approvals, source evidence and safety records arranged by study journey.", icon: <FolderOpen className="size-5" />, heading: "Evidence requiring review", detail: "Four documents are awaiting signatures or classification before they can enter the audit-ready record." },
  exports: { eyebrow: "Standards exchange", title: "Exports", description: "Create a visual portfolio report or download study metrics for review and interoperability.", icon: <Download className="size-5" />, heading: "Portfolio report", detail: "Study-level recruitment, ethics, CTRI, safety and data-completeness metrics. Export formats include Excel workbook, CSV, JSON, XML, FHIR R4 JSON and print-to-PDF." },
} as const;

export function UtilityWorkspace({ type }: { type: keyof typeof utilityContent }) {
  const data = utilityContent[type];
  const workflow = useWorkflow();
  const [format, setFormat] = useState<ClinicalReportFormat>("pdf");
  const reportRows = buildClinicalReportRows(workflow.studies, workflow.safetyCases);
  const totalEnrolled = reportRows.reduce((total, row) => total + row.enrolled, 0);
  const totalTarget = reportRows.reduce((total, row) => total + row.target, 0);
  const recruitmentPercent = totalTarget ? Math.round(totalEnrolled / totalTarget * 100) : 0;
  const openSaes = reportRows.reduce((total, row) => total + row.openSaes, 0);
  const meanCompleteness = reportRows.length ? Math.round(reportRows.reduce((total, row) => total + row.dataCompleteness, 0) / reportRows.length) : 0;
  const recruitmentData = reportRows.map((row) => ({ study: row.studyId.replace("AIIA-", ""), Enrolled: row.enrolled, Remaining: Math.max(0, row.target - row.enrolled) }));
  const qualityData = reportRows.map((row) => ({ study: row.studyId.replace("AIIA-", ""), Completeness: row.dataCompleteness, "Open SAEs": row.openSaes * 20 }));
  const downloadReport = () => {
    if ((format === "cdisc-ts" ? downloadTsCsv(workflow.studies) : downloadClinicalReport(format, reportRows))) toast.success(format === "pdf" ? "Print-ready report opened. Choose Save as PDF in the print dialog." : `Portfolio report downloaded as ${format.toUpperCase()}.`);
    else toast.error("The report window was blocked. Allow pop-ups to create the PDF.");
  };

  return <PlatformPage eyebrow={data.eyebrow} title={data.title} description={data.description} actions={type === "exports" || type === "analytics" ? <Button onClick={downloadReport}><Download className="size-4" />Download report</Button> : <Button variant="secondary" onClick={() => toast.info("Document options are available.")}><MoreHorizontal className="size-4" />Options</Button>}>
    {type === "exports" || type === "analytics" ? <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">{data.icon}</div><div><h2 className="font-display text-lg font-semibold">{data.heading}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{data.detail}</p></div></div><div className="flex flex-wrap items-center gap-2"><label htmlFor="report-format" className="sr-only">Report format</label><select id="report-format" value={format} onChange={(event) => setFormat(event.target.value as ClinicalReportFormat)} className="h-10 min-w-40 rounded-md border border-input bg-background px-3 text-sm"><option value="pdf">PDF (print dialog)</option><option value="excel">Excel workbook (.xls)</option><option value="csv">CSV</option><option value="json">JSON</option><option value="xml">XML</option><option value="fhir">FHIR R4 Bundle JSON</option><option value="cdisc-ts">CDISC TS domain (draft, not validated)</option></select><Button onClick={downloadReport}><Download className="size-4" />Download</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Active studies", String(reportRows.length), "Current non-archived studies"], ["Recruitment", `${recruitmentPercent}%`, `${totalEnrolled} of ${totalTarget} participants enrolled`], ["Open serious events", String(openSaes), "Across the current study portfolio"], ["Data completeness", `${meanCompleteness}%`, "Mean across current report rows"]].map(([label, value, note]) => <article key={label} className="border-l-2 border-secondary bg-surface px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></article>)}</div>
      <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-lg border border-border bg-surface p-5"><div className="mb-4"><h2 className="font-display text-base font-semibold">Recruitment against target</h2><p className="mt-1 text-xs text-muted-foreground">Enrolled participants and remaining target by study</p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={recruitmentData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="study" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Legend /><Bar dataKey="Enrolled" stackId="a" fill="hsl(var(--secondary))" radius={[3, 3, 0, 0]} /><Bar dataKey="Remaining" stackId="a" fill="hsl(var(--muted))" /></BarChart></ResponsiveContainer></div></section>
        <section className="rounded-lg border border-border bg-surface p-5"><div className="mb-4"><h2 className="font-display text-base font-semibold">Data quality and safety</h2><p className="mt-1 text-xs text-muted-foreground">Completeness percentage with open SAE count scaled for comparison</p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={qualityData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="study" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Completeness" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="Open SAEs" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 4" /></LineChart></ResponsiveContainer></div></section></div>
      <section className="overflow-hidden rounded-lg border border-border bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="font-display text-base font-semibold">Study-level report</h2><p className="mt-1 text-xs text-muted-foreground">No participant identifiers are included.</p></div><StatusPill tone="neutral">{reportRows.length} current studies</StatusPill></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground"><tr>{["Study", "Phase / status", "Recruitment", "Ethics", "CTRI", "Open SAEs", "Data completeness"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{reportRows.map((row) => <tr key={row.studyId} className="border-t border-border"><td className="px-4 py-3 font-semibold text-secondary">{row.studyId}<p className="mt-1 font-normal text-muted-foreground">{row.title}</p></td><td className="px-4 py-3">{row.phase}<p className="mt-1 text-muted-foreground">{row.status}</p></td><td className="px-4 py-3">{row.enrolled} / {row.target}<div className="mt-2 w-28"><ProgressBar value={Math.min(100, Math.round(row.enrolled / Math.max(row.target, 1) * 100))} /></div></td><td className="px-4 py-3">{row.ethics}</td><td className="px-4 py-3">{row.ctri}</td><td className="px-4 py-3">{row.openSaes}</td><td className="px-4 py-3">{row.dataCompleteness}%</td></tr>)}</tbody></table></div></section>
      <p className="text-[11px] leading-5 text-muted-foreground">FHIR R4 download is not conformance-validated for ABDM exchange. CSV, JSON and XML are operational summaries, not validated SDTM, ADaM or Define-XML submissions. Review exports with qualified owners before regulatory use.</p>
    </div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]"><section className="rounded-lg border border-border bg-surface p-6"><div className="flex size-10 items-center justify-center rounded-md bg-primary/8 text-primary">{data.icon}</div><h2 className="mt-5 font-display text-xl font-semibold">{data.heading}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{data.detail}</p><div className="mt-8 space-y-4">{["Protocol and source alignment", "Data quality verification", "Responsible owner review"].map((label, index) => <div key={label} className="flex items-center gap-4 border-t border-border pt-4"><span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">0{index + 1}</span><span className="flex-1 text-sm font-medium">{label}</span><StatusPill tone={index === 0 ? "good" : index === 1 ? "warn" : "neutral"}>{index === 0 ? "Complete" : index === 1 ? "Review" : "Queued"}</StatusPill></div>)}</div></section><aside className="rounded-lg border border-border bg-muted/40 p-6"><FileText className="size-6 text-secondary" /><h2 className="mt-5 font-display text-base font-semibold">Latest activity</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The evidence set was updated by Research Operations at 14:32 today. All changes remain traceable in the audit record.</p><Button variant="secondary" className="mt-6 w-full" onClick={() => toast.info("Latest document activity: protocol amendment v3.2 was logged at 14:32.")}>View activity<ArrowUpRight className="size-4" /></Button></aside></div>}
  </PlatformPage>;
}