// components/public/LiveQueueSection.tsx
"use client";

import { Users, UserCheck, Wifi, WifiOff } from "lucide-react";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

export default function LiveQueueSection() {
  const { departments, isConnected, lastUpdated, error } = useRealtimeQueue();

  // Filter to show only registrar and cashier
  const visibleDepartments = departments.filter(
    (dept) => dept.department === "registrar" || dept.department === "cashier",
  );

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="px-0 md:px-0 py-10 bg-white">
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
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
              )}
              <span className="text-[11px] text-gray-400" style={FONT}>
                {isConnected ? "Live" : "Reconnecting..."}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400" style={FONT}>
            Updated {formatTime(lastUpdated)}
          </span>
        </div>

        {error && (
          <div className="px-6 md:px-10 mb-3">
            <p className="text-xs text-red-500" style={FONT}>
              {error}
            </p>
          </div>
        )}

        {/* Full Width Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {visibleDepartments.map((dept) => (
            <div
              key={dept.department}
              className="border-r border-b border-gray-100 last:border-r-0"
            >
              <div className="px-6 md:px-10 py-6">
                {/* Department Name */}
                <h3
                  className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5"
                  style={FONT}
                >
                  {dept.displayName}
                </h3>

                {/* Stats Row */}
                <div className="flex items-center gap-10">
                  {/* Now Serving */}
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

                  {/* Divider */}
                  <div className="w-px h-12 bg-gray-100" />

                  {/* Waiting */}
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

                  {/* Status */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dept.serving
                          ? "bg-green-500 animate-pulse"
                          : dept.waiting > 0
                            ? "bg-amber-400"
                            : "bg-gray-200"
                      }`}
                    />
                    <span className="text-[10px] text-gray-400" style={FONT}>
                      {dept.serving
                        ? "Active"
                        : dept.waiting > 0
                          ? "Waiting"
                          : "Idle"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {visibleDepartments.length === 0 && (
          <div className="text-center py-16 border-t border-gray-100">
            <WifiOff className="w-6 h-6 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400" style={FONT}>
              {isConnected ? "No departments available" : "Connecting..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
