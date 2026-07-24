// lib/counterSettings.ts
// Shared counter-availability logic. Distribution, the public status action,
// the SSE stream, and the admin monitor must all agree on what "open" means —
// they all go through evaluateCounterState().

import type { ICounterSettings } from "@/models/Staff";
import { getAppNowMinutes, hhmmToMinutes } from "./time";

export const DEFAULT_COUNTER_SETTINGS: ICounterSettings = {
  isOpen: true,
  openTime: "08:00",
  closeTime: "17:00",
  breaks: [],
  dailyLimit: 500,
};

/**
 * Normalize a (possibly missing/partial) counterSettings subdoc. Older Staff
 * docs predate the field, and .lean() reads skip schema defaults.
 */
export function getEffectiveCounterSettings(
  staff: { counterSettings?: Partial<ICounterSettings> | null } | null,
): ICounterSettings {
  const raw = staff?.counterSettings;
  if (!raw) return { ...DEFAULT_COUNTER_SETTINGS, breaks: [] };
  return {
    isOpen: raw.isOpen !== false,
    openTime: raw.openTime || DEFAULT_COUNTER_SETTINGS.openTime,
    closeTime: raw.closeTime || DEFAULT_COUNTER_SETTINGS.closeTime,
    breaks: Array.isArray(raw.breaks)
      ? raw.breaks.map((b) => ({
          start: b.start,
          end: b.end,
          label: b.label || "",
        }))
      : [],
    dailyLimit: raw.dailyLimit || DEFAULT_COUNTER_SETTINGS.dailyLimit,
  };
}

export type CounterState =
  | "open"
  | "closed" // manually closed by the cashier
  | "outside-hours"
  | "break"
  | "full"; // daily limit reached

export interface CounterEvaluation {
  state: CounterState;
  settings: ICounterSettings;
  /** true when the counter can accept a new ticket right now */
  accepting: boolean;
  /** label of the active break, when state === "break" */
  activeBreakLabel?: string;
}

/**
 * Evaluate one counter. `load` is the number of tickets already assigned
 * today (the per-staff Counter seq). Precedence: manual close > hours >
 * break > capacity.
 */
export function evaluateCounterState(
  staff: { counterSettings?: Partial<ICounterSettings> | null } | null,
  load: number,
  nowMinutes: number = getAppNowMinutes(),
): CounterEvaluation {
  const settings = getEffectiveCounterSettings(staff);

  if (!settings.isOpen) {
    return { state: "closed", settings, accepting: false };
  }

  const open = hhmmToMinutes(settings.openTime);
  const close = hhmmToMinutes(settings.closeTime);
  if (nowMinutes < open || nowMinutes >= close) {
    return { state: "outside-hours", settings, accepting: false };
  }

  const activeBreak = settings.breaks.find(
    (b) =>
      nowMinutes >= hhmmToMinutes(b.start) && nowMinutes < hhmmToMinutes(b.end),
  );
  if (activeBreak) {
    return {
      state: "break",
      settings,
      accepting: false,
      activeBreakLabel: activeBreak.label || "Break",
    };
  }

  if (load >= settings.dailyLimit) {
    return { state: "full", settings, accepting: false };
  }

  return { state: "open", settings, accepting: true };
}

export type QueueAvailabilityStatus =
  | "open"
  | "closed" // globally closed by admin, or no counters accepting
  | "outside-hours"
  | "full";

/**
 * Roll individual counter states up into one department-level status.
 * Reason priority when nothing is accepting: outside-hours (all) >
 * full (some at capacity, rest unavailable) > closed.
 */
export function summarizeAvailability(
  queueOpen: boolean,
  counterStates: CounterState[],
): { status: QueueAvailabilityStatus; openCounters: number; message: string } {
  if (!queueOpen) {
    return {
      status: "closed",
      openCounters: 0,
      message: "The queue is currently closed by the administrator.",
    };
  }

  const openCount = counterStates.filter((s) => s === "open").length;
  if (openCount > 0) {
    return {
      status: "open",
      openCounters: openCount,
      message: `Queue open — ${openCount} counter${openCount === 1 ? "" : "s"} serving`,
    };
  }

  if (counterStates.length === 0) {
    return {
      status: "closed",
      openCounters: 0,
      message: "No cashier counters are available right now.",
    };
  }

  if (counterStates.every((s) => s === "outside-hours")) {
    return {
      status: "outside-hours",
      openCounters: 0,
      message: "Cashier counters are outside operating hours.",
    };
  }

  if (counterStates.some((s) => s === "full")) {
    return {
      status: "full",
      openCounters: 0,
      message: "Today's queue has reached capacity. Please come back tomorrow.",
    };
  }

  return {
    status: "closed",
    openCounters: 0,
    message: "All cashier counters are temporarily closed or on break.",
  };
}
