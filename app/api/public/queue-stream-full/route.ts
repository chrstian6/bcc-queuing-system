// app/api/public/queue-stream-full/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const displayNames: Record<string, string> = {
  registrar: "Registrar",
  cashier: "Cashier",
};

function getEmptyDepartments() {
  return [
    {
      department: "registrar",
      displayName: "Registrar",
      serving: null,
      waiting: 0,
    },
    {
      department: "cashier",
      displayName: "Cashier",
      serving: null,
      waiting: 0,
    },
  ];
}

async function getQueueData() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const departments = ["registrar", "cashier"];

    const departmentData = await Promise.all(
      departments.map(async (dept) => {
        try {
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
          };
        } catch (err) {
          console.error(`Error fetching ${dept}:`, err);
          return {
            department: dept,
            displayName: displayNames[dept] || dept,
            serving: null,
            waiting: 0,
          };
        }
      }),
    );

    return departmentData;
  } catch (error) {
    console.error("getQueueData error:", error);
    return getEmptyDepartments();
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendData = async () => {
        try {
          const data = await getQueueData();
          const payload = JSON.stringify({
            departments: data,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (error) {
          console.error("SSE send error:", error);
          const fallback = JSON.stringify({
            departments: getEmptyDepartments(),
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
        }
      };

      // Send immediately
      await sendData();

      // Then every 3 seconds
      const interval = setInterval(sendData, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
