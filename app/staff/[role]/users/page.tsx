// app/staff/[role]/users/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { baseStaffRole, getStaffDashboardPath } from "@/lib/roles";
import {
  subordinateDepartment,
  creatableRolesFor,
} from "@/lib/roleCreationMatrix";
import { getMySubordinateStaff } from "@/actions/staff";
import { StaffUsersList } from "@/components/staff/StaffUsersList";

export default async function StaffUsersPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");

  const { role } = await params;
  const userBaseRole = session.user.staffRole
    ? baseStaffRole(session.user.staffRole)
    : null;

  if (!userBaseRole || userBaseRole !== role) {
    const ownDashboard = session.user.staffRole
      ? getStaffDashboardPath(session.user.staffRole)
      : null;
    redirect(ownDashboard ?? "/?error=forbidden");
  }

  const dept = subordinateDepartment(session.user.staffRole);
  if (!dept) {
    redirect(
      getStaffDashboardPath(session.user.staffRole || "") ??
        "/?error=forbidden",
    );
  }

  const creatable = creatableRolesFor(session.user.staffRole || "");
  if (creatable.length === 0) {
    redirect(
      getStaffDashboardPath(session.user.staffRole || "") ??
        "/?error=forbidden",
    );
  }

  const result = await getMySubordinateStaff();
  const staff = result.success ? result.staff : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          {role.charAt(0).toUpperCase() + role.slice(1)} Accounts
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Manage the {dept}s in your department
        </p>
      </div>
      <StaffUsersList
        initialStaff={staff}
        roleName={role}
        canCreate={creatable.length > 0}
      />
    </div>
  );
}
