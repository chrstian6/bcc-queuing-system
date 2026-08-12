// app/staff/[role]/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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

  // Portals exist for cashier ("6"), registrar ("3"), and dean ("4")
  const staffRoles = ["3", "4", "6"];
  if (!staffRoles.includes(session.user.role || "")) {
    redirect("/?error=forbidden");
  }

  if (session.user.mustChangePassword) redirect("/change-password");

  const { role } = await params;

  // Map role numbers to role names
  const roleMap: Record<string, string> = {
    "3": "registrar",
    "4": "dean",
    "6": "cashier",
  };
  const ownRole = roleMap[session.user.role || ""] || "cashier";

  if (role !== ownRole) redirect(`/staff/${ownRole}/dashboard`);

  const user = {
    name: session.user.name || "Staff",
    email: session.user.email || "",
    role: session.user.role || "",
    staffRole: session.user.staffRole || ownRole,
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
