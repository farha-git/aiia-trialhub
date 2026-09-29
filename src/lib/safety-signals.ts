import type { InterventionBatch, WorkflowSafetyCase } from "@/components/workflow-state";

export type SafetySignal = {
  id: string;
  title: string;
  detail: string;
  level: "High" | "Review";
  caseIds: string[];
  studyIds: string[];
};

export function detectSafetySignals(cases: WorkflowSafetyCase[], batches: InterventionBatch[]) {
  const openCases = cases.filter((item) => item.stage !== "closed");
  const signals: SafetySignal[] = [];
  const groups = new Map<string, WorkflowSafetyCase[]>();

  for (const item of openCases) {
    if (item.batchId) {
      const key = `batch:${item.batchId}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    if (item.meddraTerm?.trim()) {
      const key = `term:${item.studyId}:${item.meddraTerm.trim().toLocaleLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    if (item.interactionSuspected) {
      signals.push({
        id: `interaction:${item.id}`,
        title: "Possible herb-medicine interaction",
        detail: `${item.id} is marked for qualified interaction review${item.concomitantMeds?.length ? ` · ${item.concomitantMeds.length} concomitant medicine(s) recorded` : ""}.`,
        level: "High",
        caseIds: [item.id],
        studyIds: [item.studyId],
      });
    }
  }

  for (const [key, matchedCases] of groups) {
    const batchId = key.startsWith("batch:") ? key.slice("batch:".length) : undefined;
    const batch = batchId ? batches.find((item) => item.id === batchId) : undefined;
    if (batch && batch.coaStatus === "Failed") {
      signals.push({
        id: `failed-batch:${batch.id}`,
        title: `Safety reports linked to failed batch ${batch.lotNo}`,
        detail: `${batch.formulation} has a failed certificate of analysis. Quarantine and qualified review are required.`,
        level: "High",
        caseIds: matchedCases.map((item) => item.id),
        studyIds: [...new Set(matchedCases.map((item) => item.studyId))],
      });
    }
    if (matchedCases.length < 2) continue;

    const isBatchSignal = Boolean(batchId);
    const label = isBatchSignal ? `Batch ${batch?.lotNo ?? batchId}` : `Event term "${matchedCases[0]?.meddraTerm}"`;
    const distinctStudies = [...new Set(matchedCases.map((item) => item.studyId))];
    signals.push({
      id: key,
      title: `${label} cluster · ${matchedCases.length} open reports`,
      detail: isBatchSignal
        ? `${batch?.formulation ?? "Intervention batch"} is linked to multiple open reports.`
        : `The same MedDRA term appears in multiple open reports${distinctStudies.length > 1 ? " across studies" : " in one study"}.`,
      level: matchedCases.some((item) => item.severity === "SAE") ? "High" : "Review",
      caseIds: matchedCases.map((item) => item.id),
      studyIds: distinctStudies,
    });
  }

  return signals.sort((left, right) => Number(right.level === "High") - Number(left.level === "High") || right.caseIds.length - left.caseIds.length);
}