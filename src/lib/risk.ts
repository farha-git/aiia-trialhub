import type { ComplianceRisk, Milestone, WorkflowSafetyCase, WorkflowStudy } from "@/components/workflow-state";
import { computeDueAt, remainingMs } from "@/lib/deadlines";
import { rulePacks } from "@/lib/rule-packs";

export type RiskFactor = { label: string; points: number; detail: string };
export type RiskResult = { score: number; level: "Low" | "Moderate" | "High"; factors: RiskFactor[] };

const LEVEL_MODERATE = 35;
const LEVEL_HIGH = 65;

export function computeRisk(study: WorkflowStudy, cases: WorkflowSafetyCase[], milestones: Milestone[], risks: ComplianceRisk[], now = new Date()): RiskResult {
  const factors: RiskFactor[] = [];
  const expected = study.startedOn && study.plannedEnd ? Math.max(0, Math.min(1, (now.getTime() - new Date(study.startedOn).getTime()) / Math.max(1, new Date(study.plannedEnd).getTime() - new Date(study.startedOn).getTime()))) : 0;
  const actual = study.target ? study.enrolled / study.target : 0;
  if (study.startedOn && study.plannedEnd && actual + 0.15 < expected) factors.push({ label: "Enrollment lag", points: 20, detail: `${Math.round(actual * 100)}% enrolled against ${Math.round(expected * 100)}% expected pace` });
  const pack = rulePacks[study.rulePack];
  const openCases = cases.filter((item) => item.studyId === study.id && item.severity === "SAE" && item.stage !== "closed");
  const overdueCases = openCases.filter((item) => item.awareAt && remainingMs(computeDueAt(item.awareAt, pack.saeInitialReportHours), now) < 0);
  if (overdueCases.length) factors.push({ label: "Overdue SAE report", points: 30, detail: `${overdueCases.length} open SAE deadline${overdueCases.length === 1 ? "" : "s"} overdue` });
  const ethicsRemaining = study.ethicsExpiresOn ? new Date(study.ethicsExpiresOn).getTime() - now.getTime() : 0;
  if (study.ethicsExpiresOn && ethicsRemaining < pack.ethicsExpiryWarningDays * 86400000) factors.push({ label: "Ethics expiry", points: ethicsRemaining < 0 ? 30 : 15, detail: ethicsRemaining < 0 ? "Approval expiry date has passed" : "Approval is within the configured warning window" });
  const openRisks = risks.filter((risk) => risk.studyId === study.id && !risk.resolved);
  if (openRisks.length) factors.push({ label: "Open compliance risks", points: Math.min(25, openRisks.length * 10), detail: `${openRisks.length} unresolved compliance item${openRisks.length === 1 ? "" : "s"}` });
  const overdueMilestones = milestones.filter((milestone) => milestone.studyId === study.id && !milestone.doneOn && new Date(milestone.dueOn).getTime() < now.getTime());
  if (overdueMilestones.length) factors.push({ label: "Overdue milestones", points: Math.min(20, overdueMilestones.length * 10), detail: `${overdueMilestones.length} milestone${overdueMilestones.length === 1 ? "" : "s"} overdue` });
  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  return { score, level: score >= LEVEL_HIGH ? "High" : score >= LEVEL_MODERATE ? "Moderate" : "Low", factors };
}
