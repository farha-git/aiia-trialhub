import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, Check, CircleAlert, FlaskConical, Leaf, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { AttentionItem, PlatformPage, ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { Button } from "@/components/ui/button";
import { getStudyProgress, useWorkflow } from "@/components/workflow-state";
import { buildClinicalReportRows, downloadClinicalReport } from "@/lib/clinical-report";
import { calculateDeadline } from "@/lib/deadlines";
import { rulePacks } from "@/lib/rule-packs";
import { useAuth } from "@/lib/auth-context";
import { useNow } from "@/hooks/use-now";
import { can } from "@/lib/permissions";
import { computeRisk } from "@/lib/risk";

export function PortfolioWorkspace() {
  const workflow = useWorkflow();
  const { profile } = useAuth();
  const now = useNow();
  const currentTime = new Date(now.getTime() + workflow.demoClockOffsetHours * 60 * 60 * 1000);
  const reportRows = buildClinicalReportRows(workflow.studies, workflow.safetyCases);
  const activeStudies = workflow.studies.filter((study) => !study.archived);
  const totalEnrolled = reportRows.reduce((total, row) => total + row.enrolled, 0);
  const totalTarget = reportRows.reduce((total, row) => total + row.target, 0);
  const recruitment = totalTarget ? Math.round(totalEnrolled / totalTarget * 100) : null;
  const openSaes = workflow.safetyCases.filter((item) => item.severity === "SAE" && item.stage !== "closed");
  const openRisks = workflow.risks.filter((risk) => !risk.resolved);
  const closedSaes = workflow.safetyCases.filter((item) => item.severity === "SAE" && item.stage === "closed").length;
  const meanCompleteness = reportRows.length ? Math.round(reportRows.reduce((total, row) => total + row.dataCompleteness, 0) / reportRows.length) : null;
  const deadlineAlerts = [
    ...openSaes.flatMap((item) => {
      const study = workflow.studies.find((candidate) => candidate.id === item.studyId);
      const pack = rulePacks[study?.rulePack ?? "academic-asu"];
      const deadline = calculateDeadline(item.awareAt, pack.saeInitialReportHours, currentTime);
      if (deadline?.status === "green") return [];
      return [{ key: item.id, status: deadline?.status ?? "amber" as const, title: `${item.id} · ${item.title}`, meta: `${item.stage.replaceAll("-", " ")} · ${deadline?.label ?? "Not dated"}`, owner: item.owner, action: "Advance", href: `/studies/${item.studyId}`, actionDisabled: !can(profile?.role, "safety:update"), onAction: () => { if (!can(profile?.role, "safety:update")) return; void workflow.advanceSafetyCase(item.id).then(() => toast.success(`${item.id} moved to the next review step.`)).catch((error) => { console.error("Failed to persist safety stage:", error); toast.error("Failed to update safety case."); }); } }];
    }),
    ...activeStudies.flatMap((study) => {
      const alerts = [] as Array<{ key: string; status: "green" | "amber" | "red"; title: string; meta: string; owner: string; action: string; href: string; actionDisabled: boolean; onAction: () => void }>;
      if (study.ethicsExpiresOn) {
        const deadline = calculateDeadline(study.ethicsExpiresOn, 0, currentTime, rulePacks[study.rulePack].ethicsExpiryWarningDays * 24);
        if (deadline && deadline.status !== "green") alerts.push({ key: `${study.id}-ethics`, status: deadline.status, title: "Ethics approval expiry", meta: deadline.label, owner: study.lead, action: "Open", href: `/studies/${study.id}`, actionDisabled: false, onAction: () => undefined });
      }
      return alerts;
    }),
  ];
  const milestoneAlerts = workflow.milestones.filter((milestone) => !milestone.doneOn && new Date(milestone.dueOn).getTime() <= currentTime.getTime()).map((milestone) => {
    const study = workflow.studies.find((candidate) => candidate.id === milestone.studyId);
    const deadline = calculateDeadline(milestone.dueOn, 0, currentTime);
    return { key: milestone.id, status: deadline?.status ?? "red" as const, title: `Overdue ${milestone.kind.toLowerCase()}`, meta: deadline?.label ?? "Overdue", owner: study?.lead ?? "Study team", action: "Open", href: `/studies/${milestone.studyId}`, actionDisabled: false, onAction: () => undefined };
  });
  const riskAlerts = openRisks.map((risk) => {
    const study = workflow.studies.find((candidate) => candidate.id === risk.studyId);
    const result = study ? computeRisk(study, workflow.safetyCases, workflow.milestones, workflow.risks, currentTime) : null;
    return { key: risk.id, status: result?.level === "High" ? "red" as const : result?.level === "Moderate" ? "amber" as const : "green" as const, title: risk.title, meta: `${result?.level ?? "Low"} study risk · ${result?.score ?? 0}/100 · ${risk.detail}`, owner: risk.owner, action: "Resolve", href: `/studies/${risk.studyId}`, actionDisabled: !can(profile?.role, "compliance:update"), onAction: () => { if (!can(profile?.role, "compliance:update")) return; void workflow.resolveRisk(risk.id).then(() => toast.success(`${risk.title} resolved.`)).catch((error) => { console.error("Failed to persist compliance item:", error); toast.error("Failed to resolve compliance item."); }); } };
  });
  const documentBacklog = workflow.documents.filter((document) => document.status === "Draft" || document.status === "In review");
  const documentAlerts = documentBacklog.length ? [{ key: "document-review-backlog", status: "amber" as const, title: "Document review backlog", meta: `${documentBacklog.length} documents awaiting submission or review`, owner: "Document control", action: "Open", href: "/documents", actionDisabled: false, onAction: () => undefined }] : [];
  const priorities = [...deadlineAlerts, ...milestoneAlerts, ...riskAlerts, ...documentAlerts]
    .sort((left, right) => ({ red: 0, amber: 1, green: 2 }[left.status] - { red: 0, amber: 1, green: 2 }[right.status]))
    .slice(0, 6);
  const recentActions = workflow.auditEntries.slice(0, 3).map((entry) => ({ title: entry.action, detail: `${entry.studyId} · ${entry.actor}`, time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), state: "done" as const }));

  const displayName = profile?.full_name || profile?.email || "Research user";
  return <PlatformPage eyebrow={`National research portfolio · ${profile?.role ?? "Account"}`} title={`Good morning, ${displayName}`} description={`${priorities.length} matters need attention. Trial stages and KPI totals update as actions are recorded.`} actions={<Button variant="secondary" onClick={() => { if (downloadClinicalReport("pdf", reportRows)) toast.success("Print-ready weekly brief opened. Choose Save as PDF in the print dialog."); else toast.error("Allow pop-ups to open the weekly brief."); }}>Weekly brief<ArrowRight className="size-4" /></Button>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.72fr)]">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5"><div><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${priorities.length ? "bg-risk" : "bg-positive"}`} /><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-risk">Institutional attention</p></div><h2 className="mt-2 font-display text-xl font-semibold">What needs action now</h2></div><StatusPill tone={priorities.length ? "risk" : "good"}>{priorities.length} priorities</StatusPill></div>
          <div className="mt-2">{priorities.length ? priorities.map((item) => <AttentionItem key={item.key} severity={item.status === "red" ? "critical" : item.status === "amber" ? "warning" : "stable"} title={item.title} meta={item.meta} owner={item.owner} action={item.action} href={item.href} actionDisabled={item.actionDisabled} onAction={item.onAction} />) : <p className="py-5 text-sm text-muted-foreground">No urgent safety or compliance actions are open.</p>}</div>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Recruitment journey</p><h2 className="mt-1 font-display text-lg font-semibold">{totalEnrolled} of {totalTarget} participants</h2></div><span className="font-display text-2xl font-semibold">{recruitment === null ? "—" : `${recruitment}%`}</span></div><div className="mt-5"><ProgressBar value={recruitment ?? 0} /></div><div className="mt-5 grid grid-cols-3 divide-x divide-border text-center"><div><strong className="block text-sm">{Math.max(0, totalTarget - totalEnrolled)}</strong><span className="text-[11px] text-muted-foreground">Remaining</span></div><div><strong className="block text-sm">{totalEnrolled}</strong><span className="text-[11px] text-muted-foreground">Enrolled</span></div><div><strong className="block text-sm">{activeStudies.reduce((total, study) => total + study.activatedSites, 0)}</strong><span className="text-[11px] text-muted-foreground">Active sites</span></div></div></article>
          <article className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Portfolio health</p><h2 className="mt-1 font-display text-lg font-semibold">{openSaes.length + openRisks.length ? "Monitoring required" : "No open exceptions"}</h2></div><div className="grid size-14 place-items-center rounded-full border-4 border-secondary/20 font-display text-lg font-semibold text-primary">{activeStudies.length}</div></div><div className="mt-5 space-y-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Ethics-ready studies</span><strong>{activeStudies.filter((study) => ["ctri", "sites", "recruitment", "follow-up", "close-out"].includes(study.stage)).length} / {activeStudies.length}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">SAE closure</span><strong>{openSaes.length + closedSaes ? `${Math.round(closedSaes / (openSaes.length + closedSaes) * 100)}%` : "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Data completeness</span><strong>{meanCompleteness === null ? "—" : `${meanCompleteness}%`}</strong></div></div></article>
        </section>
        <section className="rounded-lg border border-border bg-surface p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Study portfolio</p><h2 className="mt-1 font-display text-xl font-semibold">Operational focus</h2></div><Button asChild variant="ghost" size="sm"><Link to="/studies">All studies<ArrowRight className="size-4" /></Link></Button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{activeStudies.slice(0, 3).map((study) => { const progress = getStudyProgress(study); const risk = computeRisk(study, workflow.safetyCases, workflow.milestones, workflow.risks, currentTime); return <Link key={study.id} to="/studies/$studyId" params={{ studyId: study.id }} className="rounded-md border border-border p-4 transition-colors hover:border-secondary/40 hover:bg-muted/40"><div className="flex justify-between gap-2"><span className="text-[10px] font-semibold text-secondary">{study.id}</span><StatusPill tone={risk.level === "High" ? "risk" : risk.level === "Moderate" ? "warn" : "good"}>{risk.level} risk · {risk.score}</StatusPill></div><h3 className="mt-3 text-sm font-semibold">{study.title}</h3><p className="mt-2 text-[11px] text-muted-foreground">{study.status}</p><div className="mt-4"><ProgressBar value={progress} tone={risk.level === "High" ? "risk" : "primary"} /></div><p className="mt-2 text-[11px] text-muted-foreground">{study.enrolled} / {study.target} enrolled</p></Link>; })}</div></section>
      </div>
      <aside className="space-y-6"><section className="rounded-lg bg-primary p-6 text-primary-foreground"><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">Safety monitoring</p><h2 className="mt-2 font-display text-xl font-semibold">Active surveillance</h2></div><ShieldCheck className="size-6 text-accent" /></div><p className="mt-5 text-4xl font-semibold">{openSaes.length}</p><p className="mt-1 text-sm text-primary-foreground/65">open serious adverse events</p><div className="mt-6 border-t border-primary-foreground/15 pt-5"><div className="flex items-center justify-between text-sm"><span>Regulatory reporting</span><strong>{openSaes.filter((item) => item.stage === "regulatory-reporting").length}</strong></div><div className="mt-3 flex items-center justify-between text-sm"><span>Follow-ups in progress</span><strong>{openSaes.filter((item) => item.stage === "follow-up").length}</strong></div></div><Button asChild variant="accent" className="mt-6 w-full"><Link to="/safety">Open safety workspace<ArrowRight className="size-4" /></Link></Button></section>
      <section className="rounded-lg border border-border bg-surface p-5"><h2 className="mb-5 font-display text-base font-semibold">Recent actions</h2>{recentActions.length ? <Timeline items={recentActions} /> : <p className="text-sm text-muted-foreground">Workflow actions will appear here as the team progresses studies.</p>}</section></aside>
    </div>
  </PlatformPage>;
}

export const capabilities = [
  ["Research Portfolio Intelligence", "See study health in context and focus institutional attention where it matters.", FlaskConical],
  ["Ethics & CTRI Readiness", "Trace approvals, registrations and protocol alignment before activation.", BookOpenCheck],
  ["Participant Lifecycle Management", "Follow consent, visits, interventions and outcomes as one continuous journey.", TrendingUp],
  ["Pharmacovigilance & SAE Monitoring", "Investigate, escalate and close safety events against regulatory timelines.", ShieldCheck],
  ["Compliance & Audit Trail", "Maintain an inspection-ready chain of decisions, documents and accountability.", Check],
  ["Standards Export (FHIR & CDISC)", "Prepare validated exchange packages with clear evidence lineage.", ArrowRight],
  ["Explainable Risk Detection", "Understand why a study is at risk, who owns it and what action is required.", CircleAlert],
] as const;