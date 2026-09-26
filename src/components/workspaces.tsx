import { Link } from "@tanstack/react-router";
import { Archive, ArrowUpRight, CheckCircle2, Download, FileText, Filter, FolderOpen, MoreHorizontal, Plus, Search, ShieldAlert } from "lucide-react";

import { AttentionItem, PlatformPage, ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { Button } from "@/components/ui/button";

const studies = [
  { id: "AIIA-OA-024", title: "Comparative efficacy of classical formulation in knee osteoarthritis", phase: "Phase III · Multi-centre", status: "Recruiting", risk: "High", progress: 68, site: "4 sites", lead: "Dr. Meera Nair" },
  { id: "AIIA-RA-019", title: "Integrative Ayurveda protocol for rheumatoid arthritis", phase: "Phase II · Interventional", status: "Active", risk: "Moderate", progress: 81, site: "2 sites", lead: "Dr. R. Kulkarni" },
  { id: "AIIA-DM-031", title: "Metabolic outcomes with Nishamalaki intervention", phase: "Observational · Cohort", status: "Recruiting", risk: "Low", progress: 46, site: "3 sites", lead: "Dr. S. Menon" },
  { id: "AIIA-PS-017", title: "Prakriti stratification in chronic psoriasis", phase: "Prospective · Registry", status: "Follow-up", risk: "Low", progress: 92, site: "1 site", lead: "Dr. A. Sharma" },
];

export function StudiesWorkspace() {
  return <PlatformPage eyebrow="Study operations" title="Studies" description="Follow each protocol from ethics readiness through recruitment, intervention and close-out." actions={<Button><Plus className="size-4" />New study</Button>}>
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 border-b border-border pb-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted-foreground"><Search className="size-4" /><input className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" placeholder="Search study, investigator or CTRI ID" /></label>
        <Button variant="secondary"><Filter className="size-4" />Filter</Button><Button variant="ghost"><Archive className="size-4" />Archived</Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        {studies.map((study) => <Link key={study.id} to="/studies/$studyId" params={{ studyId: study.id }} className="group grid gap-4 border-b border-border p-5 transition-colors last:border-0 hover:bg-muted/60 lg:grid-cols-[90px_minmax(0,1fr)_130px_160px_120px] lg:items-center">
          <p className="text-[11px] font-semibold text-secondary">{study.id}</p>
          <div className="min-w-0"><h2 className="font-display text-sm font-semibold text-foreground group-hover:text-primary">{study.title}</h2><p className="mt-1 text-xs text-muted-foreground">{study.phase} · {study.site} · {study.lead}</p></div>
          <StatusPill tone={study.status === "Recruiting" ? "good" : "neutral"}>{study.status}</StatusPill>
          <div><div className="mb-2 flex justify-between text-[11px]"><span className="text-muted-foreground">Recruitment</span><strong>{study.progress}%</strong></div><ProgressBar value={study.progress} /></div>
          <div className="flex items-center justify-between"><StatusPill tone={study.risk === "High" ? "risk" : study.risk === "Moderate" ? "warn" : "good"}>{study.risk} risk</StatusPill><ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div>
        </Link>)}
      </div>
    </div>
  </PlatformPage>;
}

export function SafetyWorkspace() {
  return <PlatformPage eyebrow="Pharmacovigilance" title="Safety workspace" description="Investigate serious adverse events, maintain causality evidence and keep regulatory deadlines visible." actions={<Button><Plus className="size-4" />Log safety event</Button>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.7fr)]">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-xs"><div className="mb-2 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Needs attention</p><h2 className="mt-1 font-display text-xl font-semibold">Open SAE investigations</h2></div><StatusPill tone="risk">4 open</StatusPill></div>
        <AttentionItem severity="critical" title="SAE-2026-014 · Acute hepatic injury" meta="AIIA-OA-024 · Day 5" owner="Dr. Kavita Rao" action="Investigate" />
        <AttentionItem severity="critical" title="SAE-2026-011 · Hospitalisation" meta="AIIA-RA-019 · Follow-up overdue" owner="Safety physician" action="Review" />
        <AttentionItem severity="warning" title="AE cluster · Gastrointestinal symptoms" meta="6 related cases at Site 03" owner="Signal review board" action="Assess" />
        <AttentionItem severity="stable" title="SAE-2026-009 · Fracture after fall" meta="Causality documented" owner="PI, Jaipur site" action="Close" />
      </section>
      <aside className="space-y-6"><section className="rounded-lg bg-primary p-6 text-primary-foreground"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">Nearest deadline</p><p className="mt-4 font-display text-3xl font-semibold">18h 42m</p><p className="mt-2 text-sm text-primary-foreground/70">Expedited ethics notification for SAE-2026-014</p><Button variant="accent" className="mt-6 w-full">Open case file<ArrowUpRight className="size-4" /></Button></section>
      <section className="rounded-lg border border-border bg-surface p-5"><h2 className="mb-5 font-display text-base font-semibold">Review workflow</h2><Timeline items={[{ title: "Initial report captured", detail: "Site 02 submitted complete source packet", time: "09:12", state: "done" }, { title: "Medical review", detail: "Causality and expectedness assessment", time: "Now", state: "current" }, { title: "Ethics notification", detail: "Due before 08:00 tomorrow", time: "18h", state: "risk" }, { title: "Follow-up evidence", detail: "Awaiting discharge summary", time: "Open" }]} /></section></aside>
    </div>
  </PlatformPage>;
}

export function ComplianceWorkspace() {
  return <PlatformPage eyebrow="Governance" title="Compliance center" description="A single evidence trail for ethics approvals, CTRI readiness, amendments and institutional review." actions={<Button variant="secondary"><Download className="size-4" />Audit brief</Button>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <section className="rounded-lg border border-border bg-surface p-6"><div className="flex items-end justify-between border-b border-border pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Institutional evidence trail</p><h2 className="mt-1 font-display text-xl font-semibold">Readiness journey</h2></div><StatusPill tone="warn">3 actions open</StatusPill></div><div className="mt-6"><Timeline items={[{ title: "Ethics committee approval renewed", detail: "IEC/AIIA/2026/042 · Valid through 18 March 2027", time: "12 Sep", state: "done" }, { title: "Protocol amendment v3.2 submitted", detail: "Dosing window and laboratory schedule updated", time: "18 Sep", state: "current" }, { title: "CTRI record requires reconciliation", detail: "Secondary outcome wording differs from approved protocol", time: "Due 27 Sep", state: "risk" }, { title: "Site delegation log review", detail: "Signatures pending from two research coordinators", time: "Due 30 Sep" }, { title: "Quarterly internal audit", detail: "Evidence collection opens next week", time: "03 Oct" }]} /></div></section>
      <aside className="space-y-4"><h2 className="font-display text-base font-semibold">Open compliance risks</h2>{[
        ["CTRI outcome mismatch", "AIIA-OA-024", "Regulatory owner", "High"], ["Expired GCP certificate", "Site 04 · Investigator 07", "Site lead", "Medium"], ["Consent form superseded", "AIIA-DM-031", "Document controller", "Medium"],
      ].map(([title, meta, owner, risk]) => <article key={title} className="rounded-lg border border-border bg-surface p-5"><div className="flex items-start justify-between gap-4"><ShieldAlert className="size-5 text-risk" /><StatusPill tone={risk === "High" ? "risk" : "warn"}>{risk}</StatusPill></div><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{meta}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-muted-foreground">{owner}</span><Button variant="ghost" size="sm">Resolve<ArrowUpRight className="size-3.5" /></Button></div></article>)}</aside>
    </div>
  </PlatformPage>;
}

const utilityContent = {
  analytics: { eyebrow: "Research intelligence", title: "Analytics", description: "Study-level signals and cohort patterns, interpreted in context rather than reduced to isolated metrics.", icon: <CheckCircle2 className="size-5" />, heading: "Portfolio signal review", detail: "Recruitment velocity has stabilised across three studies. Site 04 remains the only material source of protocol deviation risk." },
  documents: { eyebrow: "Controlled evidence", title: "Documents", description: "Versioned protocols, approvals, source evidence and safety records arranged by study journey.", icon: <FolderOpen className="size-5" />, heading: "Evidence requiring review", detail: "Four documents are awaiting signatures or classification before they can enter the audit-ready record." },
  exports: { eyebrow: "Standards exchange", title: "Exports", description: "Prepare validated FHIR and CDISC packages with lineage, mapping evidence and pre-flight checks.", icon: <Download className="size-5" />, heading: "Export readiness", detail: "AIIA-OA-024 SDTM package passed 42 of 44 checks. Two terminology mappings require adjudication." },
} as const;

export function UtilityWorkspace({ type }: { type: keyof typeof utilityContent }) {
  const data = utilityContent[type];
  return <PlatformPage eyebrow={data.eyebrow} title={data.title} description={data.description} actions={<Button variant="secondary"><MoreHorizontal className="size-4" />Options</Button>}>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]"><section className="rounded-lg border border-border bg-surface p-6"><div className="flex size-10 items-center justify-center rounded-md bg-primary/8 text-primary">{data.icon}</div><h2 className="mt-5 font-display text-xl font-semibold">{data.heading}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{data.detail}</p><div className="mt-8 space-y-4">{["Protocol and source alignment", "Data quality verification", "Responsible owner review"].map((label, index) => <div key={label} className="flex items-center gap-4 border-t border-border pt-4"><span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">0{index + 1}</span><span className="flex-1 text-sm font-medium">{label}</span><StatusPill tone={index === 0 ? "good" : index === 1 ? "warn" : "neutral"}>{index === 0 ? "Complete" : index === 1 ? "Review" : "Queued"}</StatusPill></div>)}</div></section><aside className="rounded-lg border border-border bg-muted/40 p-6"><FileText className="size-6 text-secondary" /><h2 className="mt-5 font-display text-base font-semibold">Latest activity</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The evidence set was updated by Research Operations at 14:32 today. All changes remain traceable in the audit record.</p><Button variant="secondary" className="mt-6 w-full">View activity<ArrowUpRight className="size-4" /></Button></aside></div>
  </PlatformPage>;
}