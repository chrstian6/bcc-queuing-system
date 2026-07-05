// components/student/StudentTicketsView.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyTickets } from "@/actions/student";
import { ChevronDown, RefreshCw, Search } from "lucide-react";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "serving", label: "Serving" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  serving: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

function formatTransaction(type: string) {
  return type?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function dayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function StudentTicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getMyTickets();
    if (result.success) setTickets(result.tickets || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        ticket.ticketNumber?.toLowerCase().includes(term) ||
        ticket.transactionType?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Group by day
  const groups: { label: string; items: any[] }[] = [];
  for (const ticket of filtered) {
    const label = dayLabel(ticket.createdAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(ticket);
    else groups.push({ label, items: [ticket] });
  }

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans']">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === filter.id
                  ? "bg-white text-[#1B5A8C] shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket # or type"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-[#1B5A8C] outline-none text-sm"
          />
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          Loading tickets...
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          No tickets found
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {group.label}
            </h3>
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
              {group.items.map((ticket) => (
                <div key={ticket.ticketId}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(
                        expanded === ticket.ticketId ? null : ticket.ticketId,
                      )
                    }
                    className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        #{ticket.ticketNumber} —{" "}
                        {formatTransaction(ticket.transactionType)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ticket.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {ticket.amount ? ` • ₱${ticket.amount}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[ticket.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {ticket.status}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expanded === ticket.ticketId ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>
                  {expanded === ticket.ticketId && (
                    <div className="px-4 pb-4 pt-1">
                      <div className="rounded-lg bg-gray-50 p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Status Timeline
                        </h4>
                        {ticket.statusHistory?.length ? (
                          <ol className="space-y-2">
                            {ticket.statusHistory.map(
                              (entry: any, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B5A8C] flex-shrink-0" />
                                  <span className="font-medium text-gray-700 capitalize">
                                    {entry.status}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </span>
                                </li>
                              ),
                            )}
                          </ol>
                        ) : (
                          <p className="text-xs text-gray-400">
                            No timeline recorded
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
