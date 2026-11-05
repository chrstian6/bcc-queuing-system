// app/staff/[role]/settings/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { baseStaffRole, getStaffDashboardPath } from "@/lib/roles";
import { StaffSettingsView } from "@/components/staff/StaffSettingsView";

export default async function StaffSettingsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");

  const { role } = await params;

  // ✅ Collapse head_cashier → cashier, head_dean → dean, etc.
  const userBaseRole = session.user.staffRole
    ? baseStaffRole(session.user.staffRole)
    : null;

  // Only dean, registrar, cashier have a settings page.
  const validRoles = ["dean", "registrar", "cashier"];

  // If the URL segment isn't a real portal, or the user has no staff
  // department at all, kick them to their own dashboard (or the root).
  if (!validRoles.includes(role) || !userBaseRole) {
    const ownDashboard = session.user.staffRole
      ? getStaffDashboardPath(session.user.staffRole)
      : null;
    redirect(ownDashboard ?? "/?error=forbidden");
  }

  // Cannot view another department's settings.
  if (userBaseRole !== role) {
    const ownDashboard = getStaffDashboardPath(session.user.staffRole || "");
    redirect(ownDashboard ?? "/?error=forbidden");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Window Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Control your counter&apos;s availability, daily capacity, and
          operating hours
        </p>
      </div>
      <StaffSettingsView department={role} />
    </div>
  );
}
