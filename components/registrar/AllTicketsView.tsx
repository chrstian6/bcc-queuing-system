// components/registrar/AllTicketsView.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import { getStaffAllTickets } from "@/actions/ticket";
import { getDepartmentStaffCounters } from "@/actions/ticketNumberDistribution";
import {
  filterTicketsByRole,
  getRoleLabel,
  DEAN_TRANSACTION_TYPES,
  CASHIER_TRANSACTION_TYPES,
  REGISTRAR_TRANSACTION_TYPES,
} from "@/lib/ticketUtils";

interface AllTicketsViewProps {
  department: string;
}

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

// Cache for staff names
const staffNameCache: Record<string, string> = {};

function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse" style={FONT}>
      <div>
        <div className="h-4 w-16 bg-gray-100 rounded-full mb-1" />
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 bg-gray-100 rounded-full" />
        ))}
      </div>
      <div className="h-9 bg-gray-100 rounded-lg" />
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
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string>("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [staffCounters, setStaffCounters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [displayCount, setDisplayCount] = useState(20);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.session) {
        router.push("/?error=unauthorized");
        return;
      }

      const userStaffId = sessionResult.session.user?.staffId;
      const userStaffRole = sessionResult.session.user?.staffRole || department;

      if (!userStaffId) {
        setLoadError("Staff ID not found");
        setIsLoading(false);
        return;
      }

      setStaffId(userStaffId);
      setStaffRole(userStaffRole);

      const filters: any = {};
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const result = await getStaffAllTickets(userStaffId, filters);

      if (result.success) {
        // Filter by role (department + transaction type)
        const filtered = filterTicketsByRole(
          result.tickets || [],
          userStaffRole,
        );
        setTickets(filtered);
        setDisplayCount(20);
      } else {
        console.error("Failed to fetch tickets:", result.error);
        setLoadError(result.error || "Failed to fetch tickets");
        setTickets([]);
      }

      // Fetch staff counters for names
      try {
        const countersResult = await getDepartmentStaffCounters(department);
        if (countersResult.success) {
          setStaffCounters(countersResult.counters || []);
        }
      } catch (err) {
        console.error("Error fetching staff counters:", err);
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
      setLoadError("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, router, department]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 20);
  };

  const getStaffName = (staffId: string): string => {
    if (!staffId) return "—";
    if (staffNameCache[staffId]) return staffNameCache[staffId];
    const staff = staffCounters.find((s) => s.staffId === staffId);
    const name = staff ? staff.staffName : staffId.slice(0, 8) + "...";
    staffNameCache[staffId] = name;
    return name;
  };

  // FIXED: Get valid transaction types for this staff role
  const getValidTransactionTypes = (): string[] => {
    if (staffRole === "dean") return [...DEAN_TRANSACTION_TYPES];
    if (staffRole === "cashier") return [...CASHIER_TRANSACTION_TYPES];
    if (staffRole === "registrar") return [...REGISTRAR_TRANSACTION_TYPES];
    return [];
  };

  const validTransactionTypes = getValidTransactionTypes();

  const filteredTickets = tickets.filter((ticket) => {
    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        ticket.ticketNumber?.toLowerCase().includes(search) ||
        ticket.student?.firstName?.toLowerCase().includes(search) ||
        ticket.student?.lastName?.toLowerCase().includes(search) ||
        ticket.student?.schoolId?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Filter by transaction type
    if (
      transactionTypeFilter !== "all" &&
      ticket.transactionType !== transactionTypeFilter
    ) {
      return false;
    }

    return true;
  });

  const displayedTickets = filteredTickets.slice(0, displayCount);
  const hasMore = displayCount < filteredTickets.length;

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
      waiting: "bg-yellow-400",
      serving: "bg-blue-500 animate-pulse",
      completed: "bg-green-500",
      cancelled: "bg-red-400",
      "no-show": "bg-orange-400",
      skipped: "bg-purple-400",
    };
    return styles[status] || "bg-gray-400";
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: "text-yellow-700",
      waiting: "text-yellow-700",
      serving: "text-blue-700",
      completed: "text-green-700",
      cancelled: "text-red-400 line-through",
      "no-show": "text-orange-700",
      skipped: "text-purple-700",
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
    pending: tickets.filter(
      (t) => t.status === "pending" || t.status === "waiting",
    ).length,
    serving: tickets.filter((t) => t.status === "serving").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    cancelled: tickets.filter(
      (t) =>
        t.status === "cancelled" ||
        t.status === "no-show" ||
        t.status === "skipped",
    ).length,
  };

  // Transaction type counts
  const transactionTypeCounts: Record<string, number> = {};
  validTransactionTypes.forEach((type) => {
    transactionTypeCounts[type] = tickets.filter(
      (t) => t.transactionType === type,
    ).length;
  });

  const roleLabel = getRoleLabel(staffRole);

  if (isLoading) {
    return <HistorySkeleton />;
  }

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4"
        style={FONT}
      >
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 text-center">{loadError}</p>
        <button
          onClick={() => loadTickets()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={FONT}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {roleLabel} History
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredTickets.length} ticket
            {filteredTickets.length !== 1 ? "s" : ""}
            {displayCount < filteredTickets.length &&
              ` · Showing ${displayCount}`}
          </p>
        </div>
        <button
          onClick={() => loadTickets()}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === item.value
                ? "bg-[#1B5A8C] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {item.label}
            <span
              className={`tabular-nums ${
                statusFilter === item.value ? "text-white/60" : "text-gray-400"
              }`}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Transaction Type Filter - Only show if there are valid types */}
      {validTransactionTypes.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setTransactionTypeFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              transactionTypeFilter === "all"
                ? "bg-[#1B5A8C]/10 text-[#1B5A8C] border border-[#1B5A8C]/20"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All Types
          </button>
          {validTransactionTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTransactionTypeFilter(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                transactionTypeFilter === type
                  ? "bg-[#1B5A8C]/10 text-[#1B5A8C] border border-[#1B5A8C]/20"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {formatTransaction(type)}
              {transactionTypeCounts[type] > 0 && (
                <span className="ml-1 text-gray-400 tabular-nums">
                  {transactionTypeCounts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

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
              {statusFilter === "all" && transactionTypeFilter === "all"
                ? `${roleLabel} ticket history will appear here`
                : "No tickets match the current filters"}
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
                    className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50/50 transition-colors group"
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
                          className={`text-xs font-semibold truncate ${
                            ticket.status === "cancelled"
                              ? "line-through text-gray-400"
                              : "text-gray-900"
                          }`}
                        >
                          {ticket.student?.firstName || "Unknown"}{" "}
                          {ticket.student?.lastName || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 truncate">
                          {formatTransaction(
                            ticket.transactionType || "Unknown",
                          )}
                        </span>
                        {ticket.student?.schoolId && (
                          <>
                            <span className="text-[11px] text-gray-300">•</span>
                            <span className="text-[11px] text-gray-400 truncate">
                              {ticket.student.schoolId}
                            </span>
                          </>
                        )}
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
      {hasMore && (
        <div className="pt-2 pb-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load more ({filteredTickets.length - displayCount} remaining)
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
