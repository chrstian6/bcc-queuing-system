// app/api/public/queue-stream/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

const displayNames: Record<string, string> = {
  registrar: "Registrar",
  cashier: "Cashier",
};

async function getQueueData() {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Only registrar and cashier
  const departments = ["registrar", "cashier"];

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
      };
    }),
  );

  return departmentData;
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const data = await getQueueData();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ departments: data, timestamp: new Date().toISOString() })}\n\n`,
          ),
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Failed to fetch" })}\n\n`,
          ),
        );
      }

      const interval = setInterval(async () => {
        try {
          const data = await getQueueData();
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ departments: data, timestamp: new Date().toISOString() })}\n\n`,
            ),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Failed to fetch" })}\n\n`,
            ),
          );
        }
      }, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
