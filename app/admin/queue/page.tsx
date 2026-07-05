// app/admin/queue/page.tsx
export const dynamic = "force-dynamic";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { QueueMonitor } from "@/components/admin/QueueMonitor";

export default async function AdminQueuePage() {
  const { success, session } = await getSession();
  if (!success || !session || session.user?.role !== "1") {
    redirect("/?error=forbidden");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Queue Monitor
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Live view of every cashier counter and the global queue control
        </p>
      </div>
      <QueueMonitor />
    </div>
  );
}
