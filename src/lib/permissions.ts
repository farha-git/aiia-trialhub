import type { AppRole } from "@/lib/auth-context";

export type Permission =
  | "users:manage"
  | "studies:view"
  | "studies:create"
  | "studies:update"
  | "enrollment:update"
  | "consent:update"
  | "visits:update"
  | "safety:view"
  | "safety:create"
  | "safety:update"
  | "compliance:view"
  | "compliance:update"
  | "analytics:view"
  | "analytics:export"
  | "documents:view"
  | "documents:manage"
  | "audit:view";

export const permissionsByRole: Record<AppRole, readonly Permission[]> = {
  ADMIN: ["users:manage", "studies:view", "studies:create", "studies:update", "enrollment:update", "consent:update", "visits:update", "safety:view", "safety:create", "safety:update", "compliance:view", "compliance:update", "analytics:view", "analytics:export", "documents:view", "documents:manage", "audit:view"],
  PI: ["studies:view", "studies:create", "studies:update", "enrollment:update", "consent:update", "visits:update", "safety:view", "compliance:view", "analytics:view", "documents:view", "documents:manage", "audit:view"],
  CRC: ["studies:view", "enrollment:update", "consent:update", "visits:update", "safety:view", "compliance:view", "analytics:view", "documents:view", "audit:view"],
  SAFETY_OFFICER: ["studies:view", "safety:view", "safety:create", "safety:update", "compliance:view", "analytics:view", "documents:view", "audit:view"],
  COMPLIANCE_OFFICER: ["studies:view", "safety:view", "compliance:view", "compliance:update", "analytics:view", "documents:view", "documents:manage", "audit:view"],
  DATA_MANAGER: ["studies:view", "safety:view", "compliance:view", "analytics:view", "analytics:export", "documents:view", "audit:view"],
};

export function can(role: AppRole | null | undefined, permission: Permission) {
  return Boolean(role && permissionsByRole[role].includes(permission));
}

export const landingPathByRole = {
  ADMIN: "/admin",
  PI: "/studies",
  CRC: "/studies",
  SAFETY_OFFICER: "/safety",
  COMPLIANCE_OFFICER: "/compliance",
  DATA_MANAGER: "/analytics",
} as const;
