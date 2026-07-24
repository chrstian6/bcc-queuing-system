// components/staff/CounterSettingsForm.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCounterSettings,
  updateCounterSettings,
  toggleCounterOpen,
} from "@/actions/counter-settings";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface BreakRow {
  start: string;
  end: string;
  label: string;
}

const STATE_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Accepting tickets", className: "bg-green-100 text-green-700" },
  closed: { label: "Closed", className: "bg-red-100 text-red-700" },
  "outside-hours": {
    label: "Outside hours",
    className: "bg-amber-100 text-amber-700",
  },
  break: { label: "On break", className: "bg-amber-100 text-amber-700" },
  full: { label: "Daily limit reached", className: "bg-red-100 text-red-700" },
};

export function CounterSettingsForm({ staffId }: { staffId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [breaks, setBreaks] = useState<BreakRow[]>([]);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [load, setLoad] = useState(0);
  const [state, setState] = useState<string>("open");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    const result = await getCounterSettings(staffId);
    if (result.success && result.settings) {
      setIsOpen(result.settings.isOpen);
      setOpenTime(result.settings.openTime);
      setCloseTime(result.settings.closeTime);
      setBreaks(
        result.settings.breaks.map((b) => ({
          start: b.start,
          end: b.end,
          label: b.label || "",
        })),
      );
      setDailyLimit(result.settings.dailyLimit);
      setLoad(result.load || 0);
      setState(result.state || "open");
    } else if (result.error) {
      showMessage("error", result.error);
    }
    setIsLoading(false);
  }, [staffId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (next: boolean) => {
    setIsOpen(next);
    const result = await toggleCounterOpen(staffId, next);
    if (result.success) {
      showMessage(
        "success",
        next ? "Counter opened — you can receive tickets" : "Counter closed",
      );
      loadData();
    } else {
      setIsOpen(!next);
      showMessage("error", result.error || "Failed to update counter");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateCounterSettings(staffId, {
      isOpen,
      openTime,
      closeTime,
      breaks,
      dailyLimit,
    });
    setIsSaving(false);
    if (result.success) {
      showMessage("success", "Counter settings saved");
      loadData();
    } else {
      showMessage("error", result.error || "Failed to save settings");
    }
  };

  const updateBreak = (index: number, field: keyof BreakRow, value: string) => {
    setBreaks((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-12 font-['Plus_Jakarta_Sans']">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading counter settings...
      </div>
    );
  }

  const stateBadge = STATE_LABELS[state] || STATE_LABELS.open;
  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#1B5A8C] outline-none transition-colors text-sm bg-white";

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans']">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.type === "success"
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-red-50 border-red-100 text-red-600"
          }`}
          role="status"
        >
          {message.text}
        </div>
      )}

      {/* Status + open/close toggle */}
      <div className="rounded-xl bg-white border border-gray-200 p-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              Counter Status
            </h2>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${stateBadge.className}`}
            >
              {stateBadge.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {load} of {dailyLimit} tickets assigned today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {isOpen ? "Open" : "Closed"}
          </span>
          <Switch checked={isOpen} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* Daily hours */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Daily Hours
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Tickets are only assigned to your counter within these hours
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Opens at
            </label>
            <input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Closes at
            </label>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Breaks */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Break Times</h2>
          <button
            type="button"
            onClick={() =>
              setBreaks((rows) =>
                rows.length < 5
                  ? [...rows, { start: "12:00", end: "13:00", label: "" }]
                  : rows,
              )
            }
            disabled={breaks.length >= 5}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B5A8C] hover:text-[#154874] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add break
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          No tickets are assigned to you during a break (max 5)
        </p>
        {breaks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No breaks set</p>
        ) : (
          <div className="space-y-3">
            {breaks.map((brk, index) => (
              <div key={index} className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    From
                  </label>
                  <input
                    type="time"
                    value={brk.start}
                    onChange={(e) => updateBreak(index, "start", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    To
                  </label>
                  <input
                    type="time"
                    value={brk.end}
                    onChange={(e) => updateBreak(index, "end", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={brk.label}
                    onChange={(e) => updateBreak(index, "label", e.target.value)}
                    placeholder="Lunch break"
                    maxLength={50}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBreaks((rows) => rows.filter((_, i) => i !== index))
                  }
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Remove break"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily limit */}
      <div className="rounded-xl bg-white border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Daily Ticket Limit
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Maximum tickets your counter accepts per day (default 500)
        </p>
        <input
          type="number"
          min={1}
          max={2000}
          value={dailyLimit}
          onChange={(e) => setDailyLimit(Number(e.target.value))}
          className={`${inputClass} max-w-[160px]`}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
