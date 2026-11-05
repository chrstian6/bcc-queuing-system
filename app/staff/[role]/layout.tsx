// app/staff/[role]/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { baseStaffRole, getStaffDashboardPath } from "@/lib/roles";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function StaffRoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");

  const { role } = await params;

  // Collapse head_dean → dean, head_registrar → registrar, etc.
  const sessionBaseRole = session.user.staffRole
    ? baseStaffRole(session.user.staffRole)
    : null;

  if (!sessionBaseRole) {
    redirect("/?error=forbidden");
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  // Cannot visit another department's portal.
  if (role !== sessionBaseRole) {
    const ownDashboard = getStaffDashboardPath(session.user.staffRole || "");
    redirect(ownDashboard ?? "/?error=forbidden");
  }

  const user = {
    name: session.user.name || "Staff",
    email: session.user.email || "",
    role: session.user.role || "",
    staffRole: session.user.staffRole || sessionBaseRole,
    staffId: session.user.staffId || "",
    facultyId: session.user.facultyId || "",
  };

  return (
    <SidebarProvider>
      <AdminSidebar user={user} />
      <SidebarInset>
        <AdminHeader user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
