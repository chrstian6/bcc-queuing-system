// lib/authz.ts
// Server-action auth guards. Server actions are publicly POSTable in Next.js 16,
// so every action must verify the session itself — page-level gating is not enough.
import { auth } from "./auth";
import type { Session } from "next-auth";
import { ROLES } from "./roles";

/** Session whose user has one of the given roles, else null. */
export async function requireRole(
  ...roles: string[]
): Promise<Session | null> {
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
 * Student session with a schoolId claim. Students who logged in before the
 * schoolId claim existed carry stale JWTs — treat as unauthorized so the UI
 * can tell them to log out and back in.
 */
export async function requireStudent(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.role !== ROLES.STUDENT) return null;
  if (!session.user.schoolId) return null;
  return session;
}

export const UNAUTHORIZED_ERROR = "Unauthorized";
export const STALE_SESSION_ERROR =
  "Your session is out of date. Please log out and log back in.";
