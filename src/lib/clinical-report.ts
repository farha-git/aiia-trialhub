export const clinicalReportRows = [
  { studyId: "AIIA-OA-024", title: "Knee osteoarthritis", phase: "Phase III", status: "Recruiting", enrolled: 136, target: 200, sites: 4, ethics: "Approved", ctri: "Reconciliation due", openSaes: 2, dataCompleteness: 88 },
  { studyId: "AIIA-RA-019", title: "Rheumatoid arthritis", phase: "Phase II", status: "Active", enrolled: 162, target: 200, sites: 2, ethics: "Approved", ctri: "Current", openSaes: 1, dataCompleteness: 91 },
  { studyId: "AIIA-DM-031", title: "Nishamalaki outcomes", phase: "Observational", status: "Recruiting", enrolled: 92, target: 200, sites: 3, ethics: "Renewal due", ctri: "Current", openSaes: 1, dataCompleteness: 84 },
  { studyId: "AIIA-PS-017", title: "Prakriti stratification", phase: "Registry", status: "Follow-up", enrolled: 92, target: 100, sites: 1, ethics: "Approved", ctri: "Current", openSaes: 0, dataCompleteness: 95 },
] as const;

export type ClinicalReportFormat = "csv" | "excel" | "json" | "xml" | "fhir" | "pdf";

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

function escapeXml(value: string | number) {
  return String(value).replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

function makePrintableReport() {
  const rows = clinicalReportRows.map((row) => `<tr><td>${row.studyId}</td><td>${row.title}</td><td>${row.phase}</td><td>${row.status}</td><td>${row.enrolled} / ${row.target}</td><td>${row.ethics}</td><td>${row.ctri}</td><td>${row.openSaes}</td><td>${row.dataCompleteness}%</td></tr>`).join("");
  const bars = clinicalReportRows.map((row) => `<div class="bar-row"><span>${row.studyId}</span><div class="track"><i style="width:${Math.round(row.enrolled / row.target * 100)}%"></i></div><b>${Math.round(row.enrolled / row.target * 100)}%</b></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>AIIA CTMS Portfolio Report</title><style>
    body{font:14px Arial,sans-serif;color:#1d302b;margin:36px}header{border-bottom:3px solid #397a62;padding-bottom:16px}h1{font-size:26px;margin:0 0 8px}p{color:#60716b}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.metric{background:#f0f5f1;padding:14px;border-left:3px solid #397a62}.metric b{display:block;font-size:23px}.chart{margin:24px 0}.bar-row{display:grid;grid-template-columns:130px 1fr 45px;gap:10px;align-items:center;margin:10px 0}.track{height:10px;background:#e8eeea}.track i{display:block;height:100%;background:#397a62}table{border-collapse:collapse;width:100%;font-size:11px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #dce4df}th{background:#f0f5f1}.foot{margin-top:24px;font-size:11px;color:#64736d}@media print{body{margin:16mm}.metric,.track i{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><header><h1>AIIA Clinical Trials Portfolio Report</h1><p>Problem Statement ID26046 · Synthetic demonstration data · Generated ${new Date().toLocaleString()}</p></header><section class="metrics"><div class="metric"><b>12</b>Active studies</div><div class="metric"><b>69%</b>Portfolio recruitment · 482 of 700</div><div class="metric"><b>4</b>Open SAEs</div><div class="metric"><b>90%</b>Mean data completeness</div></section><h2>Recruitment against target</h2><section class="chart">${bars}</section><h2>Study readiness and safety</h2><table><thead><tr><th>Study</th><th>Study name</th><th>Phase</th><th>Status</th><th>Enrolled</th><th>Ethics</th><th>CTRI</th><th>Open SAEs</th><th>Completeness</th></tr></thead><tbody>${rows}</tbody></table><p class="foot">Illustrative operational report only. Not a regulatory submission, validated SDTM/ADaM package, or source of clinical decisions.</p><script>window.onload=()=>window.print()</script></body></html>`;
}

export function downloadClinicalReport(format: ClinicalReportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  if (format === "pdf") {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return false;
    reportWindow.document.open();
    reportWindow.document.write(makePrintableReport());
    reportWindow.document.close();
    return true;
  }

  if (format === "csv") {
    const columns = Object.keys(clinicalReportRows[0]) as Array<keyof (typeof clinicalReportRows)[number]>;
    const lines = [columns.join(","), ...clinicalReportRows.map((row) => columns.map((column) => `"${String(row[column]).replace(/"/g, '""')}"`).join(","))];
    saveBlob(`\uFEFF${lines.join("\r\n")}`, `aiia-ctms-portfolio-${date}.csv`, "text/csv;charset=utf-8");
  } else if (format === "excel") {
    const columns = Object.keys(clinicalReportRows[0]) as Array<keyof (typeof clinicalReportRows)[number]>;
    const cells = (values: Array<string | number>) => `<Row>${values.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`).join("")}</Row>`;
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Portfolio"><Table>${cells(columns)}${clinicalReportRows.map((row) => cells(columns.map((column) => row[column]))).join("")}</Table></Worksheet></Workbook>`;
    saveBlob(workbook, `aiia-ctms-portfolio-${date}.xls`, "application/vnd.ms-excel;charset=utf-8");
  } else if (format === "json") {
    saveBlob(JSON.stringify({ generatedAt: new Date().toISOString(), synthetic: true, studies: clinicalReportRows }, null, 2), `aiia-ctms-portfolio-${date}.json`, "application/json");
  } else if (format === "xml") {
    const fields = Object.keys(clinicalReportRows[0]) as Array<keyof (typeof clinicalReportRows)[number]>;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><portfolio generatedAt="${new Date().toISOString()}" synthetic="true">${clinicalReportRows.map((row) => `<study>${fields.map((field) => `<${field}>${escapeXml(row[field])}</${field}>`).join("")}</study>`).join("")}</portfolio>`;
    saveBlob(xml, `aiia-ctms-portfolio-${date}.xml`, "application/xml");
  } else {
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"] },
      entry: clinicalReportRows.map((row) => ({
        fullUrl: `urn:uuid:${row.studyId}`,
        resource: {
          resourceType: "ResearchStudy",
          id: row.studyId,
          title: row.title,
          status: row.status === "Closed" ? "completed" : "active",
          phase: { text: row.phase },
          description: `Synthetic demonstration record. ${row.enrolled} of ${row.target} participants enrolled across ${row.sites} sites.`,
        },
      })),
    };
    saveBlob(JSON.stringify(bundle, null, 2), `aiia-ctms-fhir-r4-${date}.json`, "application/fhir+json");
  }
  return true;
}
