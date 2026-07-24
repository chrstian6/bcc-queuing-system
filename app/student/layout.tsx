// app/student/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");
  if (session.user.role !== "2") redirect("/?error=forbidden");

  const user = {
    name: session.user.name || "Student",
    email: session.user.email || "",
    role: session.user.role || "",
    staffRole: "",
    staffId: "",
    facultyId: "",
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
