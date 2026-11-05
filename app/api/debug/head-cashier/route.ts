// app/api/debug/head-cashier/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Counter from "@/models/Counter";
import Ticket from "@/models/Ticket";
import { baseStaffRole } from "@/lib/roles";
import { evaluateCounterState } from "@/lib/counterSettings";
import { getAppDayRange, getAppNowMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const { dateStr } = getAppDayRange();
    const nowMinutes = getAppNowMinutes();

    // ─── All staff (to see every roleName and status) ──────────────
    const allStaff = await Staff.find(
      {},
      {
        staffId: 1,
        firstName: 1,
        lastName: 1,
        roleName: 1,
        status: 1,
        cashierWindow: 1,
        counterSettings: 1,
      },
    ).lean();

    // ─── The head cashier doc ──────────────────────────────────────
    const headCashier = allStaff.find(
      (s: any) => s.roleName === "head_cashier",
    );

    // ─── Eligibility of every active cashier-level staff ──────────
    const allActive = await Staff.find({ status: "active" }).lean();
    const cashiers = allActive.filter(
      (s: any) => baseStaffRole(s.roleName) === "cashier",
    );
    const eligibility = await Promise.all(
      cashiers.map(async (staff: any) => {
        const counterKey = `STAFF-${staff.staffId}-${dateStr}`;
        const counter = await Counter.findOne({ _id: counterKey }).lean();
        const load = counter ? (counter as any).seq || 0 : 0;
        const evaluation = evaluateCounterState(staff, load, nowMinutes);
        return {
          staffId: staff.staffId,
          name: `${staff.firstName} ${staff.lastName}`,
          rawRoleName: staff.roleName,
          baseRole: baseStaffRole(staff.roleName),
          cashierWindow: staff.cashierWindow,
          load,
          state: evaluation.state,
          accepting: evaluation.accepting,
          settings: evaluation.settings,
        };
      }),
    );

    // ─── All counters today ────────────────────────────────────────
    const counters = await Counter.find({}).sort({ date: -1 }).limit(20).lean();

    // ─── Newest 5 cashier tickets ─────────────────────────────────
    const recentTickets = await Ticket.find({ department: "cashier" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "ticketNumber status assignedTo servedBy transactionType createdAt",
      )
      .lean();

    return NextResponse.json({
      diagnosis: {
        nowMinutes,
        dateStr,
        totalStaffCount: allStaff.length,
        headCashierFound: !!headCashier,
      },
      headCashier: headCashier || null,
      eligibility,
      counters: counters.map((c: any) => ({
        _id: c._id,
        staffId: c.staffId,
        department: c.department,
        seq: c.seq,
        date: c.date,
      })),
      recentTickets: recentTickets.map((t: any) => ({
        ticketNumber: t.ticketNumber,
        status: t.status,
        assignedTo: t.assignedTo,
        servedBy: t.servedBy,
        transactionType: t.transactionType,
        createdAt: t.createdAt,
      })),
      allStaffRoles: allStaff.map((s: any) => ({
        staffId: s.staffId,
        name: `${s.firstName} ${s.lastName}`,
        roleName: s.roleName,
        status: s.status,
        base: baseStaffRole(s.roleName),
        hasCounterSettings: !!s.counterSettings,
      })),
    });
  } catch (error: any) {
    console.error("Debug route error:", error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
