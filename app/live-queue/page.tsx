// app/live-queue/page.tsx
"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Activity, Timer } from "lucide-react";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const CASHIER_WINDOW_COUNT = 3;
const MINUTES_PER_PERSON = 5;

interface QueueItem {
  _id: string;
  ticketNumber: string;
  transactionType: string;
  department: string;
  createdAt: string;
  status: string;
}

interface DepartmentQueue {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  waitingList: QueueItem[];
}

interface DataPoint {
  time: number;
  value: number;
}

// ─── Normalizers ────────────────────────────────────────────────────────────

function normalizeServing(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (c == null) continue;
    if (c === "" || c === 0 || c === "0") continue;
    const str = String(c).trim();
    if (str && str !== "0") return str;
  }
  return null;
}

function normalizeWaiting(...candidates: unknown[]): number {
  for (const c of candidates) {
    if (c == null) continue;
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function servingFromList(list: any): string | null {
  if (!Array.isArray(list)) return null;
  const item = list.find((t: any) => {
    const s = String(t?.status ?? "")
      .toLowerCase()
      .trim();
    return s === "serving" || s === "now-serving" || s === "now_serving";
  });
  if (!item) return null;
  const num = item.ticketNumber ?? item.ticket_number ?? item.number;
  if (num == null || num === "" || num === 0 || num === "0") return null;
  return String(num);
}

function pendingFromList(list: any): number {
  if (!Array.isArray(list)) return 0;
  return list.filter((t: any) => {
    const s = String(t?.status ?? "")
      .toLowerCase()
      .trim();
    return s === "pending" || s === "waiting" || s === "";
  }).length;
}

function normalizeDepartment(raw: any): DepartmentQueue {
  const list = Array.isArray(raw?.waitingList)
    ? raw.waitingList
    : Array.isArray(raw?.waiting_list)
      ? raw.waiting_list
      : Array.isArray(raw?.queue)
        ? raw.queue
        : [];

  const topLevelServing = normalizeServing(
    raw?.serving,
    raw?.nowServing,
    raw?.now_serving,
    raw?.currentTicket,
    raw?.current_ticket,
    raw?.currentTicketNumber,
    raw?.current_ticket_number,
    raw?.servingTicket,
    raw?.serving_ticket,
    raw?.servingTicketNumber,
    raw?.serving_ticket_number,
    raw?.servingNumber,
    raw?.serving_number,
    raw?.current,
  );

  const listServing = servingFromList(list);
  const serving = topLevelServing ?? listServing ?? null;

  // Prefer counting the list because the top-level "waiting" field is
  // frequently stale or hardcoded to 1 by the SSE producer.
  const listPending = pendingFromList(list);
  const topLevelWaiting = normalizeWaiting(
    raw?.waiting,
    raw?.pendingCount,
    raw?.pending_count,
    raw?.queueLength,
    raw?.queue_length,
    raw?.waitingCount,
    raw?.waiting_count,
  );

  // Use the larger of the two so we never under-report
  const waiting = Math.max(listPending, topLevelWaiting);

  return {
    department: String(raw?.department ?? raw?.dept ?? ""),
    displayName: String(
      raw?.displayName ??
        raw?.display_name ??
        raw?.name ??
        raw?.department ??
        "",
    ),
    serving,
    waiting,
    waitingList: list,
  };
}

// ─── Split cashier tickets across windows ──────────────────────────────────

interface WindowState {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  waitingList: QueueItem[];
}

/**
 * Distribute the aggregate cashier waitingList across N windows.
 * - The first N-1 tickets (pending) go to windows 1..N round-robin.
 * - The serving ticket (if any) is shown on Window 1.
 */
function splitCashierAcrossWindows(
  cashierDept: DepartmentQueue | undefined,
  windowCount: number,
): WindowState[] {
  const empty: WindowState[] = Array.from({ length: windowCount }, (_, i) => ({
    department: `cashier-${i + 1}`,
    displayName: `Window ${i + 1}`,
    serving: null,
    waiting: 0,
    waitingList: [],
  }));

  if (!cashierDept) return empty;

  const pending = (cashierDept.waitingList || []).filter((t) => {
    const s = String(t?.status ?? "")
      .toLowerCase()
      .trim();
    return s === "pending" || s === "waiting" || s === "";
  });

  // Round-robin distribution across windows
  const buckets: QueueItem[][] = Array.from(
    { length: windowCount },
    () => [] as QueueItem[],
  );
  pending.forEach((ticket, idx) => {
    buckets[idx % windowCount].push(ticket);
  });

  return empty.map((win, idx) => ({
    department: win.department,
    displayName: win.displayName,
    // Only Window 1 carries the "serving" ticket since we don't have
    // per-window serving data from the aggregate SSE entry.
    serving: idx === 0 ? cashierDept.serving : null,
    waiting: buckets[idx].length,
    waitingList: buckets[idx],
  }));
}

// ─── Chart ──────────────────────────────────────────────────────────────────

function SleekChart({ dataPoints }: { dataPoints: DataPoint[] }) {
  const maxValue = Math.max(...dataPoints.map((d) => d.value), 1);
  const paddedMax = Math.ceil(maxValue / 5) * 5 || 5;
  const currentValue =
    dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : 0;

  const pathData = useMemo(() => {
    if (dataPoints.length < 2) return "";
    const width = 600;
    const height = 100;
    const pad = 4;
    const cw = width - pad * 2;
    const ch = height - pad * 2;
    return dataPoints
      .map((point, i) => {
        const x = pad + (i / (dataPoints.length - 1)) * cw;
        const y = pad + ch - (point.value / paddedMax) * ch;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [dataPoints, paddedMax]);

  const areaPath = useMemo(() => {
    if (!pathData || dataPoints.length < 2) return "";
    const width = 600;
    const height = 100;
    const pad = 4;
    const cw = width - pad * 2;
    const lastX = pad + cw;
    return `${pathData} L ${lastX} ${height} L ${pad} ${height} Z`;
  }, [pathData, dataPoints.length]);

  const lastX = dataPoints.length > 0 ? 4 + (600 - 8) : 0;
  const lastY =
    dataPoints.length > 0
      ? 4 + (100 - 8) - (currentValue / paddedMax) * (100 - 8)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#1B5A8C]" />
          <span
            className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider"
            style={FONT}
          >
            Queue Traffic
          </span>
        </div>
        <span
          className="text-sm font-bold text-gray-900 tabular-nums"
          style={FONT}
        >
          {currentValue}
        </span>
      </div>
      <div className="relative h-[100px]">
        <svg
          className="w-full h-full"
          viewBox="0 0 600 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sleekArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B5A8C" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#1B5A8C" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="96"
            x2="600"
            y2="96"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          {areaPath && <path d={areaPath} fill="url(#sleekArea)" />}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="#1B5A8C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {dataPoints.length > 0 && !isNaN(lastY) && (
            <circle cx={lastX} cy={lastY} r="2" fill="#1B5A8C" />
          )}
        </svg>
      </div>
    </div>
  );
}

// ─── Voice ──────────────────────────────────────────────────────────────────

const VOICE_CONFIG = { rate: 0.95, pitch: 1.1, volume: 0.9 };

function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  const preferredVoices = [
    "Samantha",
    "Alex",
    "Google UK English Female",
    "Google US English Female",
    "Microsoft Zira",
    "Karen",
  ];
  for (const name of preferredVoices) {
    const voice = voices.find((v) => v.name.includes(name));
    if (voice) return voice;
  }
  return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = VOICE_CONFIG.rate;
  utterance.pitch = VOICE_CONFIG.pitch;
  utterance.volume = VOICE_CONFIG.volume;
  const voice = getBestVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function useVoiceAnnouncements(departments: DepartmentQueue[]) {
  const previousServingRef = useRef<Record<string, string | null>>({});
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.onvoiceschanged = () => getBestVoice();
    getBestVoice();
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setTimeout(() => speak("Queue monitor is active."), 1000);
    }
  }, []);

  useEffect(() => {
    if (departments.length === 0) return;
    departments.forEach((dept) => {
      const prevServing = previousServingRef.current[dept.department];
      if (
        dept.serving &&
        dept.serving !== prevServing &&
        prevServing !== undefined
      ) {
        speak(`${dept.displayName}, now serving ticket ${dept.serving}.`);
      }
      previousServingRef.current[dept.department] = dept.serving;
    });
  }, [departments]);
}

// ─── Queue status ───────────────────────────────────────────────────────────

interface QueueStatusInfo {
  status: "open" | "closed" | "outside-hours" | "full";
  openCounters: number;
  totalCounters: number;
  message: string;
}

// ─── Wait helpers ───────────────────────────────────────────────────────────

function getWaitMinutes(waiting: number) {
  return waiting * MINUTES_PER_PERSON;
}

function formatWait(waiting: number) {
  const total = getWaitMinutes(waiting);
  if (total <= 0) return "No wait";
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function getEstimatedServeTime(waiting: number) {
  if (waiting <= 0) return null;
  const mins = getWaitMinutes(waiting);
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getWaitColor(waiting: number) {
  const mins = getWaitMinutes(waiting);
  if (mins === 0)
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      subtext: "text-emerald-600",
    };
  if (mins <= 15)
    return {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      subtext: "text-green-600",
    };
  if (mins <= 30)
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      subtext: "text-amber-600",
    };
  return {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    subtext: "text-red-600",
  };
}

// ─── Card ───────────────────────────────────────────────────────────────────

interface QueueCardProps {
  label: string;
  serving: string | null;
  waiting: number;
}

function QueueCard({ label, serving, waiting }: QueueCardProps) {
  const colors = getWaitColor(waiting);
  const estimatedTime = getEstimatedServeTime(waiting);

  return (
    <div className="border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            serving ? "bg-green-500 animate-pulse" : "bg-gray-300"
          }`}
        />
        <span
          className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
          style={FONT}
        >
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-4 flex-wrap">
        {serving ? (
          <span
            className="text-5xl font-extrabold text-[#1B5A8C] tabular-nums tracking-tight"
            style={FONT}
          >
            #{serving}
          </span>
        ) : (
          <span
            className="text-5xl font-extrabold text-gray-200 tracking-tight"
            style={FONT}
          >
            —
          </span>
        )}
        <span className="text-sm text-gray-400 font-medium" style={FONT}>
          {waiting} waiting
        </span>
      </div>

      <div
        className={`rounded-lg border ${colors.border} ${colors.bg} px-3 py-2`}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <Timer className={`w-3.5 h-3.5 ${colors.text}`} />
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${colors.subtext}`}
            style={FONT}
          >
            Est. Wait
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p
            className={`text-xl font-extrabold tracking-tight ${colors.text}`}
            style={FONT}
          >
            {formatWait(waiting)}
          </p>
          {estimatedTime && (
            <p
              className={`text-[11px] ${colors.subtext} font-medium`}
              style={FONT}
            >
              Ready by ~{estimatedTime}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

function LiveQueueContent() {
  const [departments, setDepartments] = useState<DepartmentQueue[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatusInfo | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useVoiceAnnouncements(departments);

  const connect = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const eventSource = new EventSource("/api/public/queue-stream-full");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.queueStatus) setQueueStatus(data.queueStatus);

        if (Array.isArray(data.departments)) {
          const filtered = data.departments
            .filter(
              (d: any) =>
                d &&
                typeof d.department === "string" &&
                (d.department === "dean" ||
                  d.department === "cashier" ||
                  d.department.startsWith("cashier-")),
            )
            .map(normalizeDepartment);

          setDepartments(filtered);
          setLastUpdated(new Date(data.timestamp));

          const totalLoad = filtered.reduce(
            (sum: number, d: DepartmentQueue) =>
              sum + d.waiting + (d.serving ? 1 : 0),
            0,
          );
          setHistory((prev) => {
            const newHistory = [
              ...prev,
              { time: Date.now(), value: totalLoad },
            ];
            return newHistory.length > 60 ? newHistory.slice(-60) : newHistory;
          });
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatTransaction = (type: string) =>
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

  const allWaitingTickets = departments.flatMap((dept) =>
    (dept.waitingList || []).map((item) => ({
      ...item,
      departmentName: dept.displayName,
    })),
  );

  const filteredTickets =
    selectedDept === "all"
      ? allWaitingTickets
      : allWaitingTickets.filter((t) => t.department === selectedDept);

  const totalTickets = departments.reduce(
    (sum, d) => sum + d.waiting + (d.serving ? 1 : 0),
    0,
  );

  const deanDept = departments.find((d) => d.department === "dean");
  const cashierDept = departments.find((d) => d.department === "cashier");

  // If the SSE provides per-window entries (cashier-1, cashier-2, cashier-3),
  // use those. Otherwise split the aggregate cashier list across the windows.
  const hasPerWindowEntries = departments.some((d) =>
    d.department.startsWith("cashier-"),
  );

  const cashierWindows: WindowState[] = hasPerWindowEntries
    ? Array.from({ length: CASHIER_WINDOW_COUNT }, (_, i) => {
        const key = `cashier-${i + 1}`;
        const found = departments.find((d) => d.department === key);
        return {
          department: key,
          displayName: found?.displayName || `Window ${i + 1}`,
          serving: found?.serving ?? null,
          waiting: found?.waiting ?? 0,
          waitingList: found?.waitingList ?? [],
        };
      })
    : splitCashierAcrossWindows(cashierDept, CASHIER_WINDOW_COUNT);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium" style={FONT}>
                Back
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
              )}
              <span className="text-xs text-gray-400" style={FONT}>
                {isConnected ? "Live" : "Reconnecting..."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400" style={FONT}>
              Updated {formatTime(lastUpdated)}
            </span>
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src="/images/bcc-logo-3.png"
                  alt="BCC Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span
                className="text-sm font-semibold text-gray-900 hidden sm:block"
                style={FONT}
              >
                BCC Queue
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900 mb-0.5" style={FONT}>
            Live Queue Monitor
          </h1>
          <p className="text-xs text-gray-400" style={FONT}>
            Dean&apos;s Office • Cashier (3 Windows) • {totalTickets} active •
            Voice on
          </p>
        </div>

        {queueStatus && (
          <div
            className={`px-6 py-3 border-b text-sm font-medium ${
              queueStatus.status === "open"
                ? "bg-green-50 border-green-100 text-green-700"
                : queueStatus.status === "outside-hours"
                  ? "bg-amber-50 border-amber-100 text-amber-700"
                  : "bg-red-50 border-red-100 text-red-600"
            }`}
            style={FONT}
            role="status"
          >
            <span className="inline-flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  queueStatus.status === "open"
                    ? "bg-green-500 animate-pulse"
                    : queueStatus.status === "outside-hours"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              />
              {queueStatus.message ||
                (queueStatus.status === "open" ? "Queue open" : "Queue closed")}
            </span>
          </div>
        )}

        <div className="px-6 py-4 border-b border-gray-100">
          <SleekChart dataPoints={history} />
        </div>

        <div className="px-6 py-5 border-b border-gray-100 space-y-4">
          <QueueCard
            label="Dean's Office"
            serving={deanDept?.serving ?? null}
            waiting={deanDept?.waiting ?? 0}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cashierWindows.map((win) => (
              <QueueCard
                key={win.department}
                label={`Cashier • ${win.displayName}`}
                serving={win.serving}
                waiting={win.waiting}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDept("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedDept === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={FONT}
            >
              All ({allWaitingTickets.length})
            </button>
            <button
              onClick={() => setSelectedDept("dean")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedDept === "dean"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={FONT}
            >
              Dean ({(deanDept?.waitingList || []).length})
            </button>
            <button
              onClick={() => setSelectedDept("cashier")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedDept === "cashier"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={FONT}
            >
              Cashier ({(cashierDept?.waitingList || []).length})
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <h3
            className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3"
            style={FONT}
          >
            Waiting Queue • {filteredTickets.length}
          </h3>
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            {filteredTickets.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400" style={FONT}>
                  No tickets in queue
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredTickets.map((ticket, idx) => (
                  <div
                    key={ticket._id || idx}
                    className="flex items-center gap-5 px-6 py-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[#1B5A8C] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#1B5A8C]/20">
                      <span
                        className="text-xl font-extrabold text-white tabular-nums"
                        style={FONT}
                      >
                        {ticket.ticketNumber}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-base font-semibold text-gray-900"
                        style={FONT}
                      >
                        {formatTransaction(ticket.transactionType)}
                      </p>
                    </div>
                    <span
                      className="text-xs text-gray-400 flex-shrink-0 px-3 py-1.5 bg-gray-100 rounded-full font-medium"
                      style={FONT}
                    >
                      {ticket.departmentName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center">
          <p className="text-[11px] text-gray-300" style={FONT}>
            Binalbagan Catholic College • Queue Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function LiveQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-[#1B5A8C] rounded-full animate-spin" />
        </div>
      }
    >
      <LiveQueueContent />
    </Suspense>
  );
}
