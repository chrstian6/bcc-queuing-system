// app/staff/[role]/settings/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffSettingsView } from "@/components/staff/StaffSettingsView";

export default async function StaffSettingsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");

  const { role } = await params;
  const userStaffRole = session.user.staffRole || "";

  // Only dean, registrar, and cashier can access settings
  const validRoles = ["dean", "registrar", "cashier"];
  if (!validRoles.includes(role) || !validRoles.includes(userStaffRole)) {
    redirect(`/staff/${userStaffRole || "cashier"}/dashboard`);
  }

  if (userStaffRole !== role) {
    redirect(`/staff/${userStaffRole}/dashboard`);
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
