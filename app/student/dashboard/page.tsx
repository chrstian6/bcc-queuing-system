// app/student/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyDashboardStats, getMyTickets } from "@/actions/student";
import { ActiveTicketCard } from "@/components/student/ActiveTicketCard";

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  serving: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  serving: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

function formatTransaction(type: string) {
  return type?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "2") {
    redirect("/?error=forbidden");
  }

  const [statsResult, ticketsResult] = await Promise.all([
    getMyDashboardStats(),
    getMyTickets(),
  ]);

  const stats = statsResult.success
    ? (statsResult as any).stats
    : { activeCount: 0, completedCount: 0, totalCount: 0 };
  const recentTickets = (ticketsResult.tickets || []).slice(0, 6);
  const staleSession = !statsResult.success && statsResult.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Welcome, {session.user.name?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          School ID: {session.user.schoolId || "—"} • {session.user.year || ""}
        </p>
      </div>

      {staleSession && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-['Plus_Jakarta_Sans']">
          {statsResult.error}
        </div>
      )}

      {/* Row 1: active ticket + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActiveTicketCard />

        <div className="lg:col-span-2 rounded-xl bg-white border border-gray-200 p-6 font-['Plus_Jakarta_Sans']">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Active tickets</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">
                {stats.completedCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total tickets</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/student/documents"
              className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors"
            >
              Request a Document
            </Link>
            <Link
              href="/live-queue"
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Live Queue
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: recent tickets */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 font-['Plus_Jakarta_Sans']">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Tickets
          </h2>
          <Link
            href="/student/tickets"
            className="text-sm font-medium text-[#1B5A8C] hover:text-[#154874]"
          >
            View all
          </Link>
        </div>
        {recentTickets.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No tickets yet — get one from the home page kiosk
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentTickets.map((ticket: any) => (
              <li
                key={ticket.ticketId}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[ticket.status] || "bg-gray-300"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      #{ticket.ticketNumber} —{" "}
                      {formatTransaction(ticket.transactionType)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[ticket.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {ticket.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
