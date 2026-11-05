// app/staff/[role]/users/create/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { baseStaffRole, getStaffDashboardPath } from "@/lib/roles";
import { creatableRolesFor } from "@/lib/roleCreationMatrix";
import { StaffCreateUserForm } from "@/components/staff/StaffCreateUserForm";

export default async function StaffCreateUserPage({
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

  const creatable = creatableRolesFor(session.user.staffRole || "");
  if (creatable.length === 0) {
    redirect(
      getStaffDashboardPath(session.user.staffRole || "") ??
        "/?error=forbidden",
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Create Staff Account
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Create a new account for a staff member in your department
        </p>
      </div>
      <StaffCreateUserForm
        allowedRoles={creatable}
        backHref={`/staff/${role}/users`}
      />
    </div>
  );
}
