import { TZDate } from "@date-fns/tz";
import {
  format,
  startOfWeek,
  startOfMonth,
  addDays,
  addMonths,
  parseISO,
} from "date-fns";

// All "today" / week math is done in the user's timezone so day boundaries
// (midnight rollover, weekly pulse) line up with their wall clock, not UTC.

export function todayInTz(timezone: string): string {
  return format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
}

// ISO date (yyyy-MM-dd) for a given instant in the user's tz.
export function dateInTz(ms: number, timezone: string): string {
  return format(new TZDate(ms, timezone), "yyyy-MM-dd");
}

export function weekStartInTz(timezone: string): string {
  const now = new TZDate(new Date(), timezone);
  return format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

// Mon..Sun ISO date strings for the current week in the user's tz.
export function weekDatesInTz(timezone: string): string[] {
  const start = startOfWeek(new TZDate(new Date(), timezone), {
    weekStartsOn: 1,
  });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd"),
  );
}

// "Thursday, May 28". `nowMs` is passed in so Date is never read during render
// (mirrors formatTime24InTz).
export function formatHeaderDate(timezone: string, nowMs: number): string {
  return format(new TZDate(nowMs, timezone), "EEEE, MMMM d");
}

// Minutes since local midnight in the user's tz. `nowMs` is passed in so
// Date is never read during render (mirrors formatCountdown).
export function minutesIntoDayInTz(timezone: string, nowMs: number): number {
  const d = new TZDate(nowMs, timezone);
  return d.getHours() * 60 + d.getMinutes();
}

// Current wall-clock time as "HH:mm" (24-hour) in the user's tz.
export function formatTime24InTz(timezone: string, nowMs: number): string {
  return format(new TZDate(nowMs, timezone), "HH:mm");
}

// Percent of the waking window still remaining (0-100). Before wake -> 100,
// after sleep -> 0. A sleep time at/before wake is treated as the next day.
export function wakingPercentLeft(
  nowMin: number,
  wakeMin: number,
  sleepMin: number,
): number {
  const sleep = sleepMin <= wakeMin ? sleepMin + 1440 : sleepMin;
  const left = (sleep - nowMin) / (sleep - wakeMin);
  return Math.round(Math.min(1, Math.max(0, left)) * 100);
}

// True when the current minute-of-day falls outside the waking window,
// handling windows that wrap past midnight (sleepMin <= wakeMin).
export function isSleepTime(
  nowMin: number,
  wakeMin: number,
  sleepMin: number,
): boolean {
  const sleep = sleepMin <= wakeMin ? sleepMin + 1440 : sleepMin;
  const now = nowMin < wakeMin ? nowMin + 1440 : nowMin;
  return now >= sleep;
}

// seconds -> "47 min" (or "1h 12m" past an hour)
export function formatMinutes(seconds: number): string {
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} hr` : `${h}h ${m}m`;
}

// seconds -> "MM:SS" or "H:MM:SS" for the live timer display
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function hoursLabel(seconds: number): string {
  const hrs = seconds / 3600;
  return `${hrs.toFixed(1)} hrs`;
}

// Display label for a stored ISO date string, e.g. "Wed, May 28".
export function formatDayLabel(dateStr: string): string {
  return format(parseISO(dateStr), "EEE, MMM d");
}

// Long display label for an ISO date string, e.g. "Tuesday, June 2". Derived
// from the canonical `today` so the header and Notepad never disagree on which
// day it is (the live clock still ticks the time separately).
export function formatLongDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE, MMMM d");
}

// Shift an ISO date string by `delta` days (negative = earlier).
export function addDaysIso(dateStr: string, delta: number): string {
  return format(addDays(parseISO(dateStr), delta), "yyyy-MM-dd");
}

// Shift a week-start ISO date by `delta` weeks (negative = earlier).
export function addWeeks(weekStart: string, delta: number): string {
  return format(addDays(parseISO(weekStart), delta * 7), "yyyy-MM-dd");
}

// Seven ISO dates [Mon..Sun] for a given week-start.
export function weekDatesFromStart(weekStart: string): string[] {
  const start = parseISO(weekStart);
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd"),
  );
}

// Time-until label for a deadline, e.g. "3d 4h", "2h 15m", "12m", "Now",
// "Overdue". `nowMs` is passed in (never read from Date during render).
export function formatCountdown(dueIso: string, nowMs: number): string {
  const diffMs = parseISO(dueIso).getTime() - nowMs;
  if (diffMs <= 0) return "Overdue";
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 1) return "Now";
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Display label for a deadline moment in the user's tz, e.g.
// "Wed, May 28 · 3:00 PM".
export function formatEventTime(dueIso: string, timezone: string): string {
  return format(new TZDate(parseISO(dueIso).getTime(), timezone), "EEE, MMM d · h:mm a");
}

// Display label for a picker wall-clock value ("yyyy-MM-ddTHH:mm"). The value
// has no zone — it's already the wall clock the user picked — so no conversion.
export function formatPickerValue(value: string): string {
  return format(parseISO(value), "EEE, MMM d · h:mm a");
}

// Picker wall-clock value -> UTC ISO instant, interpreting the wall clock in
// the user's profile timezone (NOT the device's), so a deadline entered as
// "3:00 PM" means 3 PM in the same tz the rest of the app keys off.
export function pickerValueToIso(value: string, timezone: string): string {
  const [d, t] = value.split("T");
  const [y, mo, day] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new TZDate(y, mo - 1, day, h, mi, timezone).toISOString();
}

// Inverse of pickerValueToIso: ISO instant -> picker wall-clock in profile tz.
export function isoToPickerValue(iso: string, timezone: string): string {
  return format(new TZDate(parseISO(iso).getTime(), timezone), "yyyy-MM-dd'T'HH:mm");
}

// The 42 dates (6 rows x 7 cols, Monday-first) covering a calendar month view.
// Leading/trailing days spill into the previous/next month so every row is full.
export function monthGridDays(year: number, month: number): Date[] {
  const gridStart = startOfWeek(startOfMonth(new Date(year, month, 1)), {
    weekStartsOn: 1,
  });
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// "May 2026" header label for a given year + 0-based month.
export function monthLabel(year: number, month: number): string {
  return format(new Date(year, month, 1), "MMMM yyyy");
}

// Shift a {year, month} pair by `delta` months, normalizing the rollover.
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = addMonths(new Date(year, month, 1), delta);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Range label for a week, e.g. "May 26 – Jun 1".
export function formatWeekRange(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
}
