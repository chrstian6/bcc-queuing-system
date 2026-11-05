// lib/roleCreationMatrix.ts
import { baseStaffRole } from "@/lib/roles";

export type StaffRoleName =
  | "registrar"
  | "dean"
  | "dsdw"
  | "cashier"
  | "head_registrar"
  | "head_dean"
  | "head_cashier";

export const ALL_STAFF_ROLES: StaffRoleName[] = [
  "dean",
  "registrar",
  "cashier",
  "dsdw",
  "head_dean",
  "head_registrar",
  "head_cashier",
];

const CREATION_MATRIX: Record<string, StaffRoleName[]> = {
  head_dean: ["dean"],
  head_registrar: ["registrar"],
  head_cashier: ["cashier"],
};

export function creatableRolesFor(loggedInRoleName: string): StaffRoleName[] {
  const key = loggedInRoleName.trim().toLowerCase();
  if (CREATION_MATRIX[key]) return [...CREATION_MATRIX[key]];
  return [];
}

export function canCreateRole(
  loggedInRoleName: string | null | undefined,
  targetRoleName: StaffRoleName,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!loggedInRoleName) return false;
  return creatableRolesFor(loggedInRoleName).includes(targetRoleName);
}

export function subordinateDepartment(
  loggedInRoleName: string | null | undefined,
): "dean" | "registrar" | "cashier" | null {
  if (!loggedInRoleName) return null;
  const base = baseStaffRole(loggedInRoleName);
  if (base === "dean" || base === "registrar" || base === "cashier") {
    return base;
  }
  return null;
}
