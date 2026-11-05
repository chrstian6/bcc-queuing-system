// lib/authz.ts
// Server-action auth guards. Server actions are publicly POSTable in Next.js 16,
// so every action must verify the session itself — page-level gating is not enough.
import { auth } from "./auth";
import type { Session } from "next-auth";
import { ROLES, baseStaffRole } from "./roles";

/** Session whose user has one of the given roles, else null. */
export async function requireRole(...roles: string[]): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.role) return null;
  return roles.includes(session.user.role) ? session : null;
}

/**
 * Admin passes; staff pass only when acting on their own staffId.
 * Guards actions like serveTicket(ticketNumber, staffId) from spoofed staffIds.
 */
export async function requireSelfStaffOrAdmin(
  targetStaffId: string,
): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.role) return null;
  if (session.user.role === ROLES.ADMIN) return session;
  if (session.user.staffId && session.user.staffId === targetStaffId) {
    return session;
  }
  return null;
}

/**
 * Student session with a schoolId claim.
 */
export async function requireStudent(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.role !== ROLES.STUDENT) return null;
  if (!session.user.schoolId) return null;
  return session;
}

/**
 * Staff session for the given department ("dean" | "registrar" | "cashier" | "dsdw").
 * Both regular (e.g. "dean") and head (e.g. "head_dean") staff pass for the
 * same department — they share authorization and the same portal.
 * Admin passes.
 */
export async function requireStaffForDepartment(
  department: string,
): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.role) return null;
  if (session.user.role === ROLES.ADMIN) return session;

  const base = session.user.staffRole
    ? baseStaffRole(session.user.staffRole)
    : null;

  if (!base) return null;
  return base === department.toLowerCase() ? session : null;
}

export const UNAUTHORIZED_ERROR = "Unauthorized";
export const STALE_SESSION_ERROR =
  "Your session is out of date. Please log out and log back in.";
