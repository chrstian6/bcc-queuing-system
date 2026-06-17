"use client";

import { useState, useTransition } from "react";
import { completeTicket, serveNextTicket } from "@/actions/ticket";
import { CheckCheck, ArrowRight, Loader2 } from "lucide-react";

interface Student {
  firstName: string;
  lastName: string;
  year: string;
  section: string;
}

interface Ticket {
  _id?: string;
  ticketNumber: string;
  status: "pending" | "serving" | "completed" | "cancelled";
  transactionType: string;
  createdAt: string;
  student?: Student;
}

interface NowServingCardProps {
  ticket: Ticket;
  hasNext: boolean;
}

export function NowServingCard({ ticket, hasNext }: NowServingCardProps) {
  const [isPendingComplete, startComplete] = useTransition();
  const [isPendingNext, startNext] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setError(null);
    startComplete(async () => {
      const res = await completeTicket(ticket.ticketNumber);
      if (!res.success) setError(res.error ?? "Failed to complete ticket.");
    });
  }

  async function handleNext() {
    setError(null);
    startNext(async () => {
      const res = await serveNextTicket();
      if (!res.success) setError(res.error ?? "Failed to call next ticket.");
    });
  }

  const isBusy = isPendingComplete || isPendingNext;

  return (
    <div
      className="rounded-xl p-6 flex flex-col"
      style={{ background: "#0F172A" }}
    >
      {/* Live badge */}
      <div
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 w-fit"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "0.5px solid rgba(255,255,255,0.12)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
          Now Serving
        </span>
      </div>

      {/* Ticket number */}
      <p className="text-7xl font-bold tracking-tight text-white leading-none mb-4">
        {ticket.ticketNumber}
      </p>

      {/* Student info */}
      <p className="text-[15px] font-medium text-white/75 mb-2">
        {ticket.student?.firstName} {ticket.student?.lastName}
      </p>
      <span
        className="inline-block rounded-md px-2.5 py-0.5 text-xs text-white/60 w-fit mb-6"
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "0.5px solid rgba(255,255,255,0.15)",
        }}
      >
        {ticket.transactionType}
      </span>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={handleComplete}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "0.5px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {isPendingComplete ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck className="w-4 h-4" />
          )}
          Complete
        </button>

        <button
          onClick={handleNext}
          disabled={isBusy || !hasNext}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.92)", color: "#0F172A" }}
        >
          {isPendingNext ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          Next
        </button>
      </div>

      {/* Inline error */}
      {error && (
        <p className="text-[11px] text-red-400 mt-3 text-center">{error}</p>
      )}
    </div>
  );
}
