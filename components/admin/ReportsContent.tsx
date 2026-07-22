// components/admin/ReportsContent.tsx
"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  BarChart3,
  Download,
} from "lucide-react";
import { getQueueStats } from "@/actions/ticket";
import { getAllStaff } from "@/actions/staff";

interface Stats {
  activeQueues: number;
  pendingTickets: number;
  servingTickets: number;
  completedToday: number;
  totalToday: number;
}

interface StaffMember {
  staffId: string;
  firstName: string;
  lastName: string;
  roleName: string;
  status: string;
}

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

export function ReportsContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">(
    "today",
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsResult, staffResult] = await Promise.all([
        getQueueStats(),
        getAllStaff(),
      ]);

      setStats(
        statsResult.success && statsResult.stats ? statsResult.stats : null,
      );
      setStaff(
        staffResult.success && staffResult.staff ? staffResult.staff : [],
      );
    } catch (error) {
      console.error("Error loading reports:", error);
      setStats(null);
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  const staffByRole = staff.reduce((acc: Record<string, number>, s) => {
    acc[s.roleName] = (acc[s.roleName] || 0) + 1;
    return acc;
  }, {});

  const activeStaff = staff.filter((s) => s.status === "active").length;

  const completionRate = stats
    ? stats.totalToday > 0
      ? Math.round((stats.completedToday / stats.totalToday) * 100)
      : 0
    : 0;

  const cancelledCount = stats
    ? stats.totalToday -
      stats.completedToday -
      stats.servingTickets -
      stats.pendingTickets
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-100 rounded-xl" />
          <div className="h-80 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={FONT}>
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {[
            { value: "today" as const, label: "Today" },
            { value: "week" as const, label: "This Week" },
            { value: "month" as const, label: "This Month" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setDateRange(item.value)}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                dateRange === item.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Today"
          value={stats?.totalToday || 0}
          icon={TrendingUp}
          color="blue"
          subtitle="tickets created"
        />
        <StatCard
          title="Completed"
          value={stats?.completedToday || 0}
          icon={CheckCircle}
          color="green"
          subtitle={`${completionRate}% completion rate`}
        />
        <StatCard
          title="Currently Serving"
          value={stats?.servingTickets || 0}
          icon={BarChart3}
          color="purple"
          subtitle="active tickets"
        />
        <StatCard
          title="Waiting"
          value={stats?.pendingTickets || 0}
          icon={Clock}
          color="orange"
          subtitle="in queue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Department Overview
          </h3>
          <div className="space-y-4">
            {Object.entries(staffByRole).length > 0 ? (
              Object.entries(staffByRole).map(([role, count]) => (
                <div key={role}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {role}
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                      {count} staff
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#1B5A8C] h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / (staff.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">
                No staff data available
              </p>
            )}
          </div>
        </div>

        {/* Staff Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Staff Status
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#1B5A8C"
                  strokeWidth="4"
                  strokeDasharray={`${staff.length > 0 ? (activeStaff / staff.length) * 100 : 0}, 100`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {activeStaff}
                </span>
                <span className="text-xs text-gray-500">active</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#1B5A8C] rounded-full" />
              <span className="text-xs text-gray-600">
                Active ({activeStaff})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-200 rounded-full" />
              <span className="text-xs text-gray-600">
                Inactive ({staff.length - activeStaff})
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Today's Ticket Status
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Completed",
                count: stats?.completedToday || 0,
                color: "bg-green-500",
              },
              {
                label: "Serving",
                count: stats?.servingTickets || 0,
                color: "bg-blue-500",
              },
              {
                label: "Pending",
                count: stats?.pendingTickets || 0,
                color: "bg-yellow-500",
              },
              {
                label: "Cancelled",
                count: cancelledCount > 0 ? cancelledCount : 0,
                color: "bg-red-500",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${item.color}`}
                    />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {item.count}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${item.color}`}
                    style={{
                      width: `${(stats?.totalToday || 0) > 0 ? (item.count / (stats?.totalToday || 1)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {(stats?.totalToday || 0) === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No tickets today
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Quick Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickStat
              label="Active Queues"
              value={stats?.activeQueues || 0}
              icon={Users}
            />
            <QuickStat label="Total Staff" value={staff.length} icon={Users} />
            <QuickStat
              label="Completion Rate"
              value={`${completionRate}%`}
              icon={CheckCircle}
            />
            <QuickStat label="Avg Wait" value="—" icon={Clock} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  icon: any;
  color: "blue" | "green" | "purple" | "orange";
  subtitle: string;
}) {
  const colors: Record<string, { bg: string; icon: string }> = {
    blue: { bg: "bg-blue-50", icon: "text-blue-500" },
    green: { bg: "bg-green-50", icon: "text-green-500" },
    purple: { bg: "bg-purple-50", icon: "text-purple-500" },
    orange: { bg: "bg-orange-50", icon: "text-orange-500" },
  };

  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
