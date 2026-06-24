// components/public/LiveQueueSection.tsx
"use client";

import { Users, UserCheck } from "lucide-react";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

export default function LiveQueueSection() {
  const { departments, isConnected, lastUpdated } = useRealtimeQueue();

  const visibleDepartments = departments.filter(
    (dept) => dept.department === "registrar" || dept.department === "cashier",
  );

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="px-0 md:px-0 py-10 bg-white" id="live-queue">
      <div className="max-w-full mx-0">
        {/* Section Header */}
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

        {/* Always visible grid */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {visibleDepartments.length > 0 ? (
            visibleDepartments.map((dept) => (
              <div
                key={dept.department}
                className="border-r border-b border-gray-100 last:border-r-0"
              >
                <div className="px-6 md:px-10 py-6">
                  <h3
                    className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5"
                    style={FONT}
                  >
                    {dept.displayName}
                  </h3>
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1B5A8C]/5 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-[#1B5A8C]" />
                      </div>
                      <div>
                        <p
                          className="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                          style={FONT}
                        >
                          Serving
                        </p>
                        {dept.serving ? (
                          <p
                            className="text-3xl font-extrabold text-[#1B5A8C] tabular-nums tracking-tight"
                            style={FONT}
                          >
                            #{dept.serving}
                          </p>
                        ) : (
                          <p
                            className="text-3xl font-extrabold text-gray-200 tracking-tight"
                            style={FONT}
                          >
                            —
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-px h-12 bg-gray-100" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p
                          className="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                          style={FONT}
                        >
                          Waiting
                        </p>
                        <p
                          className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight"
                          style={FONT}
                        >
                          {dept.waiting}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Fallback: always show Registrar and Cashier even without data
            <>
              <div className="border-r border-b border-gray-100">
                <div className="px-6 md:px-10 py-6">
                  <h3
                    className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5"
                    style={FONT}
                  >
                    Registrar
                  </h3>
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1B5A8C]/5 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-[#1B5A8C]" />
                      </div>
                      <div>
                        <p
                          className="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                          style={FONT}
                        >
                          Serving
                        </p>
                        <p
                          className="text-3xl font-extrabold text-gray-200 tracking-tight"
                          style={FONT}
                        >
                          —
                        </p>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-gray-100" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p
                          className="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                          style={FONT}
                        >
                          Waiting
                        </p>
                        <p
                          className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight"
                          style={FONT}
                        >
                          0
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-b border-gray-100">
                <div className="px-6 md:px-10 py-6">
                  <h3
                    className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5"
                    style={FONT}
                  >
                    Cashier
                  </h3>
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1B5A8C]/5 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-[#1B5A8C]" />
                      </div>
                      <div>
                        <p
                          className="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                          style={FONT}
                        >
                          Serving
                        </p>
                        <p
                          className="text-3xl font-extrabold text-gray-200 tracking-tight"
                          style={FONT}
                        >
                          —
                        </p>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-gray-100" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p
                          className="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                          style={FONT}
                        >
                          Waiting
                        </p>
                        <p
                          className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight"
                          style={FONT}
                        >
                          0
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
