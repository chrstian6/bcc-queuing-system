// app/api/queue/stream/route.ts
export const dynamic = "force-dynamic";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Counter from "@/models/Counter";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let ticketStream: any = null;
      let counterStream: any = null;
      let heartbeat: NodeJS.Timeout;

      const send = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {}
      };

      try {
        await connectDB();

        send({ type: "connected" });

        // Watch tickets
        ticketStream = Ticket.watch(
          [
            {
              $match: {
                operationType: {
                  $in: ["insert", "update", "delete", "replace"],
                },
              },
            },
          ],
          { fullDocument: "updateLookup" },
        );

        ticketStream.on("change", (change: any) => {
          send({
            type: "ticket",
            operation: change.operationType,
            document: change.fullDocument,
            id: change.documentKey?._id,
          });
        });

        // Watch counters
        counterStream = Counter.watch(
          [
            {
              $match: {
                operationType: { $in: ["insert", "update", "replace"] },
              },
            },
          ],
          { fullDocument: "updateLookup" },
        );

        counterStream.on("change", (change: any) => {
          send({
            type: "counter",
            operation: change.operationType,
            document: change.fullDocument,
          });
        });

        // Heartbeat
        heartbeat = setInterval(() => send({ type: "heartbeat" }), 15000);
      } catch (error) {
        send({ type: "error", message: "Stream setup failed" });
      }

      // Cleanup
      return () => {
        clearInterval(heartbeat);
        ticketStream?.close();
        counterStream?.close();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
