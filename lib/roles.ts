// lib/roles.ts
// Single source of truth for role numbers used in the JWT `role` claim.
// "1"/"2" live in the User model; "3"-"9" live in the Staff model
// (3-6 = base roles, 7-9 = head-prefixed variants that share a portal
// with their base counterpart).

export const ROLES = {
  ADMIN: "1",
  STUDENT: "2",
  REGISTRAR: "3",
  DEAN: "4",
  DSDW: "5",
  CASHIER: "6",
  HEAD_REGISTRAR: "7",
  HEAD_DEAN: "8",
  HEAD_CASHIER: "9",
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];

/** roleName (from Staff.roleName) → numeric role claim. */
export const STAFF_ROLE_NUMBERS: Record<string, number> = {
  registrar: 3,
  dean: 4,
  dsdw: 5,
  cashier: 6,
  head_registrar: 7,
  head_dean: 8,
  head_cashier: 9,
};

/** Every numeric role that is considered "staff" (base + head). */
export const STAFF_SESSION_ROLES = ["3", "4", "5", "6", "7", "8", "9"];

/** Base (non-head) department names. */
export const BASE_STAFF_ROLES = [
  "registrar",
  "dean",
  "dsdw",
  "cashier",
] as const;
export type BaseStaffRole = (typeof BASE_STAFF_ROLES)[number];

/**
 * Returns the numeric role for a Staff.roleName, or `undefined` if unknown.
 * Does NOT fall back to cashier — callers must handle `undefined`.
 */
export function getStaffRoleNumber(roleName: string): number | undefined {
  return STAFF_ROLE_NUMBERS[roleName];
}

/** True if the given numeric role belongs to a staff member (base or head). */
export function isStaffRole(role: number): boolean {
  return Object.values(STAFF_ROLE_NUMBERS).includes(role);
}

/**
 * Collapse any staff roleName to its base department.
 * "head_dean" → "dean", "dean" → "dean", "head_cashier" → "cashier", etc.
 * Returns null if unrecognized.
 */
export function baseStaffRole(roleName: string): BaseStaffRole | null {
  if (!roleName || typeof roleName !== "string") return null;
  const normalized = roleName.trim().toLowerCase();
  if ((BASE_STAFF_ROLES as readonly string[]).includes(normalized)) {
    return normalized as BaseStaffRole;
  }
  if (normalized.startsWith("head_")) {
    const base = normalized.slice("head_".length);
    if ((BASE_STAFF_ROLES as readonly string[]).includes(base)) {
      return base as BaseStaffRole;
    }
  }
  return null;
}

/**
 * Dashboard path for any staff role — head and regular land in the SAME portal.
 *   "dean"           → "/staff/dean/dashboard"
 *   "head_dean"      → "/staff/dean/dashboard"
 *   "head_registrar" → "/staff/registrar/dashboard"
 *   "head_cashier"   → "/staff/cashier/dashboard"
 * Returns null if the role is unrecognized.
 */
export function getStaffDashboardPath(roleName: string): string | null {
  const base = baseStaffRole(roleName);
  if (!base) return null;
  return `/staff/${base}/dashboard`;
}
