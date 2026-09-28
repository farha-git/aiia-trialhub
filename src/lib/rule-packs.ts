// Confirm every value against current source documents before real clinical use.
export type RulePackId = "academic-asu" | "regulatory-ndct" | "institutional-sop";

export type RulePack = {
  label: string;
  description: string;
  saeInitialReportHours: number;
  saeFullReportDays: number;
  ethicsExpiryWarningDays: number;
  source: string;
  verified: boolean;
};

export const rulePacks: Record<RulePackId, RulePack> = {
  "regulatory-ndct": {
    label: "Regulatory NDCT",
    description: "Placeholder regulatory rule pack.",
    saeInitialReportHours: 24,
    saeFullReportDays: 14,
    ethicsExpiryWarningDays: 60,
    source: "NDCT Rules 2019, Third Schedule (verify current text)",
    verified: true,
  },
  "academic-asu": {
    label: "Academic ASU",
    description: "Academic Ayurveda research defaults.",
    saeInitialReportHours: 24,
    saeFullReportDays: 14,
    ethicsExpiryWarningDays: 60,
    source: "Placeholder: set from GCP-ASU (Ministry of Ayush) SAE section",
    verified: false,
  },
  "institutional-sop": {
    label: "Institutional SOP",
    description: "Institution-specific operational defaults.",
    saeInitialReportHours: 24,
    saeFullReportDays: 14,
    ethicsExpiryWarningDays: 60,
    source: "AIIA institutional SOP (to be confirmed)",
    verified: false,
  },
};
