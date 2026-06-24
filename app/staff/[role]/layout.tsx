// app/staff/[role]/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

// Valid staff roles
const validRoles = ["registrar", "dean", "dsdw", "cashier"];

export default async function StaffRoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/?error=unauthorized");
  }

  // Check if user has staff role (3, 4, 5, or 6)
  const staffRoles = ["3", "4", "5", "6"];
  if (!staffRoles.includes(session.user.role || "")) {
    redirect("/?error=forbidden");
  }

  // If must change password, redirect to standalone change password page
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  // Await the params promise
  const { role } = await params;

  // Validate the role parameter matches valid roles
  if (!validRoles.includes(role)) {
    redirect("/?error=invalid-role");
  }

  // Verify the user's role matches the URL role
  const userStaffRole = session.user.staffRole;
  if (userStaffRole && userStaffRole !== role) {
    redirect(`/staff/${userStaffRole}/dashboard`);
  }

  const user = {
    name: session.user.name || "Staff",
    email: session.user.email || "",
    role: session.user.role || "",
    staffRole: session.user.staffRole || role,
    staffId: session.user.staffId || "",
    facultyId: session.user.facultyId || "",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Dynamic Sidebar */}
      <AdminSidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader user={user} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
