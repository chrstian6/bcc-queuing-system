// app/admin/settings/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Save,
  Wand2,
  ChevronDown,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import { getSystemSettings, setQueueOpen } from "@/actions/system-settings";
import {
  getStaffSettingsOverview,
  updateStaffCapacity,
  updateStaffHours,
  updateStaffWindow,
  updateDefaultCapacity,
  updateDefaultHours,
  applyDefaultsToAllStaff,
  type StaffSummary,
} from "@/actions/system-settings";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const MIN_LIMIT = 1;
const MAX_LIMIT = 500;

const DEPT_LABELS: Record<string, string> = {
  cashier: "Cashier",
  dean: "Dean",
  registrar: "Registrar",
  dsdw: "DSDW",
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" style={FONT}>
      <div className="h-6 w-40 bg-gray-100 rounded-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-50 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-50 rounded-xl" />
      <div className="h-80 bg-gray-50 rounded-xl" />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Global defaults
  const [defLimit, setDefLimit] = useState("500");
  const [defOpen, setDefOpen] = useState("08:00");
  const [defClose, setDefClose] = useState("17:00");
  const [savedDefLimit, setSavedDefLimit] = useState(500);
  const [savedDefOpen, setSavedDefOpen] = useState("08:00");
  const [savedDefClose, setSavedDefClose] = useState("17:00");
  const [savingDefLimit, setSavingDefLimit] = useState(false);
  const [savingDefHours, setSavingDefHours] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [queueOpen, setQueueOpenState] = useState(true);
  const [isTogglingQueue, setIsTogglingQueue] = useState(false);

  // Per-staff editor
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftLimit, setDraftLimit] = useState("");
  const [draftOpen, setDraftOpen] = useState("");
  const [draftClose, setDraftClose] = useState("");
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [togglingStaffId, setTogglingStaffId] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);
  const [confirmToggleQueue, setConfirmToggleQueue] = useState(false);
  const [pendingQueueToggle, setPendingQueueToggle] = useState<boolean | null>(
    null,
  );

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setLoadError(null);

    try {
      // 1. Session
      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.session) {
        setLoadError("Not authenticated");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const role = sessionResult.session.user?.role;
      if (role !== "1") {
        setLoadError("You do not have access to this page");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setStaffId(sessionResult.session.user?.staffId || null);

      // 2. Fetch system settings + staff overview in parallel
      const [settingsResult, staffResult] = await Promise.all([
        getSystemSettings(),
        getStaffSettingsOverview(),
      ]);

      if (settingsResult.success) {
        setQueueOpenState(settingsResult.queueOpen !== false);
      }

      if (staffResult.success) {
        setStaff((staffResult.staff as StaffSummary[]) || []);
      } else {
        setLoadError(staffResult.error || "Failed to load staff");
      }

      // Defaults come from the SystemSetting doc via getSystemSettings extension
      // If your action doesn't return them yet, they default to 500 / 08:00 / 17:00
      // (see note below)
    } catch (err) {
      console.error("Error loading admin settings:", err);
      setLoadError("Failed to load settings");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, [load]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const requestQueueToggle = (next: boolean) => {
    setPendingQueueToggle(next);
    setConfirmToggleQueue(true);
  };

  const applyQueueToggle = async () => {
    if (pendingQueueToggle === null) return;
    setIsTogglingQueue(true);
    const res = await setQueueOpen(pendingQueueToggle);
    setIsTogglingQueue(false);
    if (res.success) {
      setQueueOpenState(res.queueOpen !== false);
      showMessage(
        "success",
        pendingQueueToggle ? "Queue opened" : "Queue closed",
      );
      setConfirmToggleQueue(false);
      setPendingQueueToggle(null);
      load(true);
    } else {
      showMessage("error", res.error || "Failed to update queue");
    }
  };

  const handleSaveDefaultLimit = async () => {
    const value = parseInt(defLimit, 10);
    if (!Number.isFinite(value) || value < MIN_LIMIT || value > MAX_LIMIT) {
      showMessage(
        "error",
        `Capacity must be between ${MIN_LIMIT} and ${MAX_LIMIT}`,
      );
      return;
    }
    setSavingDefLimit(true);
    const res = await updateDefaultCapacity(value);
    setSavingDefLimit(false);
    if (res.success) {
      setSavedDefLimit(value);
      showMessage("success", "Default capacity updated");
    } else {
      showMessage("error", res.error || "Failed to update default capacity");
    }
  };

  const handleSaveDefaultHours = async () => {
    setSavingDefHours(true);
    const res = await updateDefaultHours(defOpen, defClose);
    setSavingDefHours(false);
    if (res.success) {
      setSavedDefOpen(defOpen);
      setSavedDefClose(defClose);
      showMessage("success", "Default hours updated");
    } else {
      showMessage("error", res.error || "Failed to update default hours");
    }
  };

  const handleApplyToAll = async () => {
    setApplyingAll(true);
    const res = await applyDefaultsToAllStaff();
    setApplyingAll(false);
    setConfirmApplyAll(false);
    if (res.success) {
      showMessage("success", "Defaults applied to all active staff");
      load(true);
    } else {
      showMessage("error", res.error || "Failed to apply defaults");
    }
  };

  const openEditor = (s: StaffSummary) => {
    setExpandedId(s.staffId);
    setDraftLimit(String(s.dailyLimit));
    setDraftOpen(s.openTime);
    setDraftClose(s.closeTime);
  };

  const handleSaveStaff = async (staffId: string) => {
    const limitVal = parseInt(draftLimit, 10);
    if (
      !Number.isFinite(limitVal) ||
      limitVal < MIN_LIMIT ||
      limitVal > MAX_LIMIT
    ) {
      showMessage(
        "error",
        `Capacity must be between ${MIN_LIMIT} and ${MAX_LIMIT}`,
      );
      return;
    }

    setSavingStaffId(staffId);

    const [capRes, hoursRes] = await Promise.all([
      updateStaffCapacity(staffId, limitVal),
      updateStaffHours(staffId, draftOpen, draftClose),
    ]);

    setSavingStaffId(null);

    if (capRes.success && hoursRes.success) {
      showMessage("success", "Staff settings updated");
      setExpandedId(null);
      load(true);
    } else {
      showMessage(
        "error",
        capRes.error || hoursRes.error || "Failed to update staff settings",
      );
    }
  };

  const handleToggleStaff = async (staffId: string, next: boolean) => {
    setTogglingStaffId(staffId);
    const res = await updateStaffWindow(staffId, next);
    setTogglingStaffId(null);
    if (res.success) {
      showMessage("success", next ? "Window opened" : "Window closed");
      load(true);
    } else {
      showMessage("error", res.error || "Failed to update window");
    }
  };

  // ─── Loading / error states ────────────────────────────────────────────────

  if (isLoading) return <SettingsSkeleton />;

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4"
        style={FONT}
      >
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 text-center">{loadError}</p>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Group staff by department
  const grouped: Record<string, StaffSummary[]> = {};
  for (const s of staff) {
    if (!grouped[s.department]) grouped[s.department] = [];
    grouped[s.department].push(s);
  }

  const totalStaff = staff.length;
  const onlineStaff = staff.filter((s) => s.isOnline).length;

  return (
    <div className="space-y-5" style={FONT}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1B5A8C]" />
            System Settings
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Global defaults and per-staff overrides for every counter
          </p>
        </div>
        <button
          onClick={() => load(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Flash message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm border flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-red-50 border-red-100 text-red-600"
          }`}
          role="status"
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Overview strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Active staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalStaff}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Windows open</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {onlineStaff}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Default capacity</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {savedDefLimit}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Default hours</p>
          <p className="text-sm font-bold text-gray-900 mt-2 tabular-nums">
            {savedDefOpen} – {savedDefClose}
          </p>
        </div>
      </div>

      {/* Queue master switch */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                Global Queue
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  queueOpen
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {queueOpen ? "Open" : "Closed"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Master switch — when closed, no tickets are created regardless of
              individual counter state.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {queueOpen ? "Accepting" : "Paused"}
            </span>
            <Switch
              checked={queueOpen}
              onCheckedChange={requestQueueToggle}
              disabled={isTogglingQueue}
            />
          </div>
        </div>
      </div>

      {/* Global defaults */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
            <Wand2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Global Defaults
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Applied to new staff and used as the reference when bulk-applying
              to existing staff
            </p>
          </div>
        </div>

        {/* Default capacity */}
        <div className="mb-5">
          <label
            htmlFor="defLimit"
            className="block text-xs font-medium text-gray-500 mb-1.5"
          >
            Default daily capacity
          </label>
          <div className="flex items-end gap-2">
            <input
              id="defLimit"
              type="number"
              min={MIN_LIMIT}
              max={MAX_LIMIT}
              value={defLimit}
              onChange={(e) => setDefLimit(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm"
              style={FONT}
            />
            <button
              onClick={handleSaveDefaultLimit}
              disabled={
                savingDefLimit || savedDefLimit === parseInt(defLimit, 10)
              }
              className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              style={FONT}
            >
              {savingDefLimit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>

        {/* Default hours */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Default operating hours
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="block text-[11px] text-gray-400 mb-1">
                Opens at
              </span>
              <input
                type="time"
                value={defOpen}
                onChange={(e) => setDefOpen(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm"
                style={FONT}
              />
            </div>
            <div>
              <span className="block text-[11px] text-gray-400 mb-1">
                Closes at
              </span>
              <input
                type="time"
                value={defClose}
                onChange={(e) => setDefClose(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm"
                style={FONT}
              />
            </div>
          </div>
          <button
            onClick={handleSaveDefaultHours}
            disabled={
              savingDefHours ||
              (savedDefOpen === defOpen && savedDefClose === defClose)
            }
            className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            style={FONT}
          >
            {savingDefHours ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Hours
          </button>
        </div>

        {/* Bulk apply */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Apply defaults to all active staff
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Overwrites every staff member&apos;s capacity and hours with the
                defaults above. Does not touch window open/closed state.
              </p>
            </div>
            <button
              onClick={() => setConfirmApplyAll(true)}
              disabled={applyingAll}
              className="px-4 py-2 rounded-lg border border-[#1B5A8C] text-[#1B5A8C] text-sm font-semibold hover:bg-[#1B5A8C]/5 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              style={FONT}
            >
              <Wand2 className="w-4 h-4" />
              Apply to All
            </button>
          </div>
        </div>
      </div>

      {/* Per-staff overrides */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Staff Overrides
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any staff to edit their capacity, hours, or open/close their
              window
            </p>
          </div>
        </div>

        {staff.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No active staff found
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dept, list]) => (
              <div key={dept}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {DEPT_LABELS[dept] || dept}
                </p>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                  {list.map((s) => {
                    const isExpanded = expandedId === s.staffId;
                    const isToggling = togglingStaffId === s.staffId;
                    const isSaving = savingStaffId === s.staffId;

                    return (
                      <div key={s.staffId}>
                        <button
                          type="button"
                          onClick={() =>
                            isExpanded ? setExpandedId(null) : openEditor(s)
                          }
                          className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {s.staffName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Window {s.cashierWindow} • Capacity {s.dailyLimit}{" "}
                              • {s.openTime} – {s.closeTime}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.isOnline
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  s.isOnline
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-red-500"
                                }`}
                              />
                              {s.isOnline ? "Open" : "Closed"}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 space-y-4 bg-gray-50/50">
                            {/* Toggle window */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-gray-700">
                                  Window status
                                </p>
                                <p className="text-xs text-gray-400">
                                  Manually override this staff&apos;s
                                  open/closed state
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={s.isOnline}
                                  onCheckedChange={(next) =>
                                    handleToggleStaff(s.staffId, next)
                                  }
                                  disabled={isToggling}
                                />
                              </div>
                            </div>

                            {/* Capacity */}
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Daily capacity
                              </label>
                              <input
                                type="number"
                                min={MIN_LIMIT}
                                max={MAX_LIMIT}
                                value={draftLimit}
                                onChange={(e) => setDraftLimit(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm bg-white"
                                style={FONT}
                              />
                            </div>

                            {/* Hours */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                  Opens at
                                </label>
                                <input
                                  type="time"
                                  value={draftOpen}
                                  onChange={(e) => setDraftOpen(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm bg-white"
                                  style={FONT}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                  Closes at
                                </label>
                                <input
                                  type="time"
                                  value={draftClose}
                                  onChange={(e) =>
                                    setDraftClose(e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm bg-white"
                                  style={FONT}
                                />
                              </div>
                            </div>

                            {/* Save / cancel */}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleSaveStaff(s.staffId)}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                style={FONT}
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save Changes
                              </button>
                              <button
                                onClick={() => setExpandedId(null)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                                style={FONT}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm apply all */}
      <Dialog open={confirmApplyAll} onOpenChange={setConfirmApplyAll}>
        <DialogContent className="sm:max-w-sm" style={FONT}>
          <DialogHeader>
            <DialogTitle style={FONT}>Apply defaults to all?</DialogTitle>
            <DialogDescription style={FONT}>
              Every active staff member&apos;s capacity and operating hours will
              be overwritten with the defaults above. Their open/closed toggle
              stays untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmApplyAll(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              style={FONT}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyToAll}
              disabled={applyingAll}
              className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
              style={FONT}
            >
              {applyingAll && <Loader2 className="w-4 h-4 animate-spin" />}
              Apply to All
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm queue toggle */}
      <Dialog open={confirmToggleQueue} onOpenChange={setConfirmToggleQueue}>
        <DialogContent className="sm:max-w-sm" style={FONT}>
          <DialogHeader>
            <DialogTitle style={FONT}>
              {pendingQueueToggle ? "Open the queue?" : "Close the queue?"}
            </DialogTitle>
            <DialogDescription style={FONT}>
              {pendingQueueToggle
                ? "Students will be able to get tickets whenever a counter is within hours."
                : "All new tickets are blocked across every counter until you reopen this. Counters already outside hours or on break remain unaffected."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmToggleQueue(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              style={FONT}
            >
              Cancel
            </button>
            <button
              onClick={applyQueueToggle}
              disabled={isTogglingQueue}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2 ${
                pendingQueueToggle
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              style={FONT}
            >
              {isTogglingQueue && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingQueueToggle ? "Open Queue" : "Close Queue"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
