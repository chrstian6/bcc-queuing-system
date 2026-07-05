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
  // Portals exist for cashier ("6") and registrar ("3"); dean/dsdw stay blocked
  if (!["3", "6"].includes(session.user.role || "")) {
    redirect("/?error=forbidden");
  }
  if (session.user.mustChangePassword) redirect("/change-password");

  const { role } = await params;
  const ownRole = session.user.role === "3" ? "registrar" : "cashier";
  if (role !== ownRole) redirect(`/staff/${ownRole}/dashboard`);

  const user = {
    name: session.user.name || "Staff",
    email: session.user.email || "",
    role: session.user.role || "",
    staffRole: session.user.staffRole || "cashier",
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
