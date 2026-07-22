// components/registrar/ServeTicketView.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Pause,
  Play,
  SkipForward,
  Timer,
  FastForward,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import {
  getStaffTickets,
  serveTicket,
  completeServedTicket,
  cancelTicket,
} from "@/actions/ticket";
import {
  notifyNowServing,
  notifyNextTwoInLine,
} from "@/actions/ticket-notification";

interface Ticket {
  _id: string;
  ticketNumber: string;
  status: string;
  servedBy?: string | null;
  assignedTo?: string | null;
  servedAt?: string;
  createdAt?: string;
  transactionType?: string;
  department?: string;
  student?: {
    firstName?: string;
    lastName?: string;
    schoolId?: string;
    year?: string;
    section?: string;
  };
}

interface ServeTicketViewProps {
  department: string;
}

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

function formatTransactionType(type?: string) {
  if (!type) return "Unknown";
  return type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatElapsedTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ServeTicketView({ department }: ServeTicketViewProps) {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [waitingTickets, setWaitingTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [animatingTicket, setAnimatingTicket] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showMessage = useCallback(
    (type: "success" | "error", message: string) => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (type === "success") {
        setSuccess(message);
        setError("");
      } else {
        setError(message);
        setSuccess("");
      }
      messageTimerRef.current = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 4000);
    },
    [],
  );

  const loadData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setIsLoading(true);
          setLoadError(null);
        }

        console.log("🔄 Loading tickets...");

        const sessionResult = await getSession();

        if (!sessionResult.success || !sessionResult.session) {
          router.push("/?error=unauthorized");
          return;
        }

        const userStaffId = sessionResult.session.user?.staffId;
        const userRoleName = sessionResult.session.user?.roleName;

        console.log("Session data:", { userStaffId, userRoleName, department });

        if (!userStaffId) {
          setLoadError("Staff ID not found. Please log in again.");
          setIsLoading(false);
          return;
        }

        setStaffId(userStaffId);

        console.log("Fetching tickets for staffId:", userStaffId);
        const ticketsResult = await getStaffTickets(userStaffId);
        console.log("Tickets result:", ticketsResult);

        if (ticketsResult?.success) {
          const tickets: Ticket[] = ticketsResult.tickets || [];
          console.log(
            `Received ${tickets.length} tickets:`,
            tickets.map((t) => ({
              ticketNumber: t.ticketNumber,
              status: t.status,
              servedBy: t.servedBy,
              assignedTo: t.assignedTo,
              studentName: `${t.student?.firstName} ${t.student?.lastName}`,
            })),
          );

          // Find ticket currently being served by THIS staff member
          const serving =
            tickets.find(
              (t) => t.status === "serving" && t.servedBy === userStaffId,
            ) || null;

          // Find ALL serving tickets for this department (even if served by someone else)
          const anyServing =
            tickets.find(
              (t) => t.status === "serving" && t.department === department,
            ) || null;

          // Find pending tickets for this department
          const waiting = tickets
            .filter(
              (t) => t.status === "pending" && t.department === department,
            )
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateA - dateB;
            });

          console.log("Analysis:", {
            servingByMe: serving?.ticketNumber,
            anyServing: anyServing?.ticketNumber,
            waitingCount: waiting.length,
          });

          // If there's a ticket being served by someone else, show it
          // If it's being served by me, I can control it
          setCurrentTicket(
            serving ||
              (anyServing && anyServing.servedBy === null ? anyServing : null),
          );
          setWaitingTickets(waiting);

          if (serving?.servedAt) {
            setElapsedSeconds(
              Math.floor(
                (Date.now() - new Date(serving.servedAt).getTime()) / 1000,
              ),
            );
          } else {
            setElapsedSeconds(0);
          }
        } else {
          console.error("Failed to fetch tickets:", ticketsResult?.error);
          setLoadError(ticketsResult?.error || "Failed to load tickets");
        }
      } catch (err) {
        console.error("Error loading tickets:", err);
        setLoadError("An unexpected error occurred while loading tickets");
      } finally {
        setIsLoading(false);
      }
    },
    [router, department],
  );

  // Initial load
  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Timer for elapsed time
  useEffect(() => {
    if (currentTicket?.servedAt && !isPaused) {
      const startTime = new Date(currentTicket.servedAt).getTime();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [currentTicket, isPaused]);

  const handleServeNext = async (ticketNumber: string) => {
    if (!staffId) {
      showMessage("error", "Staff ID not found. Please login again.");
      return;
    }
    setIsProcessing(true);
    try {
      console.log("Serving ticket:", ticketNumber);
      const result = await serveTicket(ticketNumber, staffId);
      console.log("Serve result:", result);

      if (result.success) {
        notifyNowServing(ticketNumber);
        await loadData(true);
        showMessage("success", `Now serving ticket #${ticketNumber}`);
      } else {
        showMessage("error", result.error || "Failed to serve ticket");
      }
    } catch (err) {
      console.error("Error serving ticket:", err);
      showMessage("error", "An error occurred while serving ticket");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!currentTicket || !staffId) return;
    setIsProcessing(true);
    try {
      console.log("Completing ticket:", currentTicket.ticketNumber);
      const result = await completeServedTicket(
        currentTicket.ticketNumber,
        staffId,
      );
      console.log("Complete result:", result);

      if (result.success) {
        showMessage(
          "success",
          `Ticket #${currentTicket.ticketNumber} completed`,
        );
        await loadData(true);
      } else {
        showMessage("error", result.error || "Failed to complete ticket");
      }
    } catch (err) {
      console.error("Error completing ticket:", err);
      showMessage("error", "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!staffId || !currentTicket) return;
    setIsProcessing(true);
    try {
      console.log("Skipping ticket:", currentTicket.ticketNumber);
      await cancelTicket(currentTicket.ticketNumber);
      await loadData(true);
      showMessage("success", `Skipped #${currentTicket.ticketNumber}`);
    } catch (err) {
      console.error("Error in handleSkip:", err);
      showMessage("error", "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePause = () => setIsPaused((prev) => !prev);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500" style={FONT}>
            Loading queue...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 text-center" style={FONT}>
          {loadError}
        </p>
        <button
          onClick={() => loadData()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          style={FONT}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Check if current ticket is actually served by this staff member
  const isMyTicket = currentTicket?.servedBy === staffId;
  const canControl = isMyTicket || !currentTicket?.servedBy;

  return (
    <div>
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 mb-1">
        <div
          className="flex items-center gap-3 text-xs text-gray-500"
          style={FONT}
        >
          <span>{waitingTickets.length} waiting</span>
          {currentTicket && (
            <div className="flex items-center gap-2.5">
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1.5 text-[#1B5A8C] font-medium">
                <span className="w-1.5 h-1.5 bg-[#1B5A8C] rounded-full animate-pulse" />
                Serving #{currentTicket.ticketNumber}
                {!isMyTicket && currentTicket.servedBy && (
                  <span className="text-gray-400 font-normal">
                    (by another staff)
                  </span>
                )}
              </span>
              {isMyTicket && (
                <span className="flex items-center gap-1 text-gray-400 tabular-nums">
                  <Timer className="w-3 h-3" />
                  {formatElapsedTime(elapsedSeconds)}
                </span>
              )}
            </div>
          )}
          {isPaused && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Pause className="w-3 h-3" /> Paused
            </span>
          )}
        </div>
        <button
          onClick={() => loadData(true)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          style={FONT}
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div
          className="py-2.5 text-xs text-green-600 border-b border-green-100"
          style={FONT}
        >
          {success}
        </div>
      )}
      {error && (
        <div
          className="py-2.5 text-xs text-red-500 border-b border-red-100"
          style={FONT}
        >
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-gray-100">
        {/* Now Serving */}
        <div className="lg:col-span-3 py-6 lg:pr-8">
          {currentTicket ? (
            <div className="space-y-6" key={currentTicket._id}>
              <div>
                <p
                  className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4"
                  style={FONT}
                >
                  Now Serving
                </p>
                <div className="mb-6">
                  <h2
                    className="text-lg font-bold text-gray-900 mb-1"
                    style={FONT}
                  >
                    {currentTicket.student?.firstName}{" "}
                    {currentTicket.student?.lastName}
                  </h2>
                  <p className="text-sm text-gray-500" style={FONT}>
                    {formatTransactionType(currentTicket.transactionType)}
                  </p>
                </div>
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <span className="text-xs text-gray-400" style={FONT}>
                      School ID
                    </span>
                    <span
                      className="text-xs font-semibold text-gray-900"
                      style={FONT}
                    >
                      {currentTicket.student?.schoolId || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <span className="text-xs text-gray-400" style={FONT}>
                      Year level
                    </span>
                    <span
                      className="text-xs font-semibold text-gray-900"
                      style={FONT}
                    >
                      {currentTicket.student?.year || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <span className="text-xs text-gray-400" style={FONT}>
                      Section
                    </span>
                    <span
                      className="text-xs font-semibold text-gray-900"
                      style={FONT}
                    >
                      {currentTicket.student?.section || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <span className="text-xs text-gray-400" style={FONT}>
                      Ticket #
                    </span>
                    <span
                      className="text-xs font-semibold text-[#1B5A8C] tabular-nums"
                      style={FONT}
                    >
                      #{currentTicket.ticketNumber}
                    </span>
                  </div>
                  {isMyTicket && (
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-gray-400" style={FONT}>
                        Elapsed time
                      </span>
                      <span
                        className="text-xs font-semibold text-gray-900 tabular-nums"
                        style={FONT}
                      >
                        {formatElapsedTime(elapsedSeconds)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls - Only show if this staff can control the ticket */}
              {canControl && (
                <div className="pt-5 mt-6 border-t border-gray-100 space-y-3">
                  <p
                    className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
                    style={FONT}
                  >
                    Controls
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={togglePause}
                      disabled={isProcessing || !isMyTicket}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                        isPaused
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "text-gray-500 hover:bg-gray-50 border border-transparent"
                      }`}
                      style={FONT}
                    >
                      {isPaused ? (
                        <Play className="w-3.5 h-3.5" />
                      ) : (
                        <Pause className="w-3.5 h-3.5" />
                      )}
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                    <div className="flex-1" />
                    {isMyTicket && (
                      <>
                        <button
                          onClick={handleComplete}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5A8C] text-white text-xs font-semibold rounded-full hover:bg-[#154874] disabled:opacity-30 transition-all"
                          style={FONT}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Complete
                        </button>
                        <button
                          onClick={handleSkip}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full disabled:opacity-30 transition-all"
                          style={FONT}
                        >
                          <FastForward className="w-3.5 h-3.5" />
                          Skip
                        </button>
                      </>
                    )}
                    {!isMyTicket && (
                      <button
                        onClick={() =>
                          handleServeNext(currentTicket.ticketNumber)
                        }
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-full hover:bg-green-700 disabled:opacity-30 transition-all"
                        style={FONT}
                      >
                        Take Over
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-[#1B5A8C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-[#1B5A8C]" />
              </div>
              <p
                className="text-base font-semibold text-gray-400 mb-1"
                style={FONT}
              >
                Ready to serve
              </p>
              <p className="text-xs text-gray-300" style={FONT}>
                {waitingTickets.length > 0
                  ? `${waitingTickets.length} ticket${waitingTickets.length !== 1 ? "s" : ""} in queue`
                  : "Queue is empty"}
              </p>
            </div>
          )}
        </div>

        {/* Queue */}
        <div className="lg:col-span-2 py-6 lg:pl-8">
          <p
            className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-5"
            style={FONT}
          >
            Queue
          </p>
          <div className="space-y-1">
            {waitingTickets.length === 0 ? (
              <p
                className="py-12 text-xs text-gray-300 text-center"
                style={FONT}
              >
                No tickets in queue
              </p>
            ) : (
              waitingTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="group py-3 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="text-xs font-semibold text-[#1B5A8C] tabular-nums w-9 flex-shrink-0"
                        style={FONT}
                      >
                        #{ticket.ticketNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold text-gray-900 truncate"
                          style={FONT}
                        >
                          {ticket.student?.firstName} {ticket.student?.lastName}
                        </p>
                        <p
                          className="text-xs text-gray-500 mt-0.5 truncate"
                          style={FONT}
                        >
                          {formatTransactionType(ticket.transactionType)} ·{" "}
                          {ticket.student?.schoolId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleServeNext(ticket.ticketNumber)}
                      disabled={isProcessing || isPaused}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-[#1B5A8C] text-white text-xs font-semibold rounded-full hover:bg-[#154874] transition-all disabled:opacity-0 flex-shrink-0"
                      style={FONT}
                    >
                      Serve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
