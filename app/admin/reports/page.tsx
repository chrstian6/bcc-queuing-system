// app/admin/reports/page.tsx
export const dynamic = "force-dynamic";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import {
  getDailyVolumeTrend,
  getCashierPerformance,
  getStatusBreakdown,
  getHourlyDistribution,
  getDocumentRequestBreakdown,
  getTodayOverviewStats,
} from "@/actions/analytics";
import { ReportsCharts } from "@/components/admin/ReportsCharts";

export default async function AdminReportsPage() {
  const { success, session } = await getSession();
  if (!success || !session || session.user?.role !== "1") {
    redirect("/?error=forbidden");
  }

  const [trend, performance, statusBreakdown, hourly, documents, overview] =
    await Promise.all([
      getDailyVolumeTrend(14),
      getCashierPerformance(),
      getStatusBreakdown(),
      getHourlyDistribution(),
      getDocumentRequestBreakdown(),
      getTodayOverviewStats(),
    ]);

  const stats = overview.success
    ? (overview as any).stats
    : { total: 0, completed: 0, pending: 0, avgWaitFormatted: "—" };

  const kpis = [
    { label: "Tickets today", value: stats.total },
    { label: "Completed today", value: stats.completed },
    { label: "Pending now", value: stats.pending },
    { label: "Avg wait today", value: stats.avgWaitFormatted },
  ];

  const data = {
    trend: (trend as any).trend || [],
    performance: (performance as any).performance || [],
    statusBreakdown: (statusBreakdown as any).breakdown || [],
    hourly: (hourly as any).hours || [],
    documents: {
      byType: (documents as any).byType || [],
      byStatus: (documents as any).byStatus || [],
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Reports & Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Queue performance, cashier metrics, and document request trends
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl bg-white border border-gray-200 p-5 font-['Plus_Jakarta_Sans']"
          >
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <ReportsCharts data={data} />
    </div>
  );
}
