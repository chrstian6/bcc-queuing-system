// components/registrar/AllTicketsView.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Clock } from "lucide-react";
import { getSession } from "@/actions/auth";
import { getStaffTickets } from "@/actions/ticket";
import { getDepartmentStaffCounters } from "@/actions/ticketNumberDistribution";

interface AllTicketsViewProps {
  department: string;
}

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

// Cache for staff names to avoid repeated lookups
const staffNameCache: Record<string, string> = {};

// Cache for ticket history data
let cachedTickets: any[] = [];
let cachedStaffCounters: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Inline skeleton for history view
function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse" style={FONT}>
      {/* Header */}
      <div>
        <div className="h-4 w-16 bg-gray-100 rounded-full mb-1" />
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 bg-gray-100 rounded-full" />
        ))}
      </div>

      {/* Search */}
      <div className="h-9 bg-gray-100 rounded-lg" />

      {/* Timeline */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-3 w-32 bg-gray-100 rounded-full" />
            <div className="flex-1 h-px bg-gray-50" />
            <div className="h-3 w-4 bg-gray-100 rounded-full" />
          </div>
          <div className="space-y-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-2 h-2 bg-gray-200 rounded-full" />
                <div className="h-3 w-10 bg-gray-100 rounded-full" />
                <div className="h-3 w-8 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-36 bg-gray-100 rounded-full" />
                  <div className="h-2.5 w-56 bg-gray-100 rounded-full" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AllTicketsView({ department }: AllTicketsViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>(cachedTickets);
  const [staffCounters, setStaffCounters] =
    useState<any[]>(cachedStaffCounters);
  const [isLoading, setIsLoading] = useState(cachedTickets.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMoreTickets, setHasMoreTickets] = useState(false);
  const [animatingTicketId, setAnimatingTicketId] = useState<string | null>(
    null,
  );
  const [displayCount, setDisplayCount] = useState(10);
  const previousTicketIdsRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  const loadTickets = useCallback(
    async (forceRefresh = false) => {
      try {
        const now = Date.now();
        if (
          !forceRefresh &&
          cachedTickets.length > 0 &&
          now - lastFetchTime < CACHE_DURATION
        ) {
          setTickets(cachedTickets);
          setStaffCounters(cachedStaffCounters);
          setIsLoading(false);
          return;
        }

        if (isInitialMount.current && cachedTickets.length > 0) {
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        const sessionResult = await getSession();
        if (!sessionResult.success || !sessionResult.session) {
          router.push("/?error=unauthorized");
          return;
        }
        setUser(sessionResult.session.user);

        const staffId = sessionResult.session.user?.staffId;
        if (!staffId) {
          setIsLoading(false);
          return;
        }

        const filters: any = {};
        if (statusFilter !== "all") {
          filters.status = statusFilter;
        }

        const allResult = await getStaffTickets(staffId, filters);
        const today = new Date().toISOString().split("T")[0];
        filters.date = today;
        const result = await getStaffTickets(staffId, filters);

        if (result.success) {
          const newTickets = result.tickets;

          const currentIds = new Set(previousTicketIdsRef.current);
          newTickets.forEach((ticket: any) => {
            if (
              !currentIds.has(ticket._id) &&
              previousTicketIdsRef.current.size > 0
            ) {
              setAnimatingTicketId(ticket._id);
              setTimeout(() => setAnimatingTicketId(null), 600);
            }
          });

          previousTicketIdsRef.current = new Set(
            newTickets.map((t: any) => t._id),
          );
          cachedTickets = newTickets;
          lastFetchTime = now;
          setTickets(newTickets);
          setDisplayCount(10);

          if (allResult.success) {
            setHasMoreTickets(
              newTickets.length < allResult.tickets.length ||
                allResult.tickets.length > 10,
            );
          }
        }

        if (
          cachedStaffCounters.length === 0 ||
          now - lastFetchTime >= CACHE_DURATION
        ) {
          const countersResult = await getDepartmentStaffCounters(department);
          if (countersResult.success) {
            cachedStaffCounters = countersResult.counters;
            setStaffCounters(countersResult.counters);
          }
        }
      } catch (error) {
        console.error("Error loading tickets:", error);
      } finally {
        setIsLoading(false);
        isInitialMount.current = false;
      }
    },
    [statusFilter, router, department],
  );

  useEffect(() => {
    loadTickets(true);
  }, [loadTickets]);

  const handleLoadMore = async () => {
    if (!user?.staffId) return;

    setIsLoadingMore(true);
    try {
      const filters: any = {};
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const result = await getStaffTickets(user.staffId, filters);
      if (result.success) {
        cachedTickets = result.tickets;
        lastFetchTime = Date.now();
        setTickets(result.tickets);
        setHasMoreTickets(false);
        setDisplayCount(result.tickets.length);
      }
    } catch (error) {
      console.error("Error loading more tickets:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getStaffName = (staffId: string): string => {
    if (!staffId) return "—";
    if (staffNameCache[staffId]) return staffNameCache[staffId];
    const staff = staffCounters.find((s) => s.staffId === staffId);
    const name = staff ? staff.staffName : "—";
    staffNameCache[staffId] = name;
    return name;
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ticket.ticketNumber?.toLowerCase().includes(search) ||
      ticket.student?.firstName?.toLowerCase().includes(search) ||
      ticket.student?.lastName?.toLowerCase().includes(search) ||
      ticket.student?.schoolId?.toLowerCase().includes(search)
    );
  });

  const displayedTickets = filteredTickets.slice(0, displayCount);

  const groupedTickets = displayedTickets.reduce(
    (groups: Record<string, any[]>, ticket) => {
      const date = new Date(ticket.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(ticket);
      return groups;
    },
    {},
  );

  const getStatusDot = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-400",
      serving: "bg-blue-500 animate-pulse",
      completed: "bg-green-500",
      cancelled: "bg-red-400",
    };
    return styles[status] || "bg-gray-400";
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: "text-yellow-700",
      serving: "text-blue-700",
      completed: "text-green-700",
      cancelled: "text-red-400 line-through",
    };
    return styles[status] || "text-gray-700";
  };

  const formatTransaction = (type: string) =>
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusCounts = {
    all: tickets.length,
    pending: tickets.filter((t) => t.status === "pending").length,
    serving: tickets.filter((t) => t.status === "serving").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    cancelled: tickets.filter((t) => t.status === "cancelled").length,
  };

  if (isLoading) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-4" style={FONT}>
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          History
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {filteredTickets.length} ticket
          {filteredTickets.length !== 1 ? "s" : ""}
          {displayCount < filteredTickets.length &&
            ` · Showing ${displayCount}`}
        </p>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { label: "All", value: "all", count: statusCounts.all },
          { label: "Pending", value: "pending", count: statusCounts.pending },
          { label: "Serving", value: "serving", count: statusCounts.serving },
          {
            label: "Completed",
            value: "completed",
            count: statusCounts.completed,
          },
          {
            label: "Cancelled",
            value: "cancelled",
            count: statusCounts.cancelled,
          },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setStatusFilter(item.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === item.value ? "bg-[#1B5A8C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {item.label}
            <span
              className={`tabular-nums ${statusFilter === item.value ? "text-white/60" : "text-gray-400"}`}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, ID, or ticket number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B5A8C]/20 focus:border-[#1B5A8C] transition-all"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.keys(groupedTickets).length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-xs text-gray-500">No tickets found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter === "all"
                ? "Your history will appear here"
                : `No ${statusFilter} tickets`}
            </p>
          </div>
        ) : (
          Object.entries(groupedTickets).map(([date, dateTickets]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-500">
                  {date}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 tabular-nums">
                  {(dateTickets as any[]).length}
                </span>
              </div>
              <div className="space-y-0.5">
                {(dateTickets as any[]).map((ticket) => (
                  <div
                    key={ticket._id}
                    className={`flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50/50 transition-colors group ${animatingTicketId === ticket._id ? "animate-in slide-in-from-right-4 fade-in duration-500 bg-[#1B5A8C]/5" : ""}`}
                  >
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${getStatusDot(ticket.status)}`}
                      />
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums w-12 flex-shrink-0">
                      {formatTime(ticket.createdAt)}
                    </span>
                    <span className="text-xs font-bold text-[#1B5A8C] tabular-nums w-10 flex-shrink-0">
                      #{ticket.ticketNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold truncate ${ticket.status === "cancelled" ? "line-through text-gray-400" : "text-gray-900"}`}
                        >
                          {ticket.student?.firstName} {ticket.student?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 truncate">
                          {formatTransaction(ticket.transactionType)}
                        </span>
                        <span className="text-[11px] text-gray-300">•</span>
                        <span className="text-[11px] text-gray-400 truncate">
                          {ticket.student?.schoolId}
                        </span>
                        {ticket.servedBy && (
                          <>
                            <span className="text-[11px] text-gray-300">•</span>
                            <span className="text-[11px] text-gray-500 truncate">
                              {getStaffName(ticket.servedBy)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium capitalize flex-shrink-0 ${getStatusStyle(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {(hasMoreTickets || displayCount < filteredTickets.length) && (
        <div className="pt-2 pb-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            {isLoadingMore ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-[#1B5A8C] rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load older tickets
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
