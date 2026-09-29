import type { InterventionBatch, WorkflowSafetyCase } from "@/components/workflow-state";
import { detectSafetySignals } from "@/lib/safety-signals";

export type ClinicalReportRow = {
  studyId: string;
  title: string;
  phase: string;
  status: string;
  enrolled: number;
  target: number;
  sites: number;
  ethics: string;
  ctri: string;
  openSaes: number;
  openSafetySignals: number;
  dataCompleteness: number;
};

export const clinicalReportRows: ClinicalReportRow[] = [
  { studyId: "AIIA-OA-024", title: "Knee osteoarthritis", phase: "Phase III", status: "Recruiting", enrolled: 136, target: 200, sites: 4, ethics: "Approved", ctri: "Reconciliation due", openSaes: 2, openSafetySignals: 0, dataCompleteness: 88 },
  { studyId: "AIIA-RA-019", title: "Rheumatoid arthritis", phase: "Phase II", status: "Active", enrolled: 162, target: 200, sites: 2, ethics: "Approved", ctri: "Current", openSaes: 1, openSafetySignals: 0, dataCompleteness: 91 },
  { studyId: "AIIA-DM-031", title: "Nishamalaki outcomes", phase: "Observational", status: "Recruiting", enrolled: 92, target: 200, sites: 3, ethics: "Renewal due", ctri: "Current", openSaes: 1, openSafetySignals: 0, dataCompleteness: 84 },
  { studyId: "AIIA-PS-017", title: "Prakriti stratification", phase: "Registry", status: "Follow-up", enrolled: 92, target: 100, sites: 1, ethics: "Approved", ctri: "Current", openSaes: 0, openSafetySignals: 0, dataCompleteness: 95 },
];

export function buildClinicalReportRows(
  studies: Array<{ id: string; title: string; phase: string; status: string; enrolled: number; target: number; activatedSites: number; stage: string; archived: boolean }>,
  safetyCases: WorkflowSafetyCase[],
  batches: InterventionBatch[] = [],
): ClinicalReportRow[] {
  const qualityByStudy = new Map(clinicalReportRows.map((row) => [row.studyId, row.dataCompleteness]));
  const stageRank: Record<string, number> = { protocol: 0, ethics: 1, ctri: 2, sites: 3, recruitment: 4, "follow-up": 5, "close-out": 6, closed: 7 };
  const safetySignals = detectSafetySignals(safetyCases, batches);
  return studies.filter((study) => !study.archived).map((study) => ({
    studyId: study.id,
    title: study.title,
    phase: study.phase,
    status: study.status,
    enrolled: study.enrolled,
    target: study.target,
    sites: study.activatedSites,
    ethics: (stageRank[study.stage] ?? 0) > 1 ? "Approved" : study.stage === "ethics" ? "Under review" : "Pending",
    ctri: (stageRank[study.stage] ?? 0) > 2 ? "Current" : study.stage === "ctri" ? "Registration pending" : "Pending",
    openSaes: safetyCases.filter((item) => item.studyId === study.id && item.severity === "SAE" && item.stage !== "closed").length,
    openSafetySignals: safetySignals.filter((signal) => signal.studyIds.includes(study.id)).length,
    dataCompleteness: qualityByStudy.get(study.id) ?? (study.enrolled ? 90 : 0),
  }));
}

export type ClinicalReportFormat = "csv" | "excel" | "json" | "xml" | "fhir" | "pdf" | "cdisc-ts";

function saveBlob(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildTsCsv(studies: Array<{ id: string; title: string; phase: string; target: number; startedOn?: string | undefined }>) {
  const rows = [["STUDYID", "DOMAIN", "TSSEQ", "TSPARMCD", "TSPARM", "TSVAL"]];
  studies.forEach((study) => {
    let sequence = 1;
    rows.push([study.id, "TS", String(sequence++), "TITLE", "Study Title", study.title]);
    rows.push([study.id, "TS", String(sequence++), "PLANSUB", "Planned Subjects", String(study.target)]);
    if (study.startedOn) rows.push([study.id, "TS", String(sequence++), "SSTDTC", "Study Start Date", study.startedOn.slice(0, 10)]);
    const phase = study.phase.match(/Phase (I{1,3}|IV)\b/i)?.[0];
    if (phase) rows.push([study.id, "TS", String(sequence), "TPHASE", "Trial Phase", phase.toUpperCase()]);
  });
  return rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function downloadTsCsv(studies: Array<{ id: string; title: string; phase: string; target: number; startedOn?: string | undefined }>) {
  saveBlob(`\uFEFF${buildTsCsv(studies)}`, `aiia-trialshield-ts-draft-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
  return true;
}

function escapeXml(value: string | number) {
  return String(value).replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

function makePrintableReport(reportRows: ClinicalReportRow[]) {
  const tableRows = reportRows.map((row) => `<tr><td>${row.studyId}</td><td>${row.title}</td><td>${row.phase}</td><td>${row.status}</td><td>${row.enrolled} / ${row.target}</td><td>${row.ethics}</td><td>${row.ctri}</td><td>${row.openSaes}</td><td>${row.openSafetySignals}</td><td>${row.dataCompleteness}%</td></tr>`).join("");
  const bars = reportRows.map((row) => `<div class="bar-row"><span>${row.studyId}</span><div class="track"><i style="width:${Math.round(row.enrolled / Math.max(row.target, 1) * 100)}%"></i></div><b>${Math.round(row.enrolled / Math.max(row.target, 1) * 100)}%</b></div>`).join("");
  const totalEnrolled = reportRows.reduce((total, row) => total + row.enrolled, 0);
  const totalTarget = reportRows.reduce((total, row) => total + row.target, 0);
  const recruitment = totalTarget ? Math.round(totalEnrolled / totalTarget * 100) : 0;
  const openSaes = reportRows.reduce((total, row) => total + row.openSaes, 0);
  const completeness = reportRows.length ? Math.round(reportRows.reduce((total, row) => total + row.dataCompleteness, 0) / reportRows.length) : 0;
  return `<!doctype html><html><head><meta charset="utf-8"><title>AIIA CTMS Portfolio Report</title><style>
    body{font:14px Arial,sans-serif;color:#1d302b;margin:36px}header{border-bottom:3px solid #397a62;padding-bottom:16px}h1{font-size:26px;margin:0 0 8px}p{color:#60716b}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.metric{background:#f0f5f1;padding:14px;border-left:3px solid #397a62}.metric b{display:block;font-size:23px}.chart{margin:24px 0}.bar-row{display:grid;grid-template-columns:130px 1fr 45px;gap:10px;align-items:center;margin:10px 0}.track{height:10px;background:#e8eeea}.track i{display:block;height:100%;background:#397a62}table{border-collapse:collapse;width:100%;font-size:11px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #dce4df}th{background:#f0f5f1}.foot{margin-top:24px;font-size:11px;color:#64736d}@media print{body{margin:16mm}.metric,.track i{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><header><h1>AIIA Clinical Trials Portfolio Report</h1><p>Problem Statement ID26046 · Synthetic demonstration data · Generated ${new Date().toLocaleString()}</p></header><section class="metrics"><div class="metric"><b>${reportRows.length}</b>Active studies</div><div class="metric"><b>${recruitment}%</b>Portfolio recruitment · ${totalEnrolled} of ${totalTarget}</div><div class="metric"><b>${openSaes}</b>Open SAEs</div><div class="metric"><b>${completeness}%</b>Mean data completeness</div></section><h2>Recruitment against target</h2><section class="chart">${bars}</section><h2>Study readiness and safety</h2><table><thead><tr><th>Study</th><th>Study name</th><th>Phase</th><th>Status</th><th>Enrolled</th><th>Ethics</th><th>CTRI</th><th>Open SAEs</th><th>Open safety signals</th><th>Completeness</th></tr></thead><tbody>${tableRows}</tbody></table><p class="foot">Illustrative operational report only. Not a regulatory submission, validated SDTM/ADaM package, or source of clinical decisions.</p><script>window.onload=()=>window.print()</script></body></html>`;
}

export function downloadClinicalReport(format: ClinicalReportFormat, reportRows: ClinicalReportRow[] = clinicalReportRows) {
  const date = new Date().toISOString().slice(0, 10);
  const sourceRows = reportRows.length > 0 ? reportRows : clinicalReportRows;
  const firstRow = sourceRows[0];
  if (!firstRow) return false;
  if (format === "pdf") {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return false;
    reportWindow.document.open();
    reportWindow.document.write(makePrintableReport(reportRows));
    reportWindow.document.close();
    return true;
  }

  if (format === "csv") {
    const columns = Object.keys(firstRow) as Array<keyof ClinicalReportRow>;
    const lines = [columns.join(","), ...reportRows.map((row) => columns.map((column) => `"${String(row[column]).replace(/"/g, '""')}"`).join(","))];
    saveBlob(`\uFEFF${lines.join("\r\n")}`, `aiia-ctms-portfolio-${date}.csv`, "text/csv;charset=utf-8");
  } else if (format === "excel") {
    const columns = Object.keys(firstRow) as Array<keyof ClinicalReportRow>;
    const cells = (values: Array<string | number>) => `<Row>${values.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`).join("")}</Row>`;
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Portfolio"><Table>${cells(columns)}${reportRows.map((row) => cells(columns.map((column) => row[column]))).join("")}</Table></Worksheet></Workbook>`;
    saveBlob(workbook, `aiia-ctms-portfolio-${date}.xls`, "application/vnd.ms-excel;charset=utf-8");
  } else if (format === "json") {
    saveBlob(JSON.stringify({ generatedAt: new Date().toISOString(), studies: reportRows }, null, 2), `aiia-ctms-portfolio-${date}.json`, "application/json");
  } else if (format === "xml") {
    const fields = Object.keys(firstRow) as Array<keyof ClinicalReportRow>;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><portfolio generatedAt="${new Date().toISOString()}">${reportRows.map((row) => `<study>${fields.map((field) => `<${field}>${escapeXml(row[field])}</${field}>`).join("")}</study>`).join("")}</portfolio>`;
    saveBlob(xml, `aiia-ctms-portfolio-${date}.xml`, "application/xml");
  } else {
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"] },
      entry: reportRows.map((row) => ({
        fullUrl: `urn:uuid:${row.studyId}`,
        resource: {
          resourceType: "ResearchStudy",
          id: row.studyId,
          title: row.title,
          status: row.status === "Closed" ? "completed" : "active",
          phase: { text: row.phase },
          description: `${row.enrolled} of ${row.target} participants enrolled across ${row.sites} sites.`,
        },
      })),
    };
    saveBlob(JSON.stringify(bundle, null, 2), `aiia-ctms-fhir-r4-${date}.json`, "application/fhir+json");
  }
  return true;
}
