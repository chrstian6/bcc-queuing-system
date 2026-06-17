// app/admin/layout.tsx
export const dynamic = "force-dynamic";
import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { success, session } = await getSession();

  if (!success || !session) {
    redirect("/?error=unauthorized");
  }

  if (session.user?.role !== "1") {
    redirect("/?error=forbidden");
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <AdminSidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={session.user} />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
