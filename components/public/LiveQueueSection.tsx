// components/public/LiveQueueSection.tsx
"use client";

import { Users, UserCheck, Clock } from "lucide-react";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

// Average minutes per person in queue
const MINUTES_PER_PERSON = 5;

// Number of cashier windows to display
const CASHIER_WINDOW_COUNT = 3;

export default function LiveQueueSection() {
  const { departments, isConnected, lastUpdated } = useRealtimeQueue();

  const deanDept = departments.find((dept) => dept.department === "dean");
  const cashierDept = departments.find((dept) => dept.department === "cashier");

  // Build 3 cashier windows.
  // - If the SSE provides per-window entries ("cashier-1", "cashier-2", "cashier-3"),
  //   each window uses its own numbers.
  // - Otherwise, Window 1 falls back to the aggregated "cashier" entry.
  const cashierWindows = Array.from(
    { length: CASHIER_WINDOW_COUNT },
    (_, i) => {
      const windowNumber = i + 1;
      const perWindow = departments.find(
        (dept) => dept.department === `cashier-${windowNumber}`,
      );
      if (perWindow) {
        return {
          department: `cashier-${windowNumber}`,
          displayName: `Cashier ${windowNumber}`,
          serving: perWindow.serving,
          waiting: perWindow.waiting,
        };
      }
      return {
        department: `cashier-${windowNumber}`,
        displayName: `Cashier ${windowNumber}`,
        serving: windowNumber === 1 ? (cashierDept?.serving ?? null) : null,
        waiting: windowNumber === 1 ? (cashierDept?.waiting ?? 0) : 0,
      };
    },
  );

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const estimateWait = (waiting: number) => {
    const total = waiting * MINUTES_PER_PERSON;
    if (total <= 0) return "No wait";
    if (total < 60) return `~${total} min`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (mins === 0) return `~${hours} hr`;
    return `~${hours} hr ${mins} min`;
  };

  const renderCard = (
    key: string,
    displayName: string,
    serving: string | number | null | undefined,
    waiting: number,
  ) => (
    <div key={key} className="border-b border-gray-100">
      <div className="px-6 md:px-8 py-6">
        <h3
          className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5"
          style={FONT}
        >
          {displayName}
        </h3>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Serving */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1B5A8C]/5 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-4 h-4 text-[#1B5A8C]" />
            </div>
            <div>
              <p
                className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5"
                style={FONT}
              >
                Serving
              </p>
              {serving ? (
                <p
                  className="text-2xl font-extrabold text-[#1B5A8C] tabular-nums tracking-tight"
                  style={FONT}
                >
                  #{serving}
                </p>
              ) : (
                <p
                  className="text-2xl font-extrabold text-gray-200 tracking-tight"
                  style={FONT}
                >
                  —
                </p>
              )}
            </div>
          </div>

          <div className="w-px h-10 bg-gray-100 hidden sm:block" />

          {/* Waiting */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p
                className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5"
                style={FONT}
              >
                Waiting
              </p>
              <p
                className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight"
                style={FONT}
              >
                {waiting}
              </p>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-100 hidden sm:block" />

          {/* Est. Wait */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p
                className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5"
                style={FONT}
              >
                Est. Wait
              </p>
              <p
                className="text-lg font-extrabold text-gray-900 tracking-tight"
                style={FONT}
              >
                {estimateWait(waiting)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-0 md:px-0 py-10 bg-white" id="live-queue">
      <div className="max-w-full mx-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-10 mb-5">
          <div className="flex items-center gap-3">
            <h2
              className="text-sm font-semibold text-gray-500 uppercase tracking-wider"
              style={FONT}
            >
              Live Queue
            </h2>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span
                    className="text-[11px] text-green-600 font-medium"
                    style={FONT}
                  >
                    Live
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <span className="text-[11px] text-gray-400" style={FONT}>
                    Connecting...
                  </span>
                </>
              )}
            </div>
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-gray-400" style={FONT}>
              Updated {formatTime(lastUpdated)}
            </span>
          )}
        </div>

        {/* Dean's Office — full width row */}
        <div className="grid grid-cols-1">
          {renderCard(
            "dean",
            "Dean's Office",
            deanDept?.serving ?? null,
            deanDept?.waiting ?? 0,
          )}
        </div>

        {/* Cashier windows — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {cashierWindows.map((win) => (
            <div
              key={win.department}
              className="border-r border-gray-100 last:border-r-0"
            >
              {renderCard(
                win.department,
                win.displayName,
                win.serving,
                win.waiting,
              )}
            </div>
          ))}
        </div>

        {/* Footnote */}
        <div className="px-6 md:px-10 pt-4 pb-2">
          <p className="text-[11px] text-gray-400 italic" style={FONT}>
            Estimated wait assumes ~{MINUTES_PER_PERSON} minutes per person
            ahead of you. Actual times may vary.
          </p>
        </div>
      </div>
    </div>
  );
}
