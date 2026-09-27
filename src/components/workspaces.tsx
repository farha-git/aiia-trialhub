import { Link } from "@tanstack/react-router";
import { Archive, ArrowUpRight, CheckCircle2, Download, FileText, Filter, FolderOpen, MoreHorizontal, Plus, Search, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

import { AttentionItem, PlatformPage, ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { Button } from "@/components/ui/button";
import { clinicalReportRows, downloadClinicalReport, type ClinicalReportFormat } from "@/lib/clinical-report";

const studies = [
  { id: "AIIA-OA-024", title: "Comparative efficacy of classical formulation in knee osteoarthritis", phase: "Phase III · Multi-centre", status: "Recruiting", risk: "High", progress: 68, site: "4 sites", lead: "Dr. Meera Nair" },
  { id: "AIIA-RA-019", title: "Integrative Ayurveda protocol for rheumatoid arthritis", phase: "Phase II · Interventional", status: "Active", risk: "Moderate", progress: 81, site: "2 sites", lead: "Dr. R. Kulkarni" },
  { id: "AIIA-DM-031", title: "Metabolic outcomes with Nishamalaki intervention", phase: "Observational · Cohort", status: "Recruiting", risk: "Low", progress: 46, site: "3 sites", lead: "Dr. S. Menon" },
  { id: "AIIA-PS-017", title: "Prakriti stratification in chronic psoriasis", phase: "Prospective · Registry", status: "Follow-up", risk: "Low", progress: 92, site: "1 site", lead: "Dr. A. Sharma" },
  { id: "AIIA-HT-008", title: "Completed observational care-pathway study", phase: "Observational · Cohort", status: "Closed", risk: "Low", progress: 100, site: "2 sites", lead: "Dr. N. Iyer", archived: true },
];

export function StudiesWorkspace() {
  const [query, setQuery] = useState("");
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newStudies, setNewStudies] = useState<typeof studies>([]);
  const allStudies = [...studies, ...newStudies];
  const visibleStudies = allStudies.filter((study) => Boolean(study.archived) === showArchived)
    .filter((study) => !recruitingOnly || study.status === "Recruiting")
    .filter((study) => `${study.id} ${study.title} ${study.lead}`.toLowerCase().includes(query.toLowerCase()));

  const createStudy = () => {
    const title = window.prompt("Study title");
    if (!title?.trim()) return;
    const study = { id: `AIIA-NEW-${String(newStudies.length + 1).padStart(3, "0")}`, title: title.trim(), phase: "Planning", status: "Planning", risk: "Low", progress: 0, site: "1 site", lead: "Unassigned" };
    setNewStudies((current) => [...current, study]);
    setShowArchived(false);
    toast.success(`${study.id} added to this demo session.`);
  };

  return <PlatformPage eyebrow="Study operations" title="Studies" description="Follow each protocol from ethics readiness through recruitment, intervention and close-out." actions={<Button onClick={createStudy}><Plus className="size-4" />New study</Button>}>
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 border-b border-border pb-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted-foreground"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" placeholder="Search study, investigator or CTRI ID" /></label>
        <Button variant={recruitingOnly ? "default" : "secondary"} onClick={() => setRecruitingOnly((current) => !current)}><Filter className="size-4" />{recruitingOnly ? "Recruiting only" : "Filter recruiting"}</Button><Button variant={showArchived ? "secondary" : "ghost"} onClick={() => setShowArchived((current) => !current)}><Archive className="size-4" />{showArchived ? "Current studies" : "Archived"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Showing {visibleStudies.length} {showArchived ? "archived" : "current"} {visibleStudies.length === 1 ? "study" : "studies"}</p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        {visibleStudies.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No studies match this view.</p> : visibleStudies.map((study) => <Link key={study.id} to="/studies/$studyId" params={{ studyId: study.id }} className="group grid gap-4 border-b border-border p-5 transition-colors last:border-0 hover:bg-muted/60 lg:grid-cols-[90px_minmax(0,1fr)_130px_160px_120px] lg:items-center">
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
  const [loggedEvent, setLoggedEvent] = useState("");
  const logEvent = () => {
    const event = window.prompt("Brief adverse-event description (synthetic demo only)");
    if (!event?.trim()) return;
    setLoggedEvent(event.trim());
    toast.success("Synthetic safety event added to this demo session.");
  };
  return <PlatformPage eyebrow="Pharmacovigilance" title="Safety workspace" description="Investigate serious adverse events, maintain causality evidence and keep regulatory deadlines visible." actions={<Button onClick={logEvent}><Plus className="size-4" />Log safety event</Button>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.7fr)]">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-xs"><div className="mb-2 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Needs attention</p><h2 className="mt-1 font-display text-xl font-semibold">Open SAE investigations</h2></div><StatusPill tone="risk">4 open</StatusPill></div>
        <AttentionItem severity="critical" title="SAE-2026-014 · Acute hepatic injury" meta="AIIA-OA-024 · Day 5" owner="Dr. Kavita Rao" action="Investigate" onAction={() => toast.info("SAE-2026-014 investigation opened.")} />
        <AttentionItem severity="critical" title="SAE-2026-011 · Hospitalisation" meta="AIIA-RA-019 · Follow-up overdue" owner="Safety physician" action="Review" onAction={() => toast.info("SAE-2026-011 follow-up review opened.")} />
        <AttentionItem severity="warning" title="AE cluster · Gastrointestinal symptoms" meta="6 related cases at Site 03" owner="Signal review board" action="Assess" onAction={() => toast.info("The Site 03 event cluster is queued for signal assessment.")} />
        <AttentionItem severity="stable" title="SAE-2026-009 · Fracture after fall" meta="Causality documented" owner="PI, Jaipur site" action="Close" onAction={() => toast.success("SAE-2026-009 marked ready for close-out review.")} />
        {loggedEvent && <AttentionItem severity="warning" title={`New demo event · ${loggedEvent}`} meta="AIIA-OA-024 · Just captured" owner="Safety physician" action="Review" onAction={() => toast.info("Synthetic event review opened.")} />}
      </section>
      <aside className="space-y-6"><section className="rounded-lg bg-primary p-6 text-primary-foreground"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">Nearest deadline</p><p className="mt-4 font-display text-3xl font-semibold">18h 42m</p><p className="mt-2 text-sm text-primary-foreground/70">Expedited ethics notification for SAE-2026-014</p><Button variant="accent" className="mt-6 w-full" onClick={() => toast.info("SAE-2026-014 case file opened in this demo workspace.")}>Open case file<ArrowUpRight className="size-4" /></Button></section>
      <section className="rounded-lg border border-border bg-surface p-5"><h2 className="mb-5 font-display text-base font-semibold">Review workflow</h2><Timeline items={[{ title: "Initial report captured", detail: "Site 02 submitted complete source packet", time: "09:12", state: "done" }, { title: "Medical review", detail: "Causality and expectedness assessment", time: "Now", state: "current" }, { title: "Ethics notification", detail: "Due before 08:00 tomorrow", time: "18h", state: "risk" }, { title: "Follow-up evidence", detail: "Awaiting discharge summary", time: "Open" }]} /></section></aside>
    </div>
  </PlatformPage>;
}

export function ComplianceWorkspace() {
  const [resolvedRisks, setResolvedRisks] = useState<string[]>([]);
  return <PlatformPage eyebrow="Governance" title="Compliance center" description="A single evidence trail for ethics approvals, CTRI readiness, amendments and institutional review." actions={<Button variant="secondary" onClick={() => { const opened = downloadClinicalReport("pdf"); if (opened) toast.success("Print-ready audit brief opened."); else toast.error("Allow pop-ups to open the audit brief."); }}><Download className="size-4" />Audit brief</Button>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <section className="rounded-lg border border-border bg-surface p-6"><div className="flex items-end justify-between border-b border-border pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Institutional evidence trail</p><h2 className="mt-1 font-display text-xl font-semibold">Readiness journey</h2></div><StatusPill tone="warn">3 actions open</StatusPill></div><div className="mt-6"><Timeline items={[{ title: "Ethics committee approval renewed", detail: "IEC/AIIA/2026/042 · Valid through 18 March 2027", time: "12 Sep", state: "done" }, { title: "Protocol amendment v3.2 submitted", detail: "Dosing window and laboratory schedule updated", time: "18 Sep", state: "current" }, { title: "CTRI record requires reconciliation", detail: "Secondary outcome wording differs from approved protocol", time: "Due 27 Sep", state: "risk" }, { title: "Site delegation log review", detail: "Signatures pending from two research coordinators", time: "Due 30 Sep" }, { title: "Quarterly internal audit", detail: "Evidence collection opens next week", time: "03 Oct" }]} /></div></section>
      <aside className="space-y-4"><h2 className="font-display text-base font-semibold">Open compliance risks</h2>{[
        ["CTRI outcome mismatch", "AIIA-OA-024", "Regulatory owner", "High"], ["Expired GCP certificate", "Site 04 · Investigator 07", "Site lead", "Medium"], ["Consent form superseded", "AIIA-DM-031", "Document controller", "Medium"],
      ].filter(([title]) => !resolvedRisks.includes(title)).map(([title, meta, owner, risk]) => <article key={title} className="rounded-lg border border-border bg-surface p-5"><div className="flex items-start justify-between gap-4"><ShieldAlert className="size-5 text-risk" /><StatusPill tone={risk === "High" ? "risk" : "warn"}>{risk}</StatusPill></div><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{meta}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-muted-foreground">{owner}</span><Button variant="ghost" size="sm" onClick={() => { setResolvedRisks((current) => [...current, title]); toast.success(`${title} marked resolved for this demo session.`); }}>Resolve<ArrowUpRight className="size-3.5" /></Button></div></article>)}</aside>
    </div>
  </PlatformPage>;
}

const utilityContent = {
  analytics: { eyebrow: "Research intelligence", title: "Analytics", description: "Portfolio performance, recruitment trends, safety oversight and data quality in one report.", icon: <CheckCircle2 className="size-5" />, heading: "Portfolio signal review", detail: "Recruitment velocity has stabilised across three studies. Site 04 remains the only material source of protocol deviation risk." },
  documents: { eyebrow: "Controlled evidence", title: "Documents", description: "Versioned protocols, approvals, source evidence and safety records arranged by study journey.", icon: <FolderOpen className="size-5" />, heading: "Evidence requiring review", detail: "Four documents are awaiting signatures or classification before they can enter the audit-ready record." },
  exports: { eyebrow: "Standards exchange", title: "Exports", description: "Create a visual portfolio report or download synthetic study metrics for review and interoperability demonstrations.", icon: <Download className="size-5" />, heading: "Portfolio report", detail: "Study-level recruitment, ethics, CTRI, safety and data-completeness metrics. Export formats include Excel workbook, CSV, JSON, XML, FHIR R4 JSON and print-to-PDF." },
} as const;

export function UtilityWorkspace({ type }: { type: keyof typeof utilityContent }) {
  const data = utilityContent[type];
  const [format, setFormat] = useState<ClinicalReportFormat>("pdf");
  const recruitmentData = clinicalReportRows.map((row) => ({ study: row.studyId.replace("AIIA-", ""), Enrolled: row.enrolled, Remaining: row.target - row.enrolled }));
  const qualityData = clinicalReportRows.map((row) => ({ study: row.studyId.replace("AIIA-", ""), Completeness: row.dataCompleteness, "Open SAEs": row.openSaes * 20 }));
  const downloadReport = () => {
    if (downloadClinicalReport(format)) toast.success(format === "pdf" ? "Print-ready report opened. Choose Save as PDF in the print dialog." : `Portfolio report downloaded as ${format.toUpperCase()}.`);
    else toast.error("The report window was blocked. Allow pop-ups to create the PDF.");
  };

  return <PlatformPage eyebrow={data.eyebrow} title={data.title} description={data.description} actions={type === "exports" || type === "analytics" ? <Button onClick={downloadReport}><Download className="size-4" />Download report</Button> : <Button variant="secondary" onClick={() => toast.info("Document options are available in this synthetic demonstration.")}><MoreHorizontal className="size-4" />Options</Button>}>
    {type === "exports" || type === "analytics" ? <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">{data.icon}</div><div><h2 className="font-display text-lg font-semibold">{data.heading}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{data.detail}</p></div></div><div className="flex flex-wrap items-center gap-2"><label htmlFor="report-format" className="sr-only">Report format</label><select id="report-format" value={format} onChange={(event) => setFormat(event.target.value as ClinicalReportFormat)} className="h-10 min-w-40 rounded-md border border-input bg-background px-3 text-sm"><option value="pdf">PDF (print dialog)</option><option value="excel">Excel workbook (.xls)</option><option value="csv">CSV</option><option value="json">JSON</option><option value="xml">XML</option><option value="fhir">FHIR R4 Bundle JSON</option></select><Button onClick={downloadReport}><Download className="size-4" />Download</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Active studies", "12", "Across interventional and observational research"], ["Recruitment", "69%", "482 of 700 participants enrolled"], ["Open serious events", "4", "2 expedited reviews require attention"], ["Data completeness", "90%", "Mean across four synthetic study records"]].map(([label, value, note]) => <article key={label} className="border-l-2 border-secondary bg-surface px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></article>)}</div>
      <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-lg border border-border bg-surface p-5"><div className="mb-4"><h2 className="font-display text-base font-semibold">Recruitment against target</h2><p className="mt-1 text-xs text-muted-foreground">Enrolled participants and remaining target by study</p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={recruitmentData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="study" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Legend /><Bar dataKey="Enrolled" stackId="a" fill="hsl(var(--secondary))" radius={[3, 3, 0, 0]} /><Bar dataKey="Remaining" stackId="a" fill="hsl(var(--muted))" /></BarChart></ResponsiveContainer></div></section>
        <section className="rounded-lg border border-border bg-surface p-5"><div className="mb-4"><h2 className="font-display text-base font-semibold">Data quality and safety</h2><p className="mt-1 text-xs text-muted-foreground">Completeness percentage with open SAE count scaled for comparison</p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={qualityData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="study" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Completeness" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="Open SAEs" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 4" /></LineChart></ResponsiveContainer></div></section></div>
      <section className="overflow-hidden rounded-lg border border-border bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="font-display text-base font-semibold">Study-level report</h2><p className="mt-1 text-xs text-muted-foreground">Synthetic demonstration data only; no participant identifiers included.</p></div><StatusPill tone="neutral">{clinicalReportRows.length} sample studies</StatusPill></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground"><tr>{["Study", "Phase / status", "Recruitment", "Ethics", "CTRI", "Open SAEs", "Data completeness"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{clinicalReportRows.map((row) => <tr key={row.studyId} className="border-t border-border"><td className="px-4 py-3 font-semibold text-secondary">{row.studyId}<p className="mt-1 font-normal text-muted-foreground">{row.title}</p></td><td className="px-4 py-3">{row.phase}<p className="mt-1 text-muted-foreground">{row.status}</p></td><td className="px-4 py-3">{row.enrolled} / {row.target}<div className="mt-2 w-28"><ProgressBar value={Math.round(row.enrolled / row.target * 100)} /></div></td><td className="px-4 py-3">{row.ethics}</td><td className="px-4 py-3">{row.ctri}</td><td className="px-4 py-3">{row.openSaes}</td><td className="px-4 py-3">{row.dataCompleteness}%</td></tr>)}</tbody></table></div></section>
      <p className="text-[11px] leading-5 text-muted-foreground">FHIR R4 download is a demonstration Bundle, not a conformance-validated ABDM exchange. CSV, JSON and XML are operational summaries, not validated SDTM, ADaM or Define-XML submissions. Data is synthetic and must not be used for care or regulatory decisions.</p>
    </div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]"><section className="rounded-lg border border-border bg-surface p-6"><div className="flex size-10 items-center justify-center rounded-md bg-primary/8 text-primary">{data.icon}</div><h2 className="mt-5 font-display text-xl font-semibold">{data.heading}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{data.detail}</p><div className="mt-8 space-y-4">{["Protocol and source alignment", "Data quality verification", "Responsible owner review"].map((label, index) => <div key={label} className="flex items-center gap-4 border-t border-border pt-4"><span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">0{index + 1}</span><span className="flex-1 text-sm font-medium">{label}</span><StatusPill tone={index === 0 ? "good" : index === 1 ? "warn" : "neutral"}>{index === 0 ? "Complete" : index === 1 ? "Review" : "Queued"}</StatusPill></div>)}</div></section><aside className="rounded-lg border border-border bg-muted/40 p-6"><FileText className="size-6 text-secondary" /><h2 className="mt-5 font-display text-base font-semibold">Latest activity</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The evidence set was updated by Research Operations at 14:32 today. All changes remain traceable in the audit record.</p><Button variant="secondary" className="mt-6 w-full" onClick={() => toast.info("Latest document activity: protocol amendment v3.2 was logged at 14:32.")}>View activity<ArrowUpRight className="size-4" /></Button></aside></div>}
  </PlatformPage>;
}