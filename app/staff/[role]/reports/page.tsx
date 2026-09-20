// app/staff/[role]/reports/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Calendar,
  Activity,
  Award,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import { getStaffAllTickets } from "@/actions/ticket";
import { getDepartmentStaffCounters } from "@/actions/ticketNumberDistribution";
import {
  filterTicketsByRole,
  getTransactionLabel,
  getRoleLabel,
  getDepartmentFromRole,
  getValidTransactionTypesForRole,
} from "@/lib/ticketUtils";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

interface ReportStats {
  totalTickets: number;
  pendingTickets: number;
  servingTickets: number;
  completedTickets: number;
  cancelledTickets: number;
  averageWaitTime: number;
  averageServiceTime: number;
  totalStudents: number;
  transactionsByType: Record<string, number>;
  ticketsByDay: Record<string, number>;
  ticketsByStatus: Record<string, number>;
  peakHours: Record<string, number>;
}

interface StaffPerformance {
  staffId: string;
  staffName: string;
  counterName: string;
  isOnline: boolean;
  ticketsServed: number;
  ticketsCompleted: number;
  averageServiceTime: number;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" style={FONT}>
      <div className="h-8 w-48 bg-gray-100 rounded-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl h-64" />
        <div className="bg-gray-50 rounded-xl h-64" />
      </div>
      <div className="bg-gray-50 rounded-xl h-80" />
    </div>
  );
}

function ReportsContent() {
  const params = useParams();
  const router = useRouter();
  const role = params.role as string;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string>(role);
  const [staffId, setStaffId] = useState<string>("");
  const [stats, setStats] = useState<ReportStats>({
    totalTickets: 0,
    pendingTickets: 0,
    servingTickets: 0,
    completedTickets: 0,
    cancelledTickets: 0,
    averageWaitTime: 0,
    averageServiceTime: 0,
    totalStudents: 0,
    transactionsByType: {},
    ticketsByDay: {},
    ticketsByStatus: {},
    peakHours: {},
  });
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "all"
  >("all");
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>(
    [],
  );

  // Validate role - only staff roles allowed
  useEffect(() => {
    const validRoles = ["dean", "registrar", "cashier"];
    if (!validRoles.includes(role)) {
      router.replace(`/staff/${role}/dashboard`);
    }
  }, [role, router]);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // 1. Get session
      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.session) {
        router.push("/?error=unauthorized");
        return;
      }

      const userStaffId = sessionResult.session.user?.staffId;
      const userStaffRole = sessionResult.session.user?.staffRole || role;
      const userRole = sessionResult.session.user?.role;

      if (!userStaffId) {
        setLoadError("Staff ID not found");
        setIsLoading(false);
        return;
      }

      // Verify user's role matches the current route
      if (userStaffRole !== role && userRole !== "1") {
        setLoadError("You do not have access to this page");
        setIsLoading(false);
        return;
      }

      setStaffId(userStaffId);
      setStaffRole(userStaffRole);

      // 2. Fetch tickets using getStaffAllTickets
      const result = await getStaffAllTickets(userStaffId, {});

      if (!result.success) {
        setLoadError(result.error || "Failed to fetch reports");
        setIsLoading(false);
        return;
      }

      // 3. Filter by role (department + transaction type)
      const allTickets = filterTicketsByRole(
        result.tickets || [],
        userStaffRole,
      );

      // 4. Apply date range filter client-side
      let tickets = allTickets;
      if (dateRange !== "all") {
        const now = new Date();
        const startDate = new Date(now);

        if (dateRange === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === "week") {
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === "month") {
          startDate.setMonth(now.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
        }

        tickets = allTickets.filter(
          (t: any) => new Date(t.createdAt) >= startDate,
        );
      }

      // 5. Calculate statistics
      const totalTickets = tickets.length;
      const pendingTickets = tickets.filter(
        (t: any) => t.status === "pending" || t.status === "waiting",
      ).length;
      const servingTickets = tickets.filter(
        (t: any) => t.status === "serving",
      ).length;
      const completedTickets = tickets.filter(
        (t: any) => t.status === "completed",
      ).length;
      const cancelledTickets = tickets.filter(
        (t: any) =>
          t.status === "cancelled" ||
          t.status === "no-show" ||
          t.status === "skipped",
      ).length;

      // 6. Average wait time
      const waitTimes = tickets
        .filter((t: any) => t.waitTime)
        .map((t: any) => t.waitTime);
      const averageWaitTime =
        waitTimes.length > 0
          ? Math.round(
              waitTimes.reduce((a: number, b: number) => a + b, 0) /
                waitTimes.length /
                60,
            )
          : 0;

      // 7. Average service time
      const serviceTimes = tickets
        .filter((t: any) => t.serviceTime)
        .map((t: any) => t.serviceTime);
      const averageServiceTime =
        serviceTimes.length > 0
          ? Math.round(
              serviceTimes.reduce((a: number, b: number) => a + b, 0) /
                serviceTimes.length /
                60,
            )
          : 0;

      // 8. Unique students
      const uniqueStudents = new Set(
        tickets
          .filter((t: any) => t.student?.schoolId)
          .map((t: any) => t.student.schoolId),
      );
      const totalStudents = uniqueStudents.size;

      // 9. Transactions by type (using role-specific types)
      const validTypes = getValidTransactionTypesForRole(userStaffRole);
      const transactionsByType: Record<string, number> = {};
      validTypes.forEach((type) => {
        transactionsByType[type] = tickets.filter(
          (t: any) => t.transactionType === type,
        ).length;
      });

      // 10. Tickets by day
      const ticketsByDay: Record<string, number> = {};
      tickets.forEach((t: any) => {
        const day = new Date(t.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
      });

      // 11. Tickets by status
      const ticketsByStatus: Record<string, number> = {
        pending: pendingTickets,
        serving: servingTickets,
        completed: completedTickets,
        cancelled: cancelledTickets,
      };

      // 12. Peak hours
      const peakHours: Record<string, number> = {};
      tickets.forEach((t: any) => {
        const hour = new Date(t.createdAt).getHours();
        const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
        peakHours[hourLabel] = (peakHours[hourLabel] || 0) + 1;
      });

      setStats({
        totalTickets,
        pendingTickets,
        servingTickets,
        completedTickets,
        cancelledTickets,
        averageWaitTime,
        averageServiceTime,
        totalStudents,
        transactionsByType,
        ticketsByDay,
        ticketsByStatus,
        peakHours,
      });

      // 13. Fetch staff counters (using the resolved department)
      try {
        const department = getDepartmentFromRole(userStaffRole);
        const countersResult = await getDepartmentStaffCounters(department);

        if (countersResult.success && countersResult.counters) {
          const performance: StaffPerformance[] = countersResult.counters.map(
            (staff: any) => {
              const staffTickets = tickets.filter(
                (t: any) => t.servedBy === staff.staffId,
              );
              const completedByStaff = staffTickets.filter(
                (t: any) => t.status === "completed",
              );
              const staffServiceTimes = completedByStaff
                .filter((t: any) => t.serviceTime)
                .map((t: any) => t.serviceTime);
              const avgService =
                staffServiceTimes.length > 0
                  ? Math.round(
                      staffServiceTimes.reduce(
                        (a: number, b: number) => a + b,
                        0,
                      ) /
                        staffServiceTimes.length /
                        60,
                    )
                  : 0;

              return {
                staffId: staff.staffId,
                staffName: staff.staffName || staff.staffId,
                counterName: staff.counterName || "Counter",
                isOnline: staff.isOnline ?? false,
                ticketsServed: staffTickets.length,
                ticketsCompleted: completedByStaff.length,
                averageServiceTime: avgService,
              };
            },
          );

          performance.sort((a, b) => b.ticketsCompleted - a.ticketsCompleted);
          setStaffPerformance(performance);
        }
      } catch (err) {
        console.error("Error fetching staff counters:", err);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      setLoadError("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, router, role]);

  useEffect(() => {
    const validRoles = ["dean", "registrar", "cashier"];
    if (validRoles.includes(role)) {
      loadReports();
    }
  }, [loadReports, role]);

  const validRoles = ["dean", "registrar", "cashier"];
  if (!validRoles.includes(role)) return null;

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4"
        style={FONT}
      >
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 text-center">{loadError}</p>
        <button
          onClick={() => loadReports()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const topTransactions = Object.entries(stats.transactionsByType)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxTransactionCount =
    topTransactions.length > 0 ? topTransactions[0][1] : 1;

  const sortedPeakHours = Object.entries(stats.peakHours)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxPeakHourCount =
    sortedPeakHours.length > 0 ? sortedPeakHours[0][1] : 1;

  const sortedDays = Object.entries(stats.ticketsByDay).sort(([a], [b]) => {
    const dateA = new Date(a + " " + new Date().getFullYear());
    const dateB = new Date(b + " " + new Date().getFullYear());
    return dateA.getTime() - dateB.getTime();
  });

  const maxDayCount =
    sortedDays.length > 0 ? Math.max(...sortedDays.map(([, c]) => c)) : 1;

  const completionRate =
    stats.totalTickets > 0
      ? Math.round((stats.completedTickets / stats.totalTickets) * 100)
      : 0;

  const roleLabel = getRoleLabel(staffRole);

  return (
    <div className="space-y-6" style={FONT}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {roleLabel}&apos;s Office Reports
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Queue analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { id: "today" as const, label: "Today" },
              { id: "week" as const, label: "Week" },
              { id: "month" as const, label: "Month" },
              { id: "all" as const, label: "All" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDateRange(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  dateRange === item.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadReports()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">
              Total Tickets
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalTickets}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.totalStudents} unique students
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-yellow-50 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.pendingTickets}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.servingTickets > 0
              ? `${stats.servingTickets} currently serving`
              : "Waiting in queue"}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.completedTickets}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {completionRate}% completion rate
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-50 rounded-lg">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Cancelled</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.cancelledTickets}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.totalTickets > 0
              ? `${Math.round((stats.cancelledTickets / stats.totalTickets) * 100)}% of total`
              : "No data"}
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">
              Average Wait Time
            </p>
            <p className="text-xl font-bold text-gray-900">
              {stats.averageWaitTime > 0
                ? `${stats.averageWaitTime} min`
                : "N/A"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Time from ticket creation to serving
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-xl">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">
              Average Service Time
            </p>
            <p className="text-xl font-bold text-gray-900">
              {stats.averageServiceTime > 0
                ? `${stats.averageServiceTime} min`
                : "N/A"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Time from serving to completion
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Transactions by Type
            </h3>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          {topTransactions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No transaction data available
            </p>
          ) : (
            <div className="space-y-3">
              {topTransactions.map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {getTransactionLabel(type)}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {count}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1B5A8C] rounded-full transition-all"
                      style={{
                        width: `${(count / maxTransactionCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Peak Hours</h3>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          {sortedPeakHours.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No time data available
            </p>
          ) : (
            <div className="space-y-3">
              {sortedPeakHours.map(([hour, count]) => (
                <div key={hour}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {hour}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {count} tickets
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${(count / maxPeakHourCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Status Distribution
        </h3>
        {stats.totalTickets === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            No ticket data available
          </p>
        ) : (
          <div className="flex items-center gap-6">
            {Object.entries(stats.ticketsByStatus).map(([status, count]) => {
              const total = stats.totalTickets || 1;
              const percentage = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                pending: "bg-yellow-400",
                serving: "bg-blue-500",
                completed: "bg-green-500",
                cancelled: "bg-red-400",
              };
              return (
                <div key={status} className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {status}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[status] || "bg-gray-400"} rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 tabular-nums">
                    {count} ticket{count !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Performance */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Staff Performance
          </h3>
          <Users className="w-4 h-4 text-gray-400" />
        </div>
        {staffPerformance.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            No staff data available
          </p>
        ) : (
          <div className="space-y-3">
            {staffPerformance.map((staff, index) => (
              <div
                key={staff.staffId}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                          ? "bg-gray-200 text-gray-700"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {staff.staffName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {staff.counterName} •{" "}
                    <span
                      className={
                        staff.isOnline ? "text-green-600" : "text-gray-400"
                      }
                    >
                      {staff.isOnline ? "Online" : "Offline"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700 tabular-nums">
                      {staff.ticketsCompleted}
                    </p>
                    <p className="text-[10px] text-gray-400">Completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700 tabular-nums">
                      {staff.ticketsServed}
                    </p>
                    <p className="text-[10px] text-gray-400">Served</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700 tabular-nums">
                      {staff.averageServiceTime > 0
                        ? `${staff.averageServiceTime}m`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">Avg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Ticket Trend */}
      {sortedDays.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Daily Ticket Trend
            </h3>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-end gap-2 h-40">
            {sortedDays.map(([day, count]) => {
              const height = (count / maxDayCount) * 100;
              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  <span className="text-xs text-gray-400 tabular-nums mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </span>
                  <div
                    className="w-full bg-[#1B5A8C] rounded-t-md transition-all hover:bg-[#154874]"
                    style={{
                      height: `${height}%`,
                      minHeight: count > 0 ? "4px" : "0",
                    }}
                    title={`${day}: ${count} tickets`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 truncate">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalTickets === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            No tickets found for this period
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try selecting a different date range or check back later
          </p>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
