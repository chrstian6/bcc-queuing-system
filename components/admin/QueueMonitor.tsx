// components/admin/QueueMonitor.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCounterOverview,
  type CounterOverview,
} from "@/actions/admin-monitor";
import { setQueueOpen } from "@/actions/system-settings";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Loader2, Clock } from "lucide-react";
import { formatHHMM } from "@/lib/time";

const POLL_MS = 10000;

const STATE_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-green-100 text-green-700" },
  closed: { label: "Closed", className: "bg-red-100 text-red-700" },
  "outside-hours": {
    label: "Outside Hours",
    className: "bg-amber-100 text-amber-700",
  },
  break: { label: "On Break", className: "bg-amber-100 text-amber-700" },
  full: { label: "Full", className: "bg-red-100 text-red-700" },
};

export function QueueMonitor() {
  const [counters, setCounters] = useState<CounterOverview[]>([]);
  const [queueOpen, setQueueOpenState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const result = await getCounterOverview();
    if (result.success) {
      setCounters(result.counters as CounterOverview[]);
      setQueueOpenState(result.queueOpen);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(true), POLL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  const requestToggle = (next: boolean) => {
    setPendingToggle(next);
    setConfirmOpen(true);
  };

  const applyToggle = async () => {
    if (pendingToggle === null) return;
    setIsSaving(true);
    const result = await setQueueOpen(pendingToggle);
    setIsSaving(false);
    if (result.success) {
      setQueueOpenState(result.queueOpen !== false);
      setConfirmOpen(false);
      setPendingToggle(null);
      loadData(true);
    }
  };

  const openCount = counters.filter((c) => c.state === "open").length;
  const outsideHoursCount = counters.filter(
    (c) => c.state === "outside-hours",
  ).length;
  const breakCount = counters.filter((c) => c.state === "break").length;
  const fullCount = counters.filter((c) => c.state === "full").length;
  const closedCount = counters.filter((c) => c.state === "closed").length;

  // Effective status: the admin toggle AND whether any counter is actually open
  const allOutsideHours =
    counters.length > 0 && outsideHoursCount === counters.length;
  const allOnBreak = counters.length > 0 && breakCount === counters.length;
  const allFull = counters.length > 0 && fullCount === counters.length;
  const allClosed = counters.length > 0 && closedCount === counters.length;

  // Effective queue status for the badge
  const effectiveStatus: {
    label: string;
    className: string;
    dot: string;
  } = (() => {
    if (!queueOpen) {
      return {
        label: "Closed",
        className: "bg-red-100 text-red-700",
        dot: "bg-red-500",
      };
    }
    if (counters.length === 0) {
      return {
        label: "No Counters",
        className: "bg-gray-100 text-gray-700",
        dot: "bg-gray-400",
      };
    }
    if (openCount > 0) {
      return {
        label: "Open",
        className: "bg-green-100 text-green-700",
        dot: "bg-green-500",
      };
    }
    if (allOutsideHours) {
      return {
        label: "Outside Hours",
        className: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
      };
    }
    if (allOnBreak) {
      return {
        label: "On Break",
        className: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
      };
    }
    if (allFull) {
      return {
        label: "Full",
        className: "bg-red-100 text-red-700",
        dot: "bg-red-500",
      };
    }
    if (allClosed) {
      return {
        label: "All Closed",
        className: "bg-red-100 text-red-700",
        dot: "bg-red-500",
      };
    }
    // Partial: some open, some not
    return {
      label: "Partial",
      className: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500",
    };
  })();

  // Subtitle explaining the situation
  const subtitle = (() => {
    if (!queueOpen) {
      return "Master switch is OFF — no tickets accepted regardless of counter state";
    }
    if (counters.length === 0) {
      return "No active cashier counters configured";
    }
    if (openCount > 0) {
      return `${openCount} of ${counters.length} counters accepting tickets`;
    }
    if (allOutsideHours) {
      return `All counters are outside operating hours — queue auto-paused until they reopen`;
    }
    if (allOnBreak) {
      return `All counters are on break — queue auto-paused`;
    }
    if (allFull) {
      return `All counters have reached their daily capacity`;
    }
    if (allClosed) {
      return `All counters are manually closed by their staff`;
    }
    return `${counters.length - openCount} of ${counters.length} counters unavailable`;
  })();

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans']">
      {/* Global control */}
      <div className="rounded-xl bg-white border border-gray-200 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900">
              Global Queue
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${effectiveStatus.className}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${effectiveStatus.dot} ${
                  effectiveStatus.label === "Open" ? "animate-pulse" : ""
                }`}
              />
              {effectiveStatus.label}
            </span>
            {queueOpen && allOutsideHours && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <Clock className="w-3 h-3" />
                Auto-resumes during hours
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <span className="text-sm text-gray-600">
            {queueOpen ? "Accepting" : "Paused"}
          </span>
          <Switch checked={queueOpen} onCheckedChange={requestToggle} />
        </div>
      </div>

      {/* Counter grid */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-12">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading counters...
        </div>
      ) : counters.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          No active cashier counters
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {counters.map((counter) => {
            const stateStyle = STATE_STYLES[counter.state] || STATE_STYLES.open;
            const loadPct = Math.min(
              100,
              Math.round((counter.load / counter.dailyLimit) * 100),
            );
            return (
              <div
                key={counter.staffId}
                className="rounded-xl bg-white border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {counter.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Window {counter.cashierWindow || "—"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${stateStyle.className}`}
                  >
                    {stateStyle.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Now serving</p>
                    <p className="text-lg font-bold text-[#1B5A8C]">
                      {counter.nowServing ? `#${counter.nowServing}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Waiting</p>
                    <p className="text-lg font-bold text-gray-900">
                      {counter.pendingCount}
                    </p>
                  </div>
                </div>

                {/* Load bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Daily load</span>
                    <span>
                      {counter.load} / {counter.dailyLimit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        loadPct >= 100 ? "bg-red-500" : "bg-[#1B5A8C]"
                      }`}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Hours {formatHHMM(counter.openTime)} –{" "}
                  {formatHHMM(counter.closeTime)}
                  {counter.breaks.length > 0 &&
                    ` • ${counter.breaks.length} break${counter.breaks.length > 1 ? "s" : ""}`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm font-['Plus_Jakarta_Sans']">
          <DialogHeader>
            <DialogTitle>
              {pendingToggle ? "Open the queue?" : "Close the queue?"}
            </DialogTitle>
            <DialogDescription>
              {pendingToggle
                ? "Students will be able to get tickets whenever a counter is open during its hours."
                : "This stops all new tickets across every counter until you reopen it. Counters already outside hours or on break remain unaffected — this is the master override."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyToggle}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2 ${
                pendingToggle
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingToggle ? "Open Queue" : "Close Queue"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
