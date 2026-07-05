// app/student/tickets/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentTicketsView } from "@/components/student/StudentTicketsView";

export default async function StudentTicketsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "2") {
    redirect("/?error=forbidden");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          My Tickets
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Track and review all your queue tickets
        </p>
      </div>
      <StudentTicketsView />
    </div>
  );
}
