// lib/roles.ts
// Single source of truth for role numbers used in the JWT `role` claim.
// "1"/"2" live in the User model; "3"-"6" live in the Staff model.

export const ROLES = {
  ADMIN: "1",
  STUDENT: "2",
  REGISTRAR: "3",
  DEAN: "4",
  DSDW: "5",
  CASHIER: "6",
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLE_NUMBERS: Record<string, number> = {
  registrar: 3,
  dean: 4,
  dsdw: 5,
  cashier: 6,
};

export const STAFF_SESSION_ROLES = ["3", "4", "5", "6"];

export function getStaffRoleNumber(roleName: string): number {
  return STAFF_ROLE_NUMBERS[roleName] || STAFF_ROLE_NUMBERS.cashier;
}

export function isStaffRole(role: number): boolean {
  return Object.values(STAFF_ROLE_NUMBERS).includes(role);
}
