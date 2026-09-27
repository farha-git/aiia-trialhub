import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, FileText, MoreHorizontal, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PlatformHeader, ProgressBar, StatusPill, Timeline } from "@/components/trialshield";
import { Button } from "@/components/ui/button";

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
  component: StudyDetail,
});

const tabs = ["Overview", "Participants", "Visits", "Safety", "Compliance", "Documents", "Audit Trail"];

function StudyDetail() {
  const { studyId } = Route.useParams();
  const [tab, setTab] = useState("Overview");

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
              <StatusPill tone="good">Recruiting</StatusPill>
              <StatusPill tone="risk">High risk</StatusPill>
            </div>
            <h1 className="mt-3 max-w-4xl font-display text-2xl font-semibold leading-tight sm:text-3xl">Comparative efficacy of classical formulation in knee osteoarthritis</h1>
            <p className="mt-3 text-sm text-muted-foreground">Phase III · Multi-centre · Principal Investigator: Dr. Meera Nair</p>
          </div>
          <Button variant="secondary" onClick={() => toast.info(`Study actions for ${studyId}: review documents, export metrics, or inspect the audit trail.`)}>
            <MoreHorizontal className="size-4" />Study actions
          </Button>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[["Ethics status", "Approved", "Renewal 18 Mar 2027"], ["CTRI readiness", "Action needed", "1 field mismatch"], ["Recruitment", "136 / 200", "68% of target"], ["Safety", "2 open SAEs", "1 expedited review"]].map(([label, value, detail], index) => (
            <div key={label} className="bg-surface p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <div className="mt-3 flex items-center gap-2">
                {index === 0 ? <CheckCircle2 className="size-4 text-positive" /> : index === 1 || index === 3 ? <CircleAlert className="size-4 text-risk" /> : <UserRound className="size-4 text-secondary" />}
                <strong className="text-sm">{value}</strong>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
              {index === 2 && <div className="mt-3"><ProgressBar value={68} /></div>}
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
                <StatusPill tone="warn">Recruitment phase</StatusPill>
              </div>
              <div className="mt-7"><Timeline items={[{ title: "Protocol and ethics approved", detail: "Protocol v3.1 · IEC/AIIA/2026/042", time: "12 Mar", state: "done" }, { title: "CTRI registered", detail: "CTRI/2026/04/051287", time: "04 Apr", state: "done" }, { title: "Sites activated", detail: "Four sites released after readiness review", time: "28 Apr", state: "done" }, { title: "Recruitment and intervention", detail: "136 enrolled · 118 active · Site 04 below trajectory", time: "Now", state: "current" }, { title: "Protocol v3.2 reconciliation", detail: "CTRI secondary outcome wording requires correction", time: "27 Sep", state: "risk" }, { title: "Database lock", detail: "Planned after final participant follow-up", time: "Q2 2027" }]} /></div>
            </section>
            <aside className="space-y-6">
              <section className="rounded-lg border border-risk/20 bg-risk/5 p-5">
                <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-risk" /><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk">Why this study is at risk</p><h2 className="mt-2 font-display text-lg font-semibold">Two time-sensitive exceptions</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">An expedited SAE review is due within 18 hours. CTRI wording must also be aligned with protocol v3.2.</p></div></div>
                <div className="mt-5 border-t border-risk/15 pt-4"><p className="text-xs text-muted-foreground">Accountable owner</p><p className="mt-1 text-sm font-semibold">Dr. Meera Nair · Principal Investigator</p></div>
                <Button className="mt-5 w-full" onClick={() => toast.info(`Resolution plan opened for ${studyId}: review the expedited SAE and reconcile CTRI wording.`)}>Open resolution plan</Button>
              </section>
              <section className="rounded-lg border border-border bg-surface p-5"><FileText className="size-5 text-secondary" /><h2 className="mt-4 text-sm font-semibold">Intervention evidence</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Classical formulation · Batch A24-091 · 5 g twice daily with warm water · 16 weeks</p></section>
            </aside>
          </div> : <section className="rounded-lg border border-border bg-surface p-8">
            <div className="grid max-w-2xl grid-cols-[auto_minmax(0,1fr)] gap-4"><span className="grid size-10 place-items-center rounded-md bg-primary/8 text-primary"><Clock3 className="size-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">{tab}</p><h2 className="mt-1 font-display text-xl font-semibold">Study evidence view</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">This workspace keeps {tab.toLowerCase()} in the context of protocol milestones, responsible owners and the study’s complete evidence trail.</p></div></div>
            <Button className="mt-5" variant="secondary" onClick={() => toast.info(`${tab} records for ${studyId} are illustrative demo data.`)}>View {tab.toLowerCase()} records</Button>
          </section>}
        </div>
      </main>
    </div>
  );
}