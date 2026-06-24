// app/live-queue/page.tsx
"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Activity } from "lucide-react";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

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

// Sleek Thin Line Chart
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

          {/* Baseline */}
          <line
            x1="0"
            y1="96"
            x2="600"
            y2="96"
            stroke="#f1f5f9"
            strokeWidth="1"
          />

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#sleekArea)" />}

          {/* Main line - thin and sleek */}
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

          {/* End dot */}
          {dataPoints.length > 0 && !isNaN(lastY) && (
            <circle cx={lastX} cy={lastY} r="2" fill="#1B5A8C" />
          )}
        </svg>
      </div>
    </div>
  );
}

// Voice configuration
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

function LiveQueueContent() {
  const [departments, setDepartments] = useState<DepartmentQueue[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [history, setHistory] = useState<DataPoint[]>([]);
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
        if (data.departments) {
          setDepartments(data.departments);
          setLastUpdated(new Date(data.timestamp));
          const totalLoad = data.departments.reduce(
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
            Registrar & Cashier • {totalTickets} active • Voice on
          </p>
        </div>

        {/* Sleek Chart */}
        <div className="px-6 py-4 border-b border-gray-100">
          <SleekChart dataPoints={history} />
        </div>

        {/* Now Serving */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            {departments.map((dept) => (
              <div key={dept.department}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span
                    className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                    style={FONT}
                  >
                    {dept.displayName}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  {dept.serving ? (
                    <span
                      className="text-2xl font-extrabold text-gray-900 tabular-nums"
                      style={FONT}
                    >
                      #{dept.serving}
                    </span>
                  ) : (
                    <span
                      className="text-2xl font-extrabold text-gray-200"
                      style={FONT}
                    >
                      —
                    </span>
                  )}
                  <span className="text-xs text-gray-400" style={FONT}>
                    {dept.waiting} waiting
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
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
            {departments.map((dept) => (
              <button
                key={dept.department}
                onClick={() => setSelectedDept(dept.department)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedDept === dept.department
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                style={FONT}
              >
                {dept.displayName} ({(dept.waitingList || []).length})
              </button>
            ))}
          </div>
        </div>

        {/* Waiting List */}
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
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className="w-8 h-8 rounded-full bg-[#1B5A8C]/10 flex items-center justify-center text-xs font-bold text-[#1B5A8C] flex-shrink-0"
                      style={FONT}
                    >
                      {ticket.ticketNumber}
                    </span>
                    <span
                      className="text-sm font-medium text-gray-900 flex-1"
                      style={FONT}
                    >
                      {formatTransaction(ticket.transactionType)}
                    </span>
                    <span
                      className="text-[11px] text-gray-400 flex-shrink-0 px-2 py-0.5 bg-gray-50 rounded-full"
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
