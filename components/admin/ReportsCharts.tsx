// components/admin/ReportsCharts.tsx
"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

interface ReportsData {
  trend: { day: string; total: number; completed: number; cancelled: number }[];
  performance: {
    staffId: string;
    name: string;
    completed: number;
    avgWaitSeconds: number | null;
    avgServiceSeconds: number | null;
  }[];
  statusBreakdown: { status: string; count: number }[];
  hourly: { hour: number; count: number }[];
  documents: {
    byType: { type: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  serving: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
  processing: "#3b82f6",
  "ready-for-pickup": "#8b5cf6",
  released: "#22c55e",
  rejected: "#ef4444",
};

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 font-['Plus_Jakarta_Sans']">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function shortDay(day: string) {
  const d = new Date(day);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatType(type: string) {
  return type?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ReportsCharts({ data }: { data: ReportsData }) {
  const trendData = data.trend.map((d) => ({ ...d, label: shortDay(d.day) }));
  const perfData = data.performance.map((p) => ({
    name: p.name.split(" ")[0],
    completed: p.completed,
    avgWaitMin: p.avgWaitSeconds ? Math.round(p.avgWaitSeconds / 60) : 0,
    avgServiceMin: p.avgServiceSeconds
      ? Math.round(p.avgServiceSeconds / 60)
      : 0,
  }));
  const hourData = data.hourly.map((h) => ({
    label: `${h.hour}:00`,
    count: h.count,
  }));

  const emptyState = (
    <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Daily volume trend */}
      <Card title="Daily Volume" subtitle="Tickets over the last 14 days">
        {trendData.length === 0 ? (
          emptyState
        ) : (
          <ChartContainer
            config={{
              total: { label: "Total", color: CHART_COLORS[0] },
              completed: { label: "Completed", color: "#22c55e" },
            }}
            className="h-[240px] w-full"
          >
            <LineChart data={trendData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="var(--color-completed)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </Card>

      {/* Status breakdown donut */}
      <Card title="Ticket Status" subtitle="Distribution across all tickets">
        {data.statusBreakdown.length === 0 ? (
          emptyState
        ) : (
          <ChartContainer config={{}} className="h-[240px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data.statusBreakdown}
                dataKey="count"
                nameKey="status"
                innerRadius={55}
                outerRadius={90}
              >
                {data.statusBreakdown.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        <div className="flex flex-wrap gap-3 mt-3">
          {data.statusBreakdown.map((entry) => (
            <span
              key={entry.status}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[entry.status] || "#94a3b8",
                }}
              />
              {entry.status} ({entry.count})
            </span>
          ))}
        </div>
      </Card>

      {/* Cashier performance */}
      <Card
        title="Cashier Performance"
        subtitle="Completed tickets & average times"
      >
        {perfData.length === 0 ? (
          emptyState
        ) : (
          <ChartContainer
            config={{
              completed: { label: "Completed", color: CHART_COLORS[0] },
              avgWaitMin: { label: "Avg wait (min)", color: CHART_COLORS[1] },
              avgServiceMin: {
                label: "Avg service (min)",
                color: CHART_COLORS[2],
              },
            }}
            className="h-[240px] w-full"
          >
            <BarChart data={perfData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={4}
              />
              <Bar
                dataKey="avgWaitMin"
                fill="var(--color-avgWaitMin)"
                radius={4}
              />
              <Bar
                dataKey="avgServiceMin"
                fill="var(--color-avgServiceMin)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        )}
      </Card>

      {/* Hourly peak */}
      <Card title="Hourly Peak" subtitle="Tickets created by hour of day">
        {hourData.every((h) => h.count === 0) ? (
          emptyState
        ) : (
          <ChartContainer
            config={{ count: { label: "Tickets", color: CHART_COLORS[0] } }}
            className="h-[240px] w-full"
          >
            <BarChart data={hourData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </Card>

      {/* Document requests by type */}
      <Card title="Document Requests by Type">
        {data.documents.byType.length === 0 ? (
          emptyState
        ) : (
          <ChartContainer
            config={{ count: { label: "Requests", color: CHART_COLORS[3] } }}
            className="h-[220px] w-full"
          >
            <BarChart
              data={data.documents.byType.map((d) => ({
                label: formatType(d.type),
                count: d.count,
              }))}
              layout="vertical"
            >
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </Card>

      {/* Document requests by status */}
      <Card title="Document Requests by Status">
        {data.documents.byStatus.length === 0 ? (
          emptyState
        ) : (
          <ChartContainer config={{}} className="h-[220px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data.documents.byStatus}
                dataKey="count"
                nameKey="status"
                outerRadius={85}
              >
                {data.documents.byStatus.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        <div className="flex flex-wrap gap-3 mt-3">
          {data.documents.byStatus.map((entry) => (
            <span
              key={entry.status}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[entry.status] || "#94a3b8",
                }}
              />
              {formatType(entry.status)} ({entry.count})
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
