// app/staff/[role]/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { getStaffQueueStats, getStaffTickets } from "@/actions/ticket";
import { getStaffDailyStats } from "@/actions/ticketNumberDistribution";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

interface Student {
  firstName: string;
  lastName: string;
  year: string;
  section: string;
}

interface Ticket {
  _id?: string;
  ticketNumber: string;
  status: "pending" | "serving" | "completed" | "cancelled";
  transactionType: string;
  createdAt: string;
  student?: Student;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTransactionType(type: string) {
  return type
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-green-500",
  serving: "bg-blue-500 animate-pulse",
  cancelled: "bg-red-400",
  pending: "bg-amber-400",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  serving: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  const { success, session } = await getSession();
  if (!success || !session) redirect("/?error=unauthorized");

  const staffRoles = ["3", "4", "5", "6"];
  if (!staffRoles.includes(session.user?.role || "")) {
    redirect("/?error=forbidden");
  }

  if (session.user?.mustChangePassword) {
    redirect("/change-password");
  }

  const staffId = session.user?.staffId || "";
  const staffName = session.user?.name || "Staff";

  // Role display names
  const roleNames: Record<string, string> = {
    registrar: "Registrar",
    dean: "Dean",
    dsdw: "DSDW",
    cashier: "Cashier",
  };
  const roleDisplayName = roleNames[role] || "Staff";

  // Fetch data
  const [queueStats, staffTickets, dailyStats] = await Promise.all([
    getStaffQueueStats(staffId),
    getStaffTickets(staffId),
    getStaffDailyStats(staffId),
  ]);

  const allTickets: Ticket[] =
    staffTickets.success && staffTickets.tickets?.length > 0
      ? staffTickets.tickets
      : [];

  const servingTicket = allTickets.find((t) => t.status === "serving") || null;
  const pendingTickets = allTickets.filter((t) => t.status === "pending");
  const completedTickets = allTickets.filter((t) => t.status === "completed");
  const recentTickets = allTickets.slice(0, 10);

  const nextInLine = pendingTickets[0] || null;

  const waitingCount =
    queueStats.success && queueStats.stats
      ? queueStats.stats.pendingInDepartment
      : pendingTickets.length;

  const servedToday =
    dailyStats.success && dailyStats.stats
      ? dailyStats.stats.ticketsServed
      : completedTickets.length;

  const currentlyServing =
    queueStats.success && queueStats.stats
      ? queueStats.stats.currentlyServing
      : servingTicket
        ? 1
        : 0;

  return (
    <div className="p-6 space-y-4 font-sans">
      {/* Welcome Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Welcome, {staffName?.split(" ")[0]}
        </h1>
        <p className="text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          {roleDisplayName} Dashboard •{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── Row 1: Now Serving + Next in Line ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Now Serving Card */}
        <div className="rounded-xl p-6 bg-gradient-to-br from-[#1B5A8C] to-[#0B3B5F] text-white">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-3 font-['Plus_Jakarta_Sans']">
            Now Serving
          </p>

          {servingTicket ? (
            <>
              <p className="text-[40px] font-bold tracking-tight leading-none mb-4 font-['Plus_Jakarta_Sans']">
                #{servingTicket.ticketNumber}
              </p>
              <div className="space-y-3">
                <p className="text-[17px] font-semibold font-['Plus_Jakarta_Sans']">
                  {servingTicket.student?.firstName}{" "}
                  {servingTicket.student?.lastName}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-0 text-[11px] font-['Plus_Jakarta_Sans']">
                    {formatTransactionType(servingTicket.transactionType)}
                  </Badge>
                </div>
                <p className="text-[11px] text-white/60 font-['Plus_Jakarta_Sans']">
                  {servingTicket.student?.year} · Section{" "}
                  {servingTicket.student?.section}
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[28px] font-bold tracking-tight leading-none mb-2 font-['Plus_Jakarta_Sans']">
                —
              </p>
              <p className="text-[13px] text-white/60 font-['Plus_Jakarta_Sans']">
                No active ticket
              </p>
            </div>
          )}
        </div>

        {/* Next in Line */}
        <div className="lg:col-span-2 rounded-xl p-6 bg-white border border-gray-200">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1 font-['Plus_Jakarta_Sans']">
                Next in Line
              </p>
              <p className="text-[28px] font-bold tracking-tight leading-none text-gray-900 font-['Plus_Jakarta_Sans']">
                {nextInLine ? `#${nextInLine.ticketNumber}` : "—"}
              </p>
            </div>
          </div>

          {nextInLine ? (
            <div className="flex items-center gap-4 rounded-xl p-4 bg-gray-50 border border-gray-100 mb-5">
              <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center flex-shrink-0 bg-[#1B5A8C]">
                <span className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                  {nextInLine.ticketNumber}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-gray-900 mb-1.5 font-['Plus_Jakarta_Sans']">
                  {nextInLine.student?.firstName} {nextInLine.student?.lastName}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[11px] h-5 px-2 font-['Plus_Jakarta_Sans']"
                  >
                    {formatTransactionType(nextInLine.transactionType)}
                  </Badge>
                  <span className="text-[11px] text-gray-500 font-['Plus_Jakarta_Sans']">
                    {nextInLine.student?.year} · Section{" "}
                    {nextInLine.student?.section}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100 mb-5 text-center text-sm text-gray-500 py-8 font-['Plus_Jakarta_Sans']">
              No pending tickets
            </div>
          )}

          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Waiting", value: waitingCount },
              { label: "Served Today", value: servedToday },
              { label: "Serving Now", value: currentlyServing },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-3 bg-gray-50 border border-gray-100"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1 font-['Plus_Jakarta_Sans']">
                  {label}
                </p>
                <p className="text-2xl font-bold tracking-tight text-gray-900 leading-none font-['Plus_Jakarta_Sans']">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: My Queue + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Queue */}
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 font-['Plus_Jakarta_Sans']">
              My Queue
            </p>
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-600 font-['Plus_Jakarta_Sans']">
              {pendingTickets.length} waiting
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingTickets.length > 0 ? (
              pendingTickets.map((ticket, index) => (
                <div
                  key={ticket._id || index}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1B5A8C]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-[#1B5A8C] font-['Plus_Jakarta_Sans']">
                      {ticket.ticketNumber}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate font-['Plus_Jakarta_Sans']">
                      {ticket.student?.firstName} {ticket.student?.lastName}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate font-['Plus_Jakarta_Sans']">
                      {ticket.student?.year} · Section {ticket.student?.section}{" "}
                      · {formatTransactionType(ticket.transactionType)}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0 font-['Plus_Jakarta_Sans']">
                    {formatTime(ticket.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-gray-500 font-['Plus_Jakarta_Sans']">
                No tickets in your queue
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 font-['Plus_Jakarta_Sans']">
              Recent Activity
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {recentTickets.length > 0 ? (
              recentTickets.map((ticket, index) => (
                <div
                  key={ticket._id || index}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[ticket.status] ?? "bg-gray-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-gray-400 tabular-nums font-['Plus_Jakarta_Sans']">
                        #{ticket.ticketNumber}
                      </span>
                      <span className="text-[13px] font-medium text-gray-900 truncate font-['Plus_Jakarta_Sans']">
                        {ticket.student?.firstName} {ticket.student?.lastName}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 font-['Plus_Jakarta_Sans'] ${STATUS_BADGE[ticket.status] || "bg-gray-100 text-gray-700"}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 capitalize font-['Plus_Jakarta_Sans']">
                      {formatTransactionType(ticket.transactionType)}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0 font-['Plus_Jakarta_Sans']">
                    {formatTime(ticket.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-gray-500 font-['Plus_Jakarta_Sans']">
                No activity yet today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
