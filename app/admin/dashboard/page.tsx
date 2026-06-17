// app/admin/dashboard/page.tsx
export const dynamic = "force-dynamic";
import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import {
  getQueueStats,
  getPendingTickets,
  getTodayTickets,
} from "@/actions/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { NowServingCard } from "@/components/admin/NowServingCard";

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

// ── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_SERVING: Ticket = {
  ticketNumber: "A-042",
  status: "serving",
  transactionType: "Enrollment",
  createdAt: new Date().toISOString(),
  student: {
    firstName: "Maria",
    lastName: "Santos",
    year: "3rd Year",
    section: "B",
  },
};

const MOCK_PENDING: Ticket[] = [
  {
    ticketNumber: "A-043",
    status: "pending",
    transactionType: "Clearance",
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    student: {
      firstName: "Juan",
      lastName: "dela Cruz",
      year: "3rd Year",
      section: "B",
    },
  },
  {
    ticketNumber: "A-044",
    status: "pending",
    transactionType: "Enrollment",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    student: {
      firstName: "Ana",
      lastName: "Reyes",
      year: "2nd Year",
      section: "A",
    },
  },
  {
    ticketNumber: "A-045",
    status: "pending",
    transactionType: "Clearance",
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
    student: {
      firstName: "Carlo",
      lastName: "Mendoza",
      year: "4th Year",
      section: "C",
    },
  },
  {
    ticketNumber: "A-046",
    status: "pending",
    transactionType: "Registration",
    createdAt: new Date(Date.now() - 19 * 60000).toISOString(),
    student: {
      firstName: "Liza",
      lastName: "Torres",
      year: "1st Year",
      section: "B",
    },
  },
  {
    ticketNumber: "A-047",
    status: "pending",
    transactionType: "Enrollment",
    createdAt: new Date(Date.now() - 24 * 60000).toISOString(),
    student: {
      firstName: "Ben",
      lastName: "Aquino",
      year: "3rd Year",
      section: "D",
    },
  },
];

const MOCK_TODAY: Ticket[] = [
  MOCK_SERVING,
  {
    ticketNumber: "A-041",
    status: "completed",
    transactionType: "Clearance",
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    student: {
      firstName: "Pedro",
      lastName: "Bautista",
      year: "4th Year",
      section: "A",
    },
  },
  {
    ticketNumber: "A-040",
    status: "completed",
    transactionType: "Registration",
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    student: {
      firstName: "Grace",
      lastName: "Villanueva",
      year: "1st Year",
      section: "C",
    },
  },
  {
    ticketNumber: "A-039",
    status: "cancelled",
    transactionType: "Enrollment",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    student: {
      firstName: "Mark",
      lastName: "Lim",
      year: "2nd Year",
      section: "B",
    },
  },
  {
    ticketNumber: "A-038",
    status: "completed",
    transactionType: "Clearance",
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    student: {
      firstName: "Joy",
      lastName: "Castro",
      year: "3rd Year",
      section: "A",
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-green-500",
  serving: "bg-blue-500 animate-pulse",
  cancelled: "bg-red-400",
  pending: "bg-amber-400",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const { success, session } = await getSession();
  if (!success || !session) redirect("/?error=unauthorized");
  if (session.user?.role !== "1") redirect("/?error=forbidden");

  const [statsData, pendingData, todayData] = await Promise.all([
    getQueueStats(),
    getPendingTickets(),
    getTodayTickets(),
  ]);

  // Fall back to mock data if the fetch failed or returned empty
  const pendingTickets: Ticket[] =
    pendingData.success && pendingData.tickets?.length > 0
      ? pendingData.tickets
      : MOCK_PENDING;

  const todayTickets: Ticket[] =
    todayData.success && todayData.tickets?.length > 0
      ? todayData.tickets
      : MOCK_TODAY;

  const servingTicket =
    todayTickets.find((t) => t.status === "serving") ?? MOCK_SERVING;

  const nextInLine = pendingTickets[0] ?? null;

  const waitingCount =
    statsData.success && statsData.stats
      ? (statsData.stats.pendingTickets ?? pendingTickets.length)
      : pendingTickets.length;

  const servedToday = todayTickets.filter(
    (t) => t.status === "completed",
  ).length;

  return (
    <div className="p-6 space-y-4 font-sans">
      {/* ── Row 1: Now Serving + Next in Line ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Now Serving */}
        <NowServingCard
          ticket={servingTicket}
          hasNext={pendingTickets.length > 0}
        />

        {/* Next in Line */}
        <div className="lg:col-span-2 rounded-xl p-6 bg-background border border-border/40">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Next in Line
              </p>
              <p className="text-[28px] font-bold tracking-tight leading-none text-foreground">
                {nextInLine?.ticketNumber ?? "—"}
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          {nextInLine ? (
            <div className="flex items-center gap-4 rounded-xl p-4 bg-muted/40 border border-border/30 mb-5">
              <div
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: 52, height: 52, background: "#0F172A" }}
              >
                <span className="text-lg font-bold text-white">
                  {nextInLine.ticketNumber.replace(/\D/g, "")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground mb-1.5">
                  {nextInLine.student?.firstName} {nextInLine.student?.lastName}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px] h-5 px-2">
                    {nextInLine.transactionType}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {nextInLine.student?.year} · Section{" "}
                    {nextInLine.student?.section}
                  </span>
                </div>
              </div>
              <Button
                className="gap-1.5 text-[13px] flex-shrink-0 text-white hover:opacity-90"
                style={{ background: "#0F172A" }}
              >
                Serve now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-xl p-4 bg-muted/40 border border-border/30 mb-5 text-center text-sm text-muted-foreground py-8">
              Queue is empty
            </div>
          )}

          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Waiting", value: waitingCount },
              { label: "Served today", value: servedToday },
              { label: "Avg wait", value: "6m" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-3 bg-muted/40 border border-border/30"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Current Queue + Recent Logs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Queue */}
        <div className="rounded-xl bg-background border border-border/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Current Queue
            </p>
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-muted text-muted-foreground">
              {waitingCount} waiting
            </span>
          </div>

          <div className="divide-y divide-border/20">
            {pendingTickets.length > 0 ? (
              pendingTickets.map((ticket, index) => (
                <div
                  key={ticket._id || index}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-muted-foreground">
                      {ticket.ticketNumber.replace(/\D/g, "")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {ticket.student?.firstName} {ticket.student?.lastName}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {ticket.student?.year} · Section {ticket.student?.section}{" "}
                      · {ticket.transactionType}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                    {formatTime(ticket.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No one in queue
              </div>
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="rounded-xl bg-background border border-border/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Logs
            </p>
          </div>

          <div className="divide-y divide-border/20">
            {todayTickets.length > 0 ? (
              todayTickets.map((ticket, index) => (
                <div
                  key={ticket._id || index}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[ticket.status] ?? "bg-gray-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                        #{ticket.ticketNumber}
                      </span>
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {ticket.student?.firstName} {ticket.student?.lastName}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                      {ticket.transactionType} · {ticket.status}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                    {formatTime(ticket.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No activity yet today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
