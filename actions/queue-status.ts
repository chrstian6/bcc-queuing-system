// actions/queue-status.ts
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

interface DepartmentStatus {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  color: string;
}

interface QueueStatusResponse {
  success: boolean;
  departments?: DepartmentStatus[];
  error?: string;
  timestamp?: string;
}

const displayNames: Record<string, string> = {
  registrar: "Registrar",
  dean: "Dean",
  dsdw: "DSDW",
  cashier: "Cashier",
};

const colors: Record<string, string> = {
  registrar: "from-blue-500 to-blue-600",
  dean: "from-purple-500 to-purple-600",
  dsdw: "from-orange-500 to-orange-600",
  cashier: "from-emerald-500 to-emerald-600",
};

export async function getPublicQueueStatus(): Promise<QueueStatusResponse> {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const departments = ["registrar", "dean", "dsdw", "cashier"];

    const departmentData = await Promise.all(
      departments.map(async (dept) => {
        const servingTicket = await Ticket.findOne({
          department: dept,
          status: "serving",
          createdAt: { $gte: today, $lt: tomorrow },
        })
          .sort({ servedAt: -1 })
          .select("ticketNumber")
          .lean();

        const waitingCount = await Ticket.countDocuments({
          department: dept,
          status: "pending",
          createdAt: { $gte: today, $lt: tomorrow },
        });

        return {
          department: dept,
          displayName: displayNames[dept] || dept,
          serving: servingTicket ? (servingTicket as any).ticketNumber : null,
          waiting: waitingCount,
          color: colors[dept] || "from-gray-500 to-gray-600",
        };
      }),
    );

    return {
      success: true,
      departments: departmentData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching queue status:", error);
    return {
      success: false,
      error: "Failed to fetch queue status",
    };
  }
}
