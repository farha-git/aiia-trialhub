import { CalendarClock, CheckCircle2, CircleAlert, Clock3, Download, FileCheck2, FileText, GitBranch, History, Lock, ScrollText, UserRound } from "lucide-react";

import { ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { Button } from "@/components/ui/button";

/* ---------- Participants ---------- */

const participants = [
  { id: "OA-024-0142", site: "Site 01 · Delhi", stage: 4, enrolled: "02 Sep 2026", arm: "Arm A · Classical formulation", status: "Active", tone: "good" as const },
  { id: "OA-024-0138", site: "Site 02 · Jaipur", stage: 3, enrolled: "28 Aug 2026", arm: "Arm B · Standard care", status: "Randomized", tone: "good" as const },
  { id: "OA-024-0135", site: "Site 03 · Jamnagar", stage: 2, enrolled: "Pending", arm: "Awaiting consent signature", status: "Consent", tone: "warn" as const },
  { id: "OA-024-0131", site: "Site 04 · Varanasi", stage: 1, enrolled: "Pending", arm: "Eligibility review in progress", status: "Screening", tone: "neutral" as const },
  { id: "OA-024-0127", site: "Site 01 · Delhi", stage: 0, enrolled: "—", arm: "Failed inclusion criterion 4", status: "Screen failure", tone: "risk" as const },
];

const participantStages = ["Screening", "Consent", "Enrollment", "Randomization"];

export function ParticipantsTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Participant lifecycle</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Screening to randomization</h2>
          </div>
          <StatusPill tone="good">136 enrolled</StatusPill>
        </div>
        <div className="mt-6 divide-y divide-border">
          {participants.map((p) => (
            <article key={p.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-md bg-primary/8 text-primary"><UserRound className="size-4" /></span>
                  <div>
                    <p className="text-sm font-semibold">{p.id}</p>
                    <p className="text-xs text-muted-foreground">{p.site} · {p.arm}</p>
                  </div>
                </div>
                <StatusPill tone={p.tone}>{p.status}</StatusPill>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                {participantStages.map((stage, i) => (
                  <div key={stage} className="flex flex-1 items-center gap-1.5">
                    <div className={`h-1.5 flex-1 rounded-full ${i <= p.stage ? (p.tone === "risk" ? "bg-risk/60" : "bg-secondary") : "bg-muted"}`} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
                {participantStages.map((stage, i) => <span key={stage} className={i === p.stage ? "text-foreground" : ""}>{stage}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-base font-semibold">Cohort funnel</h2>
          <div className="mt-5 space-y-4">
            {[["Screened", 214, 100], ["Consented", 168, 78], ["Enrolled", 136, 64], ["Randomized", 118, 55]].map(([label, count, pct]) => (
              <div key={label as string}>
                <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><strong>{count}</strong></div>
                <ProgressBar value={pct as number} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-warning/25 bg-warning/10 p-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Consent bottleneck at Site 03</h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Five screened participants are awaiting consent for more than 7 days. The site coordinator has been asked to schedule follow-up counselling.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="mt-4 w-full">Notify site coordinator</Button>
        </section>
      </aside>
    </div>
  );
}

/* ---------- Visits ---------- */

const visits = {
  overdue: [
    { id: "V4 · Week 8", participant: "OA-024-0119", site: "Site 04 · Varanasi", due: "Due 22 Sep", note: "WOMAC assessment and joint examination" },
    { id: "V3 · Week 4", participant: "OA-024-0124", site: "Site 04 · Varanasi", due: "Due 24 Sep", note: "Laboratory panel · LFT and RFT" },
  ],
  upcoming: [
    { id: "V5 · Week 12", participant: "OA-024-0142", site: "Site 01 · Delhi", due: "29 Sep", note: "Radiographic review · KL grading" },
    { id: "V4 · Week 8", participant: "OA-024-0138", site: "Site 02 · Jaipur", due: "01 Oct", note: "WOMAC assessment and joint examination" },
    { id: "V2 · Week 2", participant: "OA-024-0135", site: "Site 03 · Jamnagar", due: "04 Oct", note: "Tolerability check · formulation diary review" },
  ],
  completed: [
    { id: "V3 · Week 4", participant: "OA-024-0142", site: "Site 01 · Delhi", due: "Completed 19 Sep", note: "All assessments within window" },
    { id: "V2 · Week 2", participant: "OA-024-0138", site: "Site 02 · Jaipur", due: "Completed 17 Sep", note: "Minor deviation · diary returned late" },
    { id: "V1 · Baseline", participant: "OA-024-0135", site: "Site 03 · Jamnagar", due: "Completed 12 Sep", note: "Randomization completed same day" },
  ],
};

function VisitGroup({ title, tone, items, icon }: { title: string; tone: "risk" | "warn" | "good"; items: typeof visits.overdue; icon: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><span className={`grid size-8 place-items-center rounded-md ${tone === "risk" ? "bg-risk/10 text-risk" : tone === "warn" ? "bg-warning/15 text-warning-foreground" : "bg-positive/10 text-positive"}`}>{icon}</span><h2 className="font-display text-base font-semibold">{title}</h2></div>
        <StatusPill tone={tone}>{items.length}</StatusPill>
      </div>
      <div className="space-y-3">
        {items.map((v) => (
          <article key={v.id + v.participant} className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{v.id}</p>
              <span className={`text-[11px] font-medium ${tone === "risk" ? "text-risk" : "text-muted-foreground"}`}>{v.due}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{v.participant} · {v.site}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{v.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function VisitsTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {[["Visit window adherence", "94%", "Target ≥ 90%"], ["Completed visits", "412", "Across 118 randomized"], ["Missed this month", "3", "All at Site 04"]].map(([label, value, detail]) => (
          <div key={label} className="bg-surface p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <VisitGroup title="Overdue" tone="risk" items={visits.overdue} icon={<CircleAlert className="size-4" />} />
        <VisitGroup title="Upcoming" tone="warn" items={visits.upcoming} icon={<CalendarClock className="size-4" />} />
        <VisitGroup title="Completed" tone="good" items={visits.completed} icon={<CheckCircle2 className="size-4" />} />
      </div>
    </div>
  );
}

/* ---------- Safety ---------- */

export function SafetyTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Pharmacovigilance</p>
            <h2 className="mt-1 font-display text-xl font-semibold">AE / SAE workflow</h2>
          </div>
          <StatusPill tone="risk">2 open SAEs</StatusPill>
        </div>
        <div className="mt-6 space-y-4">
          {[
            { id: "SAE-2026-014", title: "Acute hepatic injury", participant: "OA-024-0142 · Arm A", seriousness: "Serious · Medically significant", causality: "Possible · under review", deadline: "Expedited ethics notification in 18h 42m", tone: "risk" as const, step: 2 },
            { id: "SAE-2026-009", title: "Fracture after fall", participant: "OA-024-0098 · Arm B", seriousness: "Serious · Hospitalisation", causality: "Not related · documented", deadline: "Closure summary due 30 Sep", tone: "warn" as const, step: 3 },
            { id: "AE-2026-047", title: "Mild gastritis", participant: "OA-024-0131 · Arm A", seriousness: "Non-serious · Grade 1", causality: "Probable · formulation related", deadline: "Routine reporting cycle", tone: "good" as const, step: 4 },
          ].map((c) => (
            <article key={c.id} className={`rounded-lg border p-5 ${c.tone === "risk" ? "border-risk/25 bg-risk/5" : "border-border"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-secondary">{c.id}</p>
                  <h3 className="mt-1 text-sm font-semibold">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.participant}</p>
                </div>
                <StatusPill tone={c.tone}>{c.tone === "risk" ? "Expedited" : c.tone === "warn" ? "Follow-up" : "Routine"}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <p className="text-muted-foreground">Seriousness: <span className="font-medium text-foreground">{c.seriousness}</span></p>
                <p className="text-muted-foreground">Causality: <span className="font-medium text-foreground">{c.causality}</span></p>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                {["Reported", "Triaged", "Medical review", "Ethics notified", "Closed"].map((s, i) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= c.step ? (c.tone === "risk" ? "bg-risk/70" : "bg-secondary") : "bg-muted"}`} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className={c.tone === "risk" ? "font-semibold text-risk" : "text-muted-foreground"}>{c.deadline}</span>
                <Button variant="ghost" size="sm">Open case</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-5 font-display text-base font-semibold">SAE-2026-014 review workflow</h2>
          <Timeline items={[
            { title: "Initial report captured", detail: "Site 01 submitted complete source packet", time: "09:12", state: "done" },
            { title: "Safety triage", detail: "Seriousness confirmed · expedited clock started", time: "11:40", state: "done" },
            { title: "Medical review", detail: "Causality and expectedness assessment", time: "Now", state: "current" },
            { title: "Ethics notification", detail: "Due before 08:00 tomorrow", time: "18h", state: "risk" },
            { title: "Follow-up evidence", detail: "Awaiting repeat LFT results", time: "Open" },
          ]} />
        </section>
        <section className="rounded-lg bg-primary p-6 text-primary-foreground">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">Reporting compliance</p>
          <p className="mt-4 font-display text-3xl font-semibold">97.2%</p>
          <p className="mt-2 text-sm text-primary-foreground/70">SAEs reported within regulatory timelines this year</p>
        </section>
      </aside>
    </div>
  );
}

/* ---------- Compliance ---------- */

export function ComplianceTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Governance</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Ethics, CTRI and amendments</h2>
          </div>
          <StatusPill tone="warn">1 action needed</StatusPill>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-lg border border-positive/25 bg-positive/5 p-5">
            <div className="flex items-center justify-between"><FileCheck2 className="size-5 text-positive" /><StatusPill tone="good">Approved</StatusPill></div>
            <h3 className="mt-4 text-sm font-semibold">Ethics committee approval</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">IEC/AIIA/2026/042 · Renewed 12 Sep 2026 · Valid through 18 March 2027</p>
          </article>
          <article className="rounded-lg border border-risk/25 bg-risk/5 p-5">
            <div className="flex items-center justify-between"><CircleAlert className="size-5 text-risk" /><StatusPill tone="risk">Action needed</StatusPill></div>
            <h3 className="mt-4 text-sm font-semibold">CTRI readiness</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">CTRI/2026/04/051287 · Secondary outcome wording differs from protocol v3.2 · Due 27 Sep</p>
          </article>
        </div>
        <h3 className="mt-8 font-display text-base font-semibold">Protocol amendments</h3>
        <div className="mt-4 divide-y divide-border">
          {[
            { v: "v3.2", date: "18 Sep 2026", change: "Dosing window widened from ±2 to ±3 days; laboratory schedule updated", status: "Submitted to IEC", tone: "warn" as const },
            { v: "v3.1", date: "12 Mar 2026", change: "Clarified rescue medication criteria for inadequate response", status: "Approved", tone: "good" as const },
            { v: "v3.0", date: "28 Jan 2026", change: "Added Site 04 (Varanasi) and updated sample size justification", status: "Approved", tone: "good" as const },
          ].map((a) => (
            <div key={a.v} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/8 text-primary"><GitBranch className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Protocol {a.v}</p>
                  <StatusPill tone={a.tone}>{a.status}</StatusPill>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.change}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.date}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-5 font-display text-base font-semibold">Readiness timeline</h2>
          <Timeline items={[
            { title: "Ethics approval renewed", detail: "IEC/AIIA/2026/042", time: "12 Sep", state: "done" },
            { title: "Amendment v3.2 submitted", detail: "Under IEC review", time: "18 Sep", state: "current" },
            { title: "CTRI reconciliation", detail: "Secondary outcome wording", time: "Due 27 Sep", state: "risk" },
            { title: "Annual continuing review", detail: "Evidence pack preparation", time: "Jan 2027" },
          ]} />
        </section>
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-base font-semibold">GCP certification</h2>
          <div className="mt-4 space-y-3 text-xs">
            {[["Investigators certified", "9 / 10", "good"], ["Site 04 · Investigator 07", "Expired 21 Sep", "risk"]].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{label}</span>
                <span className={tone === "risk" ? "font-semibold text-risk" : "font-medium"}>{value}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-4 w-full">Request renewal</Button>
        </section>
      </aside>
    </div>
  );
}

/* ---------- Documents ---------- */

const documents = [
  { name: "Clinical Study Protocol", version: "v3.2", date: "18 Sep 2026", author: "Dr. Meera Nair", status: "Submitted to IEC", tone: "warn" as const, history: ["v3.1 · 12 Mar 2026 · Approved", "v3.0 · 28 Jan 2026 · Approved", "v2.0 · 04 Nov 2025 · Superseded"] },
  { name: "Informed Consent Form (Hindi)", version: "v2.1", date: "02 Sep 2026", author: "Document controller", status: "Approved", tone: "good" as const, history: ["v2.0 · 15 Jun 2026 · Approved", "v1.0 · 28 Jan 2026 · Superseded"] },
  { name: "Case Report Form", version: "v1.4", date: "20 Aug 2026", author: "Data management", status: "Approved", tone: "good" as const, history: ["v1.3 · 30 Apr 2026 · Approved"] },
  { name: "SAE Reporting SOP", version: "v4.0", date: "10 Sep 2026", author: "Safety physician", status: "Pending signature", tone: "warn" as const, history: ["v3.2 · 11 Feb 2026 · Approved"] },
  { name: "Investigator Brochure", version: "v2.0", date: "28 Jan 2026", author: "Dr. R. Kulkarni", status: "Approved", tone: "good" as const, history: ["v1.0 · 09 Sep 2025 · Superseded"] },
];

export function DocumentsTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Controlled evidence</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Study documents and versions</h2>
          </div>
          <Button variant="secondary" size="sm"><Download className="size-4" />Export index</Button>
        </div>
        <div className="mt-6 divide-y divide-border">
          {documents.map((d) => (
            <article key={d.name} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/8 text-primary"><FileText className="size-4" /></span>
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.version} · {d.date} · {d.author}</p>
                  </div>
                </div>
                <StatusPill tone={d.tone}>{d.status}</StatusPill>
              </div>
              <div className="ml-12 mt-3 space-y-1.5 border-l-2 border-muted pl-4">
                {d.history.map((h) => <p key={h} className="text-[11px] text-muted-foreground">{h}</p>)}
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-base font-semibold">Approval queue</h2>
          <div className="mt-4 space-y-3">
            {[["SAE Reporting SOP v4.0", "Awaiting safety physician countersignature", "warn"], ["Protocol v3.2", "Under IEC review · decision expected 30 Sep", "warn"], ["ICF (Hindi) v2.1", "Approved · effective 02 Sep", "good"]].map(([title, detail, tone]) => (
              <div key={title as string} className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{title}</p><StatusPill tone={tone as "warn" | "good"}>{tone === "warn" ? "Pending" : "Done"}</StatusPill></div>
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-muted/40 p-5">
          <Lock className="size-5 text-secondary" />
          <h2 className="mt-4 text-sm font-semibold">Version control</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Superseded versions remain read-only in the audit record. Every approval carries a countersigned timestamp and reviewer identity.</p>
        </section>
      </aside>
    </div>
  );
}

/* ---------- Audit Trail ---------- */

const auditEvents = [
  { time: "Today 14:32", actor: "Dr. Kavita Rao", role: "Safety physician", action: "Updated causality assessment for SAE-2026-014", detail: "Changed from 'Unlikely' to 'Possible' after repeat LFT results", hash: "a3f8…c21e" },
  { time: "Today 09:12", actor: "Site 01 Coordinator", role: "Research coordinator", action: "Submitted SAE initial report", detail: "SAE-2026-014 · complete source packet attached", hash: "7b2d…9f04" },
  { time: "26 Sep 16:05", actor: "Dr. Meera Nair", role: "Principal Investigator", action: "Signed protocol amendment v3.2 cover sheet", detail: "Countersigned by document controller", hash: "e91a…44b7" },
  { time: "25 Sep 11:48", actor: "Data Management", role: "CDM team", action: "Locked Visit V3 data for OA-024-0142", detail: "42 fields verified · 0 open queries", hash: "5c67…d8a1" },
  { time: "24 Sep 15:20", actor: "Regulatory Affairs", role: "Regulatory owner", action: "Flagged CTRI secondary outcome mismatch", detail: "Wording differs from approved protocol v3.2", hash: "2f04…b6c9" },
  { time: "22 Sep 10:02", actor: "System", role: "Automated control", action: "Visit window alert raised", detail: "OA-024-0119 · V4 overdue at Site 04", hash: "88d3…1e52" },
];

export function AuditTrailTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Immutable record</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Activity history</h2>
          </div>
          <StatusPill tone="neutral">1,284 events</StatusPill>
        </div>
        <div className="relative mt-6 space-y-0 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
          {auditEvents.map((e) => (
            <article key={e.hash} className="relative flex gap-4 pb-6 last:pb-0">
              <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface"><History className="size-3.5 text-secondary" /></span>
              <div className="min-w-0 flex-1 rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{e.action}</p>
                  <span className="text-[11px] text-muted-foreground">{e.time}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{e.actor} · {e.role}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{e.detail}</p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">record {e.hash} · sealed</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-5">
          <ScrollText className="size-5 text-secondary" />
          <h2 className="mt-4 font-display text-base font-semibold">Integrity controls</h2>
          <div className="mt-4 space-y-3 text-xs">
            {[["Write-once storage", "Entries cannot be edited or deleted"], ["Chained checksums", "Each record verifies the previous entry"], ["Reviewer identity", "Every action carries a countersigned identity"], ["Retention", "15 years per ICMR and CDSCO guidance"]].map(([title, detail]) => (
              <div key={title} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg bg-primary p-6 text-primary-foreground">
          <Clock3 className="size-5 text-primary-foreground/70" />
          <p className="mt-4 font-display text-lg font-semibold">Last integrity verification</p>
          <p className="mt-1 text-sm text-primary-foreground/70">Completed today at 06:00 · 1,284 of 1,284 records verified</p>
          <Button variant="accent" className="mt-5 w-full">Download verification report</Button>
        </section>
      </aside>
    </div>
  );
}
