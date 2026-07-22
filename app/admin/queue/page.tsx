// app/admin/queue/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Users,
  Play,
  CheckCircle,
  XCircle,
  RefreshCw,
  ListOrdered,
  CalendarClock,
  Filter,
  Download,
  Eye,
  AlertCircle,
  Mail,
  Phone,
  GraduationCap,
  Loader2,
  Shield,
  Building2,
  Banknote,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import {
  getPendingTickets,
  getTodayTickets,
  getAllTickets,
  serveNextTicket,
  completeTicket,
  cancelTicket,
  getQueueStats,
  updateTicketStatus,
} from "@/actions/ticket";
import { getDepartmentStaffCounters } from "@/actions/ticketNumberDistribution";

// ============================================
// Custom hook for real-time updates via SSE
// ============================================
function useRealtimeUpdates() {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/queue/stream");
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "connected") {
            setIsConnected(true);
            return;
          }

          if (data.type === "heartbeat") {
            return;
          }

          // Trigger re-fetch on any ticket or counter change
          if (data.type === "ticket" || data.type === "counter") {
            setUpdateTrigger((prev) => prev + 1);
          }
        } catch (error) {
          console.error("SSE parse error:", error);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        // Reconnect after 2 seconds
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return { updateTrigger, isConnected };
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function QueueManagementPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { updateTrigger, isConnected } = useRealtimeUpdates();

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { success, session } = await getSession();
        if (!success || !session) {
          router.push("/?error=unauthorized");
          return;
        }
        if (session.user?.role !== "1") {
          router.push("/?error=forbidden");
          return;
        }
        setAuthorized(true);
      } catch (error) {
        router.push("/?error=unauthorized");
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div
      className="p-6 space-y-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Queue Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage registrar & cashier ticket queues in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-md ${
              isConnected
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${
                isConnected ? "text-green-700" : "text-red-700"
              }`}
            >
              {isConnected ? "Live" : "Reconnecting..."}
            </span>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <QueueStatsSection updateTrigger={updateTrigger} />

      {/* Main Queue Content */}
      <QueueTabs updateTrigger={updateTrigger} />

      {/* Department Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Registrar Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentQueueStatus
              department="registrar"
              updateTrigger={updateTrigger}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-500" />
              Cashier Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentQueueStatus
              department="cashier"
              updateTrigger={updateTrigger}
            />
          </CardContent>
        </Card>
      </div>

      {/* Queue Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            Queue Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QueueAlertsList updateTrigger={updateTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Queue Stats Section
// ============================================
function QueueStatsSection({ updateTrigger }: { updateTrigger: number }) {
  const [stats, setStats] = useState({
    activeQueues: 0,
    pendingTickets: 0,
    servingTickets: 0,
    completedToday: 0,
    totalToday: 0,
  });
  const previousStats = useRef(stats);
  const [loading, setLoading] = useState(true);
  const [flashKey, setFlashKey] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const result = await getQueueStats();
      if (result.success && result.stats) {
        setStats((prev) => {
          previousStats.current = prev;
          return result.stats;
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, updateTrigger]);

  const getChangeIndicator = (current: number, previous: number) => {
    if (current === previous || loading) return null;
    const diff = current - previous;
    if (diff > 0) {
      return (
        <span className="text-green-500 text-xs ml-1 animate-in fade-in">
          +{diff}
        </span>
      );
    }
    return (
      <span className="text-red-500 text-xs ml-1 animate-in fade-in">
        {diff}
      </span>
    );
  };

  const statCards = [
    {
      key: "activeQueues",
      title: "Active Queues",
      value: stats.activeQueues,
      icon: AlertCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      key: "pendingTickets",
      title: "Pending",
      value: stats.pendingTickets,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      key: "servingTickets",
      title: "Serving",
      value: stats.servingTickets,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      key: "completedToday",
      title: "Completed Today",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const prevValue =
          previousStats.current[stat.key as keyof typeof previousStats.current];

        return (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold flex items-center">
                    {loading && stat.value === 0 ? (
                      <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
                    ) : (
                      <>
                        {stat.value}
                        {getChangeIndicator(stat.value, prevValue)}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// Department Queue Status
// ============================================
function DepartmentQueueStatus({
  department,
  updateTrigger,
}: {
  department: string;
  updateTrigger: number;
}) {
  const [staffCounters, setStaffCounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashId, setFlashId] = useState("");

  const fetchCounters = useCallback(async () => {
    try {
      const result = await getDepartmentStaffCounters(department);
      if (result.success && result.counters) {
        setStaffCounters((prev) => {
          // Flash effect for changed values
          if (prev.length > 0 && result.counters.length > 0) {
            for (let i = 0; i < result.counters.length; i++) {
              if (
                prev[i] &&
                prev[i].currentNumber !== result.counters[i].currentNumber
              ) {
                setFlashId(result.counters[i].staffId);
                setTimeout(() => setFlashId(""), 1000);
              }
            }
          }
          return result.counters;
        });
      }
    } catch (error) {
      console.error(`Error fetching ${department} counters:`, error);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters, updateTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (staffCounters.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          No active {department} staff
        </p>
      </div>
    );
  }

  const departmentColor =
    department === "registrar"
      ? "bg-blue-100 text-blue-600"
      : "bg-green-100 text-green-600";

  return (
    <div className="space-y-3">
      {staffCounters.map((staff: any) => (
        <div
          key={staff.staffId}
          className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 ${
            flashId === staff.staffId ? "bg-yellow-50 scale-[1.02]" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full ${departmentColor} flex items-center justify-center`}
            >
              {department === "registrar" ? (
                <Building2 className="w-4 h-4" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{staff.staffName}</p>
              <p className="text-xs text-muted-foreground">
                {staff.ticketsServed} tickets served today
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current #</p>
            <p
              className={`text-lg font-bold transition-all duration-300 ${
                flashId === staff.staffId ? "text-blue-600 scale-110" : ""
              }`}
            >
              {staff.currentNumber}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Queue Alerts List
// ============================================
function QueueAlertsList({ updateTrigger }: { updateTrigger: number }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const [statsResult, registrarResult, cashierResult] = await Promise.all([
        getQueueStats(),
        getDepartmentStaffCounters("registrar"),
        getDepartmentStaffCounters("cashier"),
      ]);

      const newAlerts: any[] = [];
      const stats = statsResult.success ? statsResult.stats : null;

      if (stats && stats.pendingTickets > 15) {
        newAlerts.push({
          title: "High Volume Alert",
          message: `${stats.pendingTickets} pending tickets waiting in queue`,
          color: "bg-orange-50 border-orange-200 text-orange-700",
        });
      }

      if (registrarResult.success && registrarResult.counters) {
        const totalRegistrar = registrarResult.counters.reduce(
          (sum: number, s: any) => sum + s.currentNumber,
          0,
        );
        if (totalRegistrar > 20) {
          newAlerts.push({
            title: "Registrar Queue Busy",
            message: `Registrar has ${totalRegistrar} total tickets today`,
            color: "bg-orange-50 border-orange-200 text-orange-700",
          });
        }
        if (registrarResult.counters.length === 0) {
          newAlerts.push({
            title: "No Registrar Staff",
            message: "No active registrar staff members available",
            color: "bg-red-50 border-red-200 text-red-700",
          });
        }
      }

      if (cashierResult.success && cashierResult.counters) {
        const totalCashier = cashierResult.counters.reduce(
          (sum: number, s: any) => sum + s.currentNumber,
          0,
        );
        if (totalCashier > 20) {
          newAlerts.push({
            title: "Cashier Queue Busy",
            message: `Cashier has ${totalCashier} total tickets today`,
            color: "bg-orange-50 border-orange-200 text-orange-700",
          });
        }
        if (cashierResult.counters.length === 0) {
          newAlerts.push({
            title: "No Cashier Staff",
            message: "No active cashier staff members available",
            color: "bg-red-50 border-red-200 text-red-700",
          });
        }
      }

      if (stats && stats.completedToday > 50) {
        newAlerts.push({
          title: "Great Performance",
          message: `${stats.completedToday} tickets completed today!`,
          color: "bg-green-50 border-green-200 text-green-700",
        });
      }

      if (newAlerts.length === 0) {
        newAlerts.push({
          title: "All Clear",
          message: "Both registrar and cashier queues are running smoothly",
          color: "bg-blue-50 border-blue-200 text-blue-700",
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, updateTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-3 border rounded-lg transition-all duration-300 ${alert.color}`}
        >
          <p className="text-sm font-medium">{alert.title}</p>
          <p className="text-xs mt-1 opacity-80">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Queue Tabs Section
// ============================================
function QueueTabs({ updateTrigger }: { updateTrigger: number }) {
  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pending" className="gap-2">
          <Clock className="w-4 h-4" />
          Pending
        </TabsTrigger>
        <TabsTrigger value="serving" className="gap-2">
          <Play className="w-4 h-4" />
          Serving
        </TabsTrigger>
        <TabsTrigger value="completed" className="gap-2">
          <CheckCircle className="w-4 h-4" />
          Completed
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="gap-2">
          <XCircle className="w-4 h-4" />
          Cancelled
        </TabsTrigger>
        <TabsTrigger value="all" className="gap-2">
          <ListOrdered className="w-4 h-4" />
          All Tickets
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Pending Tickets
              </CardTitle>
              <div className="flex items-center gap-2">
                <ServeNextButton />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <QueueTableContent status="pending" updateTrigger={updateTrigger} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="serving">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-500" />
                Currently Serving
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <QueueTableContent status="serving" updateTrigger={updateTrigger} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="completed">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Completed Tickets
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Today
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <QueueTableContent
              status="completed"
              updateTrigger={updateTrigger}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cancelled">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Cancelled Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueueTableContent
              status="cancelled"
              updateTrigger={updateTrigger}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="all">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListOrdered className="w-5 h-5" />
                All Tickets
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button variant="outline" size="sm">
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Date Range
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <QueueTableContent status="all" updateTrigger={updateTrigger} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ============================================
// Serve Next Button
// ============================================
function ServeNextButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleServeNext = async () => {
    try {
      setLoading(true);
      const result = await serveNextTicket();
      if (result.success) {
        setOpen(false);
        // Real-time updates will refresh automatically
      } else {
        alert(result.error || "Failed to serve ticket");
      }
    } catch (error) {
      alert("Failed to serve ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#1B5A8C] hover:bg-[#0B3B5F]">
          <Play className="w-4 h-4 mr-2" />
          Serve Next
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Serve Next Ticket</DialogTitle>
          <DialogDescription>
            Are you sure you want to serve the next ticket in the queue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#1B5A8C] hover:bg-[#0B3B5F]"
            onClick={handleServeNext}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Serving...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Confirm Serve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Queue Table Content
// ============================================
function QueueTableContent({
  status,
  updateTrigger,
}: {
  status: "pending" | "serving" | "completed" | "cancelled" | "all";
  updateTrigger: number;
}) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newRowId, setNewRowId] = useState("");

  const fetchTickets = useCallback(async () => {
    try {
      let result;
      if (status === "pending") {
        result = await getPendingTickets();
      } else if (status === "all") {
        result = await getTodayTickets();
      } else {
        result = await getAllTickets({ status });
      }

      if (result.success && result.tickets) {
        setTickets((prev) => {
          // Highlight new tickets
          if (prev.length > 0 && result.tickets.length > prev.length) {
            const newTicket = result.tickets.find(
              (t: any) => !prev.find((p: any) => p._id === t._id),
            );
            if (newTicket) {
              setNewRowId(newTicket._id);
              setTimeout(() => setNewRowId(""), 2000);
            }
          }
          return result.tickets;
        });
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, updateTrigger]);

  const handleComplete = async (ticketNumber: string) => {
    try {
      setActionLoading(true);
      const result = await completeTicket(ticketNumber);
      if (result.success) {
        fetchTickets();
      } else {
        alert(result.error || "Failed to complete ticket");
      }
    } catch (error) {
      alert("Failed to complete ticket");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (ticketNumber: string) => {
    if (!confirm("Are you sure you want to cancel this ticket?")) return;
    try {
      setActionLoading(true);
      const result = await cancelTicket(ticketNumber);
      if (result.success) {
        fetchTickets();
      } else {
        alert(result.error || "Failed to cancel ticket");
      }
    } catch (error) {
      alert("Failed to cancel ticket");
    } finally {
      setActionLoading(false);
    }
  };

  const handleServeSpecific = async (ticketNumber: string) => {
    try {
      setActionLoading(true);
      const result = await updateTicketStatus(ticketNumber, "serving");
      if (result.success) {
        fetchTickets();
      } else {
        alert(result.error || "Failed to serve ticket");
      }
    } catch (error) {
      alert("Failed to serve ticket");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (ticketStatus: string) => {
    const badges: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
      serving: { className: "bg-blue-100 text-blue-700", label: "Serving" },
      completed: {
        className: "bg-green-100 text-green-700",
        label: "Completed",
      },
      cancelled: { className: "bg-red-100 text-red-700", label: "Cancelled" },
    };
    const badge = badges[ticketStatus] || badges.pending;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getDepartmentBadge = (department: string) => {
    if (department === "registrar") {
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Building2 className="w-3 h-3 mr-1" />
          Registrar
        </Badge>
      );
    }
    if (department === "cashier") {
      return (
        <Badge className="bg-green-100 text-green-700">
          <Banknote className="w-3 h-3 mr-1" />
          Cashier
        </Badge>
      );
    }
    return <Badge className="bg-gray-100 text-gray-700">{department}</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading tickets...</span>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-muted-foreground">No tickets found</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === "pending"
            ? "No pending tickets in queue"
            : status === "serving"
              ? "No tickets currently being served"
              : `No ${status} tickets`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ticket #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket: any) => (
              <TableRow
                key={ticket._id}
                className={`transition-all duration-500 ${
                  newRowId === ticket._id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <TableCell className="font-medium">
                  {ticket.ticketNumber}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">
                      {ticket.student?.firstName} {ticket.student?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.student?.schoolId}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{ticket.transactionType}</span>
                </TableCell>
                <TableCell>{getDepartmentBadge(ticket.department)}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(ticket.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setDetailOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {ticket.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleServeSpecific(ticket.ticketNumber)}
                        disabled={actionLoading}
                        className="text-blue-600 hover:text-blue-700"
                        title="Serve Ticket"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    {ticket.status === "serving" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComplete(ticket.ticketNumber)}
                        disabled={actionLoading}
                        className="text-green-600 hover:text-green-700"
                        title="Complete Ticket"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {(ticket.status === "pending" ||
                      ticket.status === "serving") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(ticket.ticketNumber)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-700"
                        title="Cancel Ticket"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {tickets.length} tickets • Auto-updating via live stream
        </span>
        <Button variant="outline" size="sm" onClick={fetchTickets}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ticket Details - {selectedTicket?.ticketNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Ticket ID</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket.ticketId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div>
                  <p className="text-sm font-medium">Transaction Type</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket.transactionType}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Department</p>
                  {getDepartmentBadge(selectedTicket.department)}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {selectedTicket.student?.firstName}{" "}
                    {selectedTicket.student?.middleName}{" "}
                    {selectedTicket.student?.lastName}{" "}
                    {selectedTicket.student?.suffix}
                  </div>
                  <div>
                    <span className="text-muted-foreground">School ID:</span>{" "}
                    {selectedTicket.student?.schoolId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Year Level:</span>{" "}
                    {selectedTicket.student?.year}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Section:</span>{" "}
                    {selectedTicket.student?.section}
                  </div>
                </div>
              </div>

              {selectedTicket.requester && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Requester Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <Badge variant="outline" className="ml-1 capitalize">
                        {selectedTicket.requester.type}
                      </Badge>
                    </div>
                    {selectedTicket.requester.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Email:
                        </span>{" "}
                        {selectedTicket.requester.email}
                      </div>
                    )}
                    {selectedTicket.requester.contactNumber && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Contact:
                        </span>{" "}
                        {selectedTicket.requester.contactNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTicket.guardian && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Guardian Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      {selectedTicket.guardian.firstName}{" "}
                      {selectedTicket.guardian.middleName}{" "}
                      {selectedTicket.guardian.lastName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Relationship:
                      </span>{" "}
                      {selectedTicket.guardian.relationship}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span>Created: {formatDate(selectedTicket.createdAt)}</span>
                  </div>
                  {selectedTicket.servedAt && (
                    <div className="flex gap-2 items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Served: {formatDate(selectedTicket.servedAt)}</span>
                    </div>
                  )}
                  {selectedTicket.completedAt && (
                    <div className="flex gap-2 items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>
                        Completed: {formatDate(selectedTicket.completedAt)}
                      </span>
                    </div>
                  )}
                  {selectedTicket.cancelledAt && (
                    <div className="flex gap-2 items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>
                        Cancelled: {formatDate(selectedTicket.cancelledAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Assignment
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedTicket.assignedTo && (
                    <div>
                      <span className="text-muted-foreground">
                        Assigned To:
                      </span>{" "}
                      {selectedTicket.assignedTo}
                    </div>
                  )}
                  {selectedTicket.servedBy && (
                    <div>
                      <span className="text-muted-foreground">Served By:</span>{" "}
                      {selectedTicket.servedBy}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
