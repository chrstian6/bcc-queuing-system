// components/student/ActiveTicketCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyActiveTickets,
  type ActiveTicketInfo,
} from "@/actions/student";
import { RefreshCw } from "lucide-react";

const POLL_MS = 15000;

function formatTransaction(type: string) {
  return type?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ActiveTicketCard() {
  const [tickets, setTickets] = useState<ActiveTicketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const result = await getMyActiveTickets();
    if (result.success) setTickets(result.tickets as ActiveTicketInfo[]);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(true), POLL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  const primary = tickets[0];

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1B5A8C] to-[#0B3B5F] p-6 text-white font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-white/70">
          {primary
            ? primary.status === "serving"
              ? "Now Being Served"
              : "Your Active Ticket"
            : "Active Ticket"}
        </span>
        <button
          type="button"
          onClick={() => loadData()}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="h-20 flex items-center text-white/60 text-sm">
          Loading...
        </div>
      ) : primary ? (
        <>
          <div className="text-5xl font-extrabold tracking-tight mb-2">
            #{primary.ticketNumber}
          </div>
          <p className="text-sm text-white/80 mb-4">
            {formatTransaction(primary.transactionType)}
          </p>
          <div className="flex items-center gap-6 text-sm">
            {primary.status === "serving" ? (
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                It&apos;s your turn — proceed to the cashier
              </span>
            ) : (
              <>
                <div>
                  <span className="text-white/60">Position</span>{" "}
                  <span className="font-bold">
                    {primary.queuePosition ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Now serving</span>{" "}
                  <span className="font-bold">
                    {primary.nowServing ? `#${primary.nowServing}` : "—"}
                  </span>
                </div>
              </>
            )}
          </div>
          {tickets.length > 1 && (
            <p className="mt-4 text-xs text-white/60">
              +{tickets.length - 1} more active ticket
              {tickets.length > 2 ? "s" : ""} today
            </p>
          )}
        </>
      ) : (
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white/40 mb-2">
            —
          </div>
          <p className="text-sm text-white/70">
            No active tickets today. Get a ticket from the home page kiosk.
          </p>
        </div>
      )}
    </div>
  );
}
