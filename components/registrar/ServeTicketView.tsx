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

interface Student {
  firstName?: string;
  lastName?: string;
  schoolId?: string;
  year?: string;
  section?: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  status: "pending" | "serving" | "completed" | "cancelled" | string;
  servedBy?: string;
  servedAt?: string;
  createdAt?: string;
  transactionType?: string;
  student?: Student;
}

interface SessionUser {
  staffId?: string;
  name?: string;
  [key: string]: unknown;
}

interface ServeTicketViewProps {
  department: string;
}

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

function formatTransactionType(type?: string) {
  if (!type) return "";
  return type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatElapsedTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Inline skeleton for serve view
function ServeSkeleton() {
  return (
    <div className="animate-pulse" style={FONT}>
      <div className="flex items-center justify-between pb-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
          <div className="h-5 w-40 bg-gray-100 rounded-full" />
        </div>
        <div className="h-5 w-14 bg-gray-100 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-gray-100">
        <div className="lg:col-span-3 py-6 lg:pr-8">
          <div className="h-3 w-20 bg-gray-100 rounded-full mb-4" />
          <div className="space-y-6">
            <div className="mb-6">
              <div className="h-5 w-48 bg-gray-100 rounded-full mb-2" />
              <div className="h-4 w-32 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50"
                >
                  <div className="h-3 w-16 bg-gray-100 rounded-full" />
                  <div className="h-3 w-20 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-5 mt-6 border-t border-gray-100">
            <div className="h-8 w-16 bg-gray-100 rounded-full" />
            <div className="flex-1" />
            <div className="h-8 w-20 bg-gray-100 rounded-full" />
            <div className="h-8 w-14 bg-gray-100 rounded-full" />
            <div className="h-8 w-16 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="lg:col-span-2 py-6 lg:pl-8">
          <div className="h-3 w-12 bg-gray-100 rounded-full mb-5" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-9 w-9 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-36 bg-gray-100 rounded-full" />
                  <div className="h-3 w-56 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServeTicketView({ department }: ServeTicketViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [waitingTickets, setWaitingTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [animatingTicket, setAnimatingTicket] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousWaitingLengthRef = useRef(0);
  const previousCurrentTicketRef = useRef<Ticket | null>(null);

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
        if (!silent) setIsLoading(true);
        const sessionResult = await getSession();
        if (!sessionResult.success || !sessionResult.session) {
          router.push("/?error=unauthorized");
          return;
        }
        const sessionUser = sessionResult.session.user as SessionUser;
        setUser(sessionUser);
        const staffId = sessionUser?.staffId;
        if (!staffId) {
          setIsLoading(false);
          return;
        }
        const ticketsResult = await getStaffTickets(staffId);
        if (ticketsResult?.success) {
          const tickets: Ticket[] = ticketsResult.tickets;
          const serving =
            tickets.find(
              (t) => t.status === "serving" && t.servedBy === staffId,
            ) || null;

          const waiting = tickets
            .filter((t) => t.status === "pending")
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateA - dateB;
            });

          if (
            waiting.length > previousWaitingLengthRef.current &&
            previousWaitingLengthRef.current > 0
          ) {
            const newTicket = waiting[waiting.length - 1];
            if (newTicket) {
              setAnimatingTicket(newTicket._id);
              setTimeout(() => setAnimatingTicket(null), 600);
            }
          }

          if (
            serving &&
            (!previousCurrentTicketRef.current ||
              previousCurrentTicketRef.current._id !== serving._id)
          ) {
            setAnimatingTicket(serving._id);
            setTimeout(() => setAnimatingTicket(null), 500);
          }

          previousWaitingLengthRef.current = waiting.length;
          previousCurrentTicketRef.current = serving;
          setWaitingTickets(waiting);
          setCurrentTicket(serving);

          if (serving?.servedAt) {
            setElapsedSeconds(
              Math.floor(
                (Date.now() - new Date(serving.servedAt).getTime()) / 1000,
              ),
            );
          } else {
            setElapsedSeconds(0);
          }
        }
      } catch (err) {
        console.error("Error loading:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (isPaused && timerRef.current) {
      clearInterval(timerRef.current);
    } else if (!currentTicket) {
      setElapsedSeconds(0);
    }
  }, [currentTicket, isPaused]);

  const autoServeNext = useCallback(async () => {
    if (!user?.staffId) return;

    const ticketsResult = await getStaffTickets(user.staffId);
    if (!ticketsResult?.success) return;

    const tickets: Ticket[] = ticketsResult.tickets;
    const waiting = tickets
      .filter((t) => t.status === "pending")
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

    if (waiting.length === 0) {
      setCurrentTicket(null);
      setWaitingTickets([]);
      setElapsedSeconds(0);
      previousCurrentTicketRef.current = null;
      previousWaitingLengthRef.current = 0;
      return;
    }

    const nextTicket = waiting[0];
    const serveResult = await serveTicket(
      nextTicket.ticketNumber,
      user.staffId,
    );

    if (serveResult.success) {
      notifyNowServing(nextTicket.ticketNumber, user?.name || undefined);
      notifyNextTwoInLine(department, user?.name || undefined);
      await loadData(true);
      showMessage("success", `Now serving #${nextTicket.ticketNumber}`);
    }
  }, [user, department, loadData, showMessage]);

  const handleServeNext = async (ticketNumber: string) => {
    if (!user?.staffId) {
      showMessage("error", "Staff ID not found. Please login again.");
      return;
    }
    setError("");
    setSuccess("");
    setIsProcessing(true);
    try {
      const result = await serveTicket(ticketNumber, user.staffId);
      if (result.success) {
        notifyNowServing(ticketNumber, user?.name || undefined);
        await loadData(true);
        showMessage("success", `Now serving ticket #${ticketNumber}`);
      } else {
        showMessage("error", result.error || "Failed to serve ticket");
      }
    } catch {
      showMessage("error", "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleServeFirstInQueue = async () => {
    if (!user?.staffId) {
      showMessage("error", "Staff ID not found. Please login again.");
      return;
    }

    if (!currentTicket && waitingTickets.length === 0) {
      showMessage("error", "No tickets in queue");
      return;
    }

    if (!currentTicket && waitingTickets.length > 0) {
      await handleServeNext(waitingTickets[0].ticketNumber);
      return;
    }

    setIsProcessing(true);
    try {
      if (currentTicket) {
        await completeServedTicket(currentTicket.ticketNumber, user.staffId);
      }
      await autoServeNext();
    } catch (err) {
      console.error("Error in handleServeFirstInQueue:", err);
      showMessage("error", "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.staffId || !currentTicket) return;

    setIsProcessing(true);
    try {
      await cancelTicket(currentTicket.ticketNumber);
      await autoServeNext();
      showMessage("success", `Skipped #${currentTicket.ticketNumber}`);
    } catch (err) {
      console.error("Error in handleSkip:", err);
      showMessage("error", "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!currentTicket || !user?.staffId) return;
    setIsProcessing(true);
    try {
      const result = await completeServedTicket(
        currentTicket.ticketNumber,
        user.staffId,
      );
      if (result.success) {
        showMessage(
          "success",
          `Ticket #${currentTicket.ticketNumber} completed`,
        );
        await loadData(true);
      } else {
        showMessage("error", result.error || "Failed to complete ticket");
      }
    } catch {
      showMessage("error", "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePause = () => setIsPaused((prev) => !prev);

  // Show skeleton while loading
  if (isLoading) {
    return <ServeSkeleton />;
  }

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
              </span>
              <span className="flex items-center gap-1 text-gray-400 tabular-nums">
                <Timer className="w-3 h-3" />
                {formatElapsedTime(elapsedSeconds)}
              </span>
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
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          style={FONT}
        >
          Refresh
        </button>
      </div>

      {/* Messages */}
      <div className="overflow-hidden">
        {success && (
          <div
            className="py-2.5 text-xs text-[#1B5A8C] border-b border-[#1B5A8C]/20 animate-in slide-in-from-top-2 fade-in duration-300"
            style={FONT}
          >
            {success}
          </div>
        )}
        {error && (
          <div
            className="py-2.5 text-xs text-red-500 border-b border-red-100 animate-in slide-in-from-top-2 fade-in duration-300"
            style={FONT}
          >
            {error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-gray-100">
        {/* Now Serving */}
        <div className="lg:col-span-3 py-6 lg:pr-8">
          {currentTicket ? (
            <div
              className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500"
              key={currentTicket._id}
            >
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
                      {currentTicket.student?.schoolId}
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
                      {currentTicket.student?.year}
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
                      {currentTicket.student?.section}
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
                </div>
              </div>
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

          {/* Controls */}
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
                disabled={isProcessing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${isPaused ? "bg-amber-50 text-amber-600 border border-amber-200" : "text-gray-500 hover:bg-gray-50 border border-transparent"}`}
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
              <button
                onClick={handleComplete}
                disabled={isProcessing || !currentTicket}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5A8C] text-white text-xs font-semibold rounded-full hover:bg-[#154874] disabled:opacity-30 transition-all shadow-sm shadow-[#1B5A8C]/20"
                style={FONT}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Complete
              </button>
              <button
                onClick={handleSkip}
                disabled={isProcessing || !currentTicket}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full disabled:opacity-30 transition-all"
                style={FONT}
              >
                <FastForward className="w-3.5 h-3.5" />
                Skip
              </button>
              <button
                onClick={handleServeFirstInQueue}
                disabled={
                  isProcessing ||
                  isPaused ||
                  (waitingTickets.length === 0 && !currentTicket)
                }
                className="flex items-center gap-1.5 px-4 py-2 border border-[#1B5A8C]/30 text-xs font-semibold text-[#1B5A8C] rounded-full hover:bg-[#1B5A8C]/5 disabled:opacity-30 transition-all"
                style={FONT}
              >
                Next
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-4 text-[10px] text-gray-400" style={FONT}>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Complete
              </span>
              <span className="flex items-center gap-1">
                <FastForward className="w-3 h-3" /> Skip
              </span>
              <span className="flex items-center gap-1">
                <SkipForward className="w-3 h-3" /> Next
              </span>
            </div>
          </div>
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
                  className={`group py-3 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-all ${animatingTicket === ticket._id ? "animate-in slide-in-from-right-4 fade-in duration-500 bg-[#1B5A8C]/5" : ""}`}
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
                          {ticket.student?.schoolId} · {ticket.student?.year} ·
                          Sec {ticket.student?.section}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleServeNext(ticket.ticketNumber)}
                      disabled={isProcessing || !!currentTicket || isPaused}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-[#1B5A8C] text-white text-xs font-semibold rounded-full hover:bg-[#154874] transition-all disabled:opacity-0 flex-shrink-0 shadow-sm shadow-[#1B5A8C]/20"
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
