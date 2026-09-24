// components/staff/StaffSettingsView.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Save,
  Coffee,
} from "lucide-react";
import { getSession } from "@/actions/auth";
import {
  getMyWindowSettings,
  setMyWindowOpen,
  updateMyDailyLimit,
  updateMyOperatingHours,
  type StaffWindowSettings,
} from "@/actions/staff-settings";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatHHMM } from "@/lib/time";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const POLL_MS = 10000;

// ─── Capacity bounds ─────────────────────────────────────────────────────────

const DEFAULT_DAILY_LIMIT = 500;
const MIN_DAILY_LIMIT = 1;
const MAX_DAILY_LIMIT = 500;

// ─── State styling (mirrors admin QueueMonitor) ──────────────────────────────

const STATE_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-green-100 text-green-700" },
  closed: { label: "Closed", className: "bg-red-100 text-red-700" },
  "outside-hours": {
    label: "Outside Hours",
    className: "bg-amber-100 text-amber-700",
  },
  break: { label: "On Break", className: "bg-amber-100 text-amber-700" },
  full: { label: "Full", className: "bg-red-100 text-red-700" },
};

// ─── Effective state types ───────────────────────────────────────────────────

type EffectiveState = "open" | "closed" | "outside-hours" | "break" | "full";

interface StaffSettingsViewProps {
  department: string;
}

export function StaffSettingsView({ department }: StaffSettingsViewProps) {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StaffWindowSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state — start with the default 500
  const [dailyLimit, setDailyLimit] = useState(String(DEFAULT_DAILY_LIMIT));
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadSettings = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setLoadError(null);

      try {
        const sessionResult = await getSession();
        if (!sessionResult.success || !sessionResult.session) {
          router.push("/?error=unauthorized");
          return;
        }

        const userStaffId = sessionResult.session.user?.staffId;
        const userStaffRole =
          sessionResult.session.user?.staffRole || department;

        if (!userStaffId) {
          setLoadError("Staff ID not found");
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        if (userStaffRole !== department) {
          setLoadError("You do not have access to this page");
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        setStaffId(userStaffId);

        const result = await getMyWindowSettings(userStaffId);

        if (result.success && result.settings) {
          setSettings(result.settings);
          setDailyLimit(
            String(result.settings.dailyLimit ?? DEFAULT_DAILY_LIMIT),
          );
          setOpenTime(result.settings.openTime);
          setCloseTime(result.settings.closeTime);
        } else {
          setLoadError(result.error || "Failed to load settings");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setLoadError("Failed to load settings");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [router, department],
  );

  useEffect(() => {
    loadSettings();
    // Poll every 10s so the effective state stays live as hours pass
    const interval = setInterval(() => loadSettings(true), POLL_MS);
    return () => clearInterval(interval);
  }, [loadSettings]);

  const requestToggle = (next: boolean) => {
    setPendingToggle(next);
    setConfirmOpen(true);
  };

  const applyToggle = async () => {
    if (pendingToggle === null || !staffId) return;
    setIsTogglingOpen(true);

    const result = await setMyWindowOpen(staffId, pendingToggle);
    setIsTogglingOpen(false);

    if (result.success) {
      showMessage(
        "success",
        pendingToggle ? "Your window is now open" : "Your window is now closed",
      );
      setConfirmOpen(false);
      setPendingToggle(null);
      loadSettings(true);
    } else {
      showMessage("error", result.error || "Failed to update window");
    }
  };

  const handleSaveLimit = async () => {
    if (!staffId) return;
    const value = parseInt(dailyLimit, 10);

    if (
      !Number.isFinite(value) ||
      value < MIN_DAILY_LIMIT ||
      value > MAX_DAILY_LIMIT
    ) {
      showMessage(
        "error",
        `Capacity must be between ${MIN_DAILY_LIMIT} and ${MAX_DAILY_LIMIT}`,
      );
      return;
    }

    setIsSavingLimit(true);
    const result = await updateMyDailyLimit(staffId, value);
    setIsSavingLimit(false);

    if (result.success) {
      showMessage("success", "Daily capacity updated");
      loadSettings(true);
    } else {
      showMessage("error", result.error || "Failed to update capacity");
    }
  };

  const handleSaveHours = async () => {
    if (!staffId) return;

    setIsSavingHours(true);
    const result = await updateMyOperatingHours(staffId, openTime, closeTime);
    setIsSavingHours(false);

    if (result.success) {
      showMessage("success", "Operating hours updated");
      loadSettings(true);
    } else {
      showMessage("error", result.error || "Failed to update hours");
    }
  };

  // ─── Compute effective state (mirrors evaluateCounterState) ────────────────

  const computeEffectiveState = (): EffectiveState => {
    if (!settings) return "closed";

    // Manual toggle off
    if (!settings.isOnline) return "closed";

    // Time helpers
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const openMin = toMin(settings.openTime);
    const closeMin = toMin(settings.closeTime);

    // Outside hours
    if (nowMinutes < openMin || nowMinutes >= closeMin) {
      return "outside-hours";
    }

    // On break
    if (settings.breaks && settings.breaks.length > 0) {
      for (const br of settings.breaks) {
        if (nowMinutes >= toMin(br.start) && nowMinutes < toMin(br.end)) {
          return "break";
        }
      }
    }

    // Full
    if (settings.currentLoad >= settings.dailyLimit) {
      return "full";
    }

    return "open";
  };

  const effectiveState = settings ? computeEffectiveState() : "closed";
  const stateStyle = STATE_STYLES[effectiveState] || STATE_STYLES.closed;

  // Subtitle explaining the state
  const subtitle = (() => {
    if (!settings) return "";
    if (!settings.isOnline) {
      return "Your window is manually closed — toggle to accept tickets again.";
    }
    if (effectiveState === "outside-hours") {
      return `Outside operating hours (${formatHHMM(settings.openTime)} – ${formatHHMM(settings.closeTime)}). Auto-resumes during your hours.`;
    }
    if (effectiveState === "break") {
      return "You are currently on a scheduled break. Auto-resumes after break.";
    }
    if (effectiveState === "full") {
      return "You've reached your daily capacity. Auto-resumes tomorrow.";
    }
    return "Your window is accepting tickets.";
  })();

  // ─── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" style={FONT}>
        <div className="h-6 w-32 bg-gray-100 rounded-full" />
        <div className="h-32 bg-gray-50 rounded-xl" />
        <div className="h-32 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4"
        style={FONT}
      >
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 text-center">
          {loadError || "Failed to load settings"}
        </p>
        <button
          onClick={() => loadSettings()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const loadPct = Math.min(
    100,
    Math.round((settings.currentLoad / Math.max(settings.dailyLimit, 1)) * 100),
  );

  return (
    <div className="space-y-5" style={FONT}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1B5A8C]" />
            Window Settings
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your counter, capacity, and hours
          </p>
        </div>
        <button
          onClick={() => loadSettings(true)}
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

      {/* Window status + toggle (mirrors admin Global Queue card) */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900">
                {settings.staffName}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${stateStyle.className}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    effectiveState === "open"
                      ? "bg-green-500 animate-pulse"
                      : effectiveState === "closed"
                        ? "bg-red-500"
                        : effectiveState === "full"
                          ? "bg-red-500"
                          : "bg-amber-500"
                  }`}
                />
                {stateStyle.label}
              </span>
              {effectiveState === "outside-hours" && settings.isOnline && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="w-3 h-3" />
                  Auto-resumes during hours
                </span>
              )}
              {effectiveState === "break" && settings.isOnline && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <Coffee className="w-3 h-3" />
                  Auto-resumes after break
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {settings.department.charAt(0).toUpperCase() +
                settings.department.slice(1)}{" "}
              • Window {settings.cashierWindow}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-600">
              {settings.isOnline ? "Accepting" : "Paused"}
            </span>
            <Switch
              checked={settings.isOnline}
              onCheckedChange={requestToggle}
              disabled={isTogglingOpen}
            />
          </div>
        </div>
      </div>

      {/* Daily capacity */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Daily Capacity
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Maximum number of students you can serve today
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Today&apos;s progress</span>
            <span className="tabular-nums font-medium">
              {settings.currentLoad} / {settings.dailyLimit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                loadPct >= 100
                  ? "bg-red-500"
                  : loadPct >= 80
                    ? "bg-amber-500"
                    : "bg-[#1B5A8C]"
              }`}
              style={{ width: `${loadPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {loadPct >= 100
              ? "You've reached today's capacity"
              : `${settings.dailyLimit - settings.currentLoad} slot${
                  settings.dailyLimit - settings.currentLoad !== 1 ? "s" : ""
                } remaining`}
          </p>
        </div>

        {/* Edit capacity */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label
              htmlFor="dailyLimit"
              className="block text-xs font-medium text-gray-500 mb-1.5"
            >
              Set capacity
            </label>
            <input
              id="dailyLimit"
              type="number"
              min={MIN_DAILY_LIMIT}
              max={MAX_DAILY_LIMIT}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder={String(DEFAULT_DAILY_LIMIT)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm"
              style={FONT}
            />
          </div>
          <button
            onClick={handleSaveLimit}
            disabled={
              isSavingLimit || String(settings.dailyLimit) === dailyLimit
            }
            className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            style={FONT}
          >
            {isSavingLimit ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Operating hours */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Operating Hours
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              When your window accepts tickets — outside these hours, your
              window auto-closes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label
              htmlFor="openTime"
              className="block text-xs font-medium text-gray-500 mb-1.5"
            >
              Opens at
            </label>
            <input
              id="openTime"
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm"
              style={FONT}
            />
          </div>
          <div>
            <label
              htmlFor="closeTime"
              className="block text-xs font-medium text-gray-500 mb-1.5"
            >
              Closes at
            </label>
            <input
              id="closeTime"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#1B5A8C] outline-none transition-colors text-sm"
              style={FONT}
            />
          </div>
        </div>

        <button
          onClick={handleSaveHours}
          disabled={
            isSavingHours ||
            (settings.openTime === openTime && settings.closeTime === closeTime)
          }
          className="px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          style={FONT}
        >
          {isSavingHours ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Hours
        </button>
      </div>

      {/* Breaks (read-only) */}
      {settings.breaks && settings.breaks.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <Coffee className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Scheduled Breaks
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Set by admin — contact IT to modify
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {settings.breaks.map((br, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg"
              >
                <span className="text-gray-600">Break {i + 1}</span>
                <span className="text-gray-700 tabular-nums">
                  {formatHHMM(br.start)} – {formatHHMM(br.end)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm" style={FONT}>
          <DialogHeader>
            <DialogTitle style={FONT}>
              {pendingToggle ? "Open your window?" : "Close your window?"}
            </DialogTitle>
            <DialogDescription style={FONT}>
              {pendingToggle
                ? "Students will be able to get tickets for your window whenever you're within operating hours."
                : "No new tickets will be assigned to your window until you reopen it. Outside-hours and break auto-pauses are unaffected by this toggle."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              style={FONT}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyToggle}
              disabled={isTogglingOpen}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2 ${
                pendingToggle
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              style={FONT}
            >
              {isTogglingOpen && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingToggle ? "Open Window" : "Close Window"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
