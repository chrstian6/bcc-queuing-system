// actions/analytics.ts
// Admin analytics. All aggregations run over the Ticket / DocumentRequest
// collections (source of truth), with APP_TZ so day/hour buckets match the
// school's local calendar. wait/service metrics are null for tickets created
// before the metrics fix — $avg ignores nulls, so averages reflect real data
// from the fix forward.
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Staff from "@/models/Staff";
import DocumentRequest from "@/models/DocumentRequest";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { APP_TZ, getAppDayRange } from "@/lib/time";

function dayRangeFromFilters(filters?: { dateFrom?: string; dateTo?: string }) {
  const query: any = {};
  if (filters?.dateFrom) {
    query.$gte = new Date(`${filters.dateFrom}T00:00:00`);
  }
  if (filters?.dateTo) {
    const end = new Date(`${filters.dateTo}T00:00:00`);
    end.setDate(end.getDate() + 1);
    query.$lt = end;
  }
  return Object.keys(query).length ? query : null;
}

export async function getTicketHistory(filters?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  transactionType?: string;
  staffId?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, tickets: [], total: 0 };

    await connectDB();
    const query: any = { department: "cashier" };
    if (filters?.status) query.status = filters.status;
    if (filters?.transactionType)
      query.transactionType = filters.transactionType;
    if (filters?.staffId)
      query.$or = [
        { servedBy: filters.staffId },
        { assignedTo: filters.staffId },
      ];
    const range = dayRangeFromFilters(filters);
    if (range) query.createdAt = range;

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, filters?.limit || 50);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(query),
    ]);

    return {
      success: true,
      tickets: JSON.parse(JSON.stringify(tickets)),
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error fetching ticket history:", error);
    return { success: false, error: "Failed to fetch history", tickets: [], total: 0 };
  }
}

export async function getDocumentRequestHistory(filters?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  documentType?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, requests: [], total: 0 };

    await connectDB();
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.documentType) query.documentType = filters.documentType;
    const range = dayRangeFromFilters(filters);
    if (range) query.createdAt = range;

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, filters?.limit || 50);

    const [requests, total] = await Promise.all([
      DocumentRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DocumentRequest.countDocuments(query),
    ]);

    return {
      success: true,
      requests: JSON.parse(JSON.stringify(requests)),
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error fetching document history:", error);
    return { success: false, error: "Failed to fetch history", requests: [], total: 0 };
  }
}

export async function getDailyVolumeTrend(days = 14) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR, trend: [] };

    await connectDB();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const rows = await Ticket.aggregate([
      { $match: { department: "cashier", createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: APP_TZ,
              },
            },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build a dense day series
    const byDay: Record<string, any> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { day: key, total: 0, completed: 0, cancelled: 0 };
    }
    for (const row of rows) {
      const bucket = byDay[row._id.day];
      if (!bucket) continue;
      bucket.total += row.count;
      if (row._id.status === "completed") bucket.completed += row.count;
      if (row._id.status === "cancelled") bucket.cancelled += row.count;
    }

    return { success: true, trend: Object.values(byDay) };
  } catch (error) {
    console.error("Error fetching daily trend:", error);
    return { success: false, error: "Failed to fetch trend", trend: [] };
  }
}

export async function getCashierPerformance(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, performance: [] };

    await connectDB();
    const match: any = { department: "cashier", status: "completed" };
    const range = dayRangeFromFilters(filters);
    if (range) match.createdAt = range;

    const rows = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$servedBy",
          completed: { $sum: 1 },
          avgWait: { $avg: "$waitTime" },
          avgService: { $avg: "$serviceTime" },
        },
      },
    ]);

    const staff = await Staff.find({ roleName: "cashier" }).lean();
    const nameById: Record<string, string> = {};
    for (const s of staff) {
      nameById[s.staffId] = `${s.firstName} ${s.lastName}`;
    }

    const performance = rows
      .filter((r) => r._id)
      .map((r) => ({
        staffId: r._id,
        name: nameById[r._id] || r._id,
        completed: r.completed,
        avgWaitSeconds: r.avgWait ? Math.round(r.avgWait) : null,
        avgServiceSeconds: r.avgService ? Math.round(r.avgService) : null,
      }))
      .sort((a, b) => b.completed - a.completed);

    return { success: true, performance };
  } catch (error) {
    console.error("Error fetching cashier performance:", error);
    return { success: false, error: "Failed to fetch performance", performance: [] };
  }
}

export async function getStatusBreakdown(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, breakdown: [] };

    await connectDB();
    const match: any = { department: "cashier" };
    const range = dayRangeFromFilters(filters);
    if (range) match.createdAt = range;

    const rows = await Ticket.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return {
      success: true,
      breakdown: rows.map((r) => ({ status: r._id, count: r.count })),
    };
  } catch (error) {
    console.error("Error fetching status breakdown:", error);
    return { success: false, error: "Failed to fetch breakdown", breakdown: [] };
  }
}

export async function getHourlyDistribution(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, hours: [] };

    await connectDB();
    const match: any = { department: "cashier" };
    const range = dayRangeFromFilters(filters);
    if (range) match.createdAt = range;

    const rows = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $hour: { date: "$createdAt", timezone: APP_TZ } },
          count: { $sum: 1 },
        },
      },
    ]);

    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const row of rows) {
      if (typeof row._id === "number" && hours[row._id]) {
        hours[row._id].count = row.count;
      }
    }

    return { success: true, hours };
  } catch (error) {
    console.error("Error fetching hourly distribution:", error);
    return { success: false, error: "Failed to fetch distribution", hours: [] };
  }
}

export async function getDocumentRequestBreakdown(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return {
        success: false,
        error: UNAUTHORIZED_ERROR,
        byType: [],
        byStatus: [],
      };

    await connectDB();
    const match: any = {};
    const range = dayRangeFromFilters(filters);
    if (range) match.createdAt = range;

    const [byType, byStatus] = await Promise.all([
      DocumentRequest.aggregate([
        { $match: match },
        { $group: { _id: "$documentType", count: { $sum: 1 } } },
      ]),
      DocumentRequest.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      success: true,
      byType: byType.map((r) => ({ type: r._id, count: r.count })),
      byStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
    };
  } catch (error) {
    console.error("Error fetching document breakdown:", error);
    return {
      success: false,
      error: "Failed to fetch breakdown",
      byType: [],
      byStatus: [],
    };
  }
}

export async function getTodayOverviewStats() {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();
    const match = {
      department: "cashier",
      createdAt: { $gte: today, $lt: tomorrow },
    };

    const [counts, avgRow] = await Promise.all([
      Ticket.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: { ...match, status: "completed" } },
        { $group: { _id: null, avgWait: { $avg: "$waitTime" } } },
      ]),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of counts) statusCounts[row._id] = row.count;

    const avgWaitSeconds = avgRow[0]?.avgWait
      ? Math.round(avgRow[0].avgWait)
      : null;
    const avgWaitFormatted =
      avgWaitSeconds !== null
        ? `${Math.round(avgWaitSeconds / 60)}m`
        : "—";

    return {
      success: true,
      stats: {
        pending: statusCounts.pending || 0,
        serving: statusCounts.serving || 0,
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0,
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        avgWaitSeconds,
        avgWaitFormatted,
      },
    };
  } catch (error) {
    console.error("Error fetching overview stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}
