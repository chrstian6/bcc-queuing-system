// lib/time.ts
// Single clock for all "today" / HH:mm business logic. The school operates in
// APP_TZ (Philippines); serverless hosts run UTC, so never use raw
// setHours(0,0,0,0) for day boundaries in new code. Also set TZ=Asia/Manila in
// the deployment env so legacy call sites stay correct.

export const APP_TZ = process.env.APP_TZ || "Asia/Manila";

/** Minutes since midnight in APP_TZ (0..1439). */
export function getAppNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:mm" → "h:mm AM/PM" for user-facing copy. */
export function formatHHMM(value: string): string {
  if (!isValidHHMM(value)) return value;
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export interface AppDayRange {
  /** UTC instant of midnight (start of day) in APP_TZ */
  start: Date;
  /** UTC instant of the next midnight in APP_TZ */
  end: Date;
  /** YYYYMMDD in APP_TZ — used in Counter._id keys */
  dateStr: string;
}

/**
 * Boundaries of the APP_TZ calendar day containing `now`, as real Date
 * instants usable in createdAt range queries.
 */
export function getAppDayRange(now: Date = new Date()): AppDayRange {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(now).split("-").map(Number);
  const dateStr = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;

  // Find the UTC instant of APP_TZ midnight: take the UTC-midnight guess and
  // correct it by the zone offset measured at that instant.
  const utcGuess = Date.UTC(year, month - 1, day);
  const offsetMs = zoneOffsetMs(new Date(utcGuess));
  const start = new Date(utcGuess - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, dateStr };
}

/** Offset of APP_TZ from UTC at the given instant, in ms (UTC+8 → +8h). */
function zoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - at.getTime();
}
