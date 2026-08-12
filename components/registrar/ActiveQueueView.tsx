// components/registrar/ActiveQueueView.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  UserCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import {
  getStaffQueueData,
  serveTicket,
  completeServedTicket,
  cancelTicket,
} from "@/actions/ticket";
import { getStaffDailyStats } from "@/actions/ticketNumberDistribution";
import { filterTicketsByRole } from "@/lib/ticketUtils";

interface ActiveQueueViewProps {
  department: string;
}

export function ActiveQueueView({ department }: ActiveQueueViewProps) {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string>("");
  const [servingTicket, setServingTicket] = useState<any>(null);
  const [waitingTickets, setWaitingTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
        setLoadError("Staff ID not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      setStaffId(userStaffId);
      setStaffRole(userStaffRole);

      const ticketsResult = await getStaffQueueData(userStaffId);

      if (ticketsResult && ticketsResult.success) {
        let tickets = ticketsResult.tickets || [];

        // Filter tickets by role
        tickets = filterTicketsByRole(tickets, userStaffRole);

        const serving = tickets.find(
          (t: any) => t.status === "serving" && t.servedBy === userStaffId,
        );

        const waiting = tickets
          .filter((t: any) => t.status === "pending")
          .sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });

        setServingTicket(serving || null);
        setWaitingTickets(waiting);
      } else {
        setServingTicket(null);
        setWaitingTickets([]);
      }

      try {
        const statsResult = await getStaffDailyStats(userStaffId);
        if (statsResult?.success) {
          setStats(statsResult.stats);
        }
      } catch (statsError) {
        console.error("Error loading stats:", statsError);
      }
    } catch (err) {
      console.error("Error loading queue:", err);
      setLoadError("Failed to load queue data");
    } finally {
      setIsLoading(false);
    }
  }, [router, department]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleServeNext = async (ticketNumber: string) => {
    if (!staffId) {
      setError("Staff ID not found. Please login again.");
      return;
    }
    setIsProcessing(true);
    setError("");
    setSuccess("");
    try {
      const result = await serveTicket(ticketNumber, staffId);
      if (result.success) {
        setSuccess(`Now serving ticket #${ticketNumber}`);
        await loadData();
      } else {
        setError(result.error || "Failed to serve ticket");
      }
    } catch (err) {
      console.error("Error serving ticket:", err);
      setError("Failed to serve ticket");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!servingTicket || !staffId) return;
    setIsProcessing(true);
    setError("");
    setSuccess("");
    try {
      const result = await completeServedTicket(
        servingTicket.ticketNumber,
        staffId,
      );
      if (result.success) {
        setSuccess(`Ticket #${servingTicket.ticketNumber} completed!`);
        await loadData();
      } else {
        setError(result.error || "Failed to complete ticket");
      }
    } catch (err) {
      console.error("Error completing ticket:", err);
      setError("Failed to complete ticket");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!servingTicket) return;
    setIsProcessing(true);
    setError("");
    setSuccess("");
    try {
      const result = await cancelTicket(servingTicket.ticketNumber);
      if (result.success) {
        setSuccess(`Ticket #${servingTicket.ticketNumber} cancelled`);
        await loadData();
      } else {
        setError(result.error || "Failed to cancel ticket");
      }
    } catch (err) {
      console.error("Error cancelling ticket:", err);
      setError("Failed to cancel ticket");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      waiting: "bg-yellow-100 text-yellow-700",
      serving: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B5A8C]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 font-['Plus_Jakarta_Sans']">
          {loadError}
        </p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-['Plus_Jakarta_Sans']"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const roleLabel = staffRole === "dean" ? "Dean" : "Cashier";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
            {roleLabel} Queue
          </h2>
          <p className="text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
            {stats ? `${stats.ticketsServed || 0} served today` : ""}
            {stats?.nextTicketNumber
              ? ` • Next ticket: #${stats.nextTicketNumber}`
              : ""}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-['Plus_Jakarta_Sans']"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-['Plus_Jakarta_Sans']">
            {success}
          </p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-['Plus_Jakarta_Sans']">
            {error}
          </p>
        </div>
      )}

      {servingTicket ? (
        <div className="bg-gradient-to-br from-[#1B5A8C] to-[#0B3B5F] rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 font-['Plus_Jakarta_Sans']">
              Now Serving
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <span className="text-xl font-bold font-['Plus_Jakarta_Sans']">
                  #{servingTicket.ticketNumber}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold font-['Plus_Jakarta_Sans'] truncate">
                  {servingTicket.student?.firstName || "Unknown"}{" "}
                  {servingTicket.student?.lastName || ""}
                </p>
                <p className="text-sm text-white/70 font-['Plus_Jakarta_Sans']">
                  {servingTicket.transactionType
                    ?.replace(/-/g, " ")
                    .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                    "Unknown"}
                </p>
                <p className="text-xs text-white/50 mt-0.5 font-['Plus_Jakarta_Sans']">
                  {servingTicket.student?.schoolId || "N/A"} •{" "}
                  {servingTicket.student?.year || "?"} -{" "}
                  {servingTicket.student?.section || "?"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 backdrop-blur-sm font-['Plus_Jakarta_Sans']"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Complete</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/30 hover:bg-red-500/50 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 backdrop-blur-sm font-['Plus_Jakarta_Sans']"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 font-['Plus_Jakarta_Sans']">
            No Active Ticket
          </h3>
          <p className="text-sm text-gray-500 font-['Plus_Jakarta_Sans']">
            {waitingTickets.length > 0
              ? "Serve a ticket from the waiting queue below"
              : "No tickets in queue. Waiting for new tickets..."}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-yellow-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 font-['Plus_Jakarta_Sans']">
            Waiting Queue ({waitingTickets.length})
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {waitingTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-['Plus_Jakarta_Sans']">
                No waiting tickets
              </p>
              <p className="text-sm text-gray-400 mt-1 font-['Plus_Jakarta_Sans']">
                New {roleLabel.toLowerCase()} tickets will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {waitingTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-[#1B5A8C]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#1B5A8C] font-['Plus_Jakarta_Sans']">
                          #{ticket.ticketNumber}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 font-['Plus_Jakarta_Sans']">
                            {ticket.student?.firstName || "Unknown"}{" "}
                            {ticket.student?.lastName || ""}
                          </p>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 font-['Plus_Jakarta_Sans'] ${getStatusBadge(ticket.status)}`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-xs text-gray-500 font-['Plus_Jakarta_Sans']">
                            {ticket.transactionType
                              ?.replace(/-/g, " ")
                              .replace(/\b\w/g, (l: string) =>
                                l.toUpperCase(),
                              ) || "Unknown"}
                          </p>
                          {ticket.student?.schoolId && (
                            <p className="text-xs text-gray-400 font-['Plus_Jakarta_Sans']">
                              {ticket.student.schoolId}
                            </p>
                          )}
                          {ticket.createdAt && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span className="font-['Plus_Jakarta_Sans']">
                                {new Date(ticket.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleServeNext(ticket.ticketNumber)}
                      disabled={isProcessing || !!servingTicket}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1B5A8C] text-white text-sm font-medium rounded-lg hover:bg-[#0B3B5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 font-['Plus_Jakarta_Sans']"
                      title={
                        servingTicket
                          ? "Complete current ticket first"
                          : "Serve this ticket"
                      }
                    >
                      Serve
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
