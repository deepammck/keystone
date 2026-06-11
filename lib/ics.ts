// RFC 5545 (.ics) generation for the Deadlines section. Pure functions — no
// DOM, no Supabase — so the same code serves two consumers:
//  1. EventList's "Export" button: client-side blob download of the events
//     already in memory (works in local mode AND Supabase mode).
//  2. app/api/calendar: the same text served over HTTP in Supabase mode. A
//     future webcal:// subscription feed builds on that route, but needs a
//     per-user feed token (calendar apps can't send session cookies) — that's
//     a profiles migration, deferred until approved.
import type { Event } from "@/lib/types";

export const ICS_FILENAME = "keystone-deadlines.ics";

// Content lines are CRLF-separated per RFC 5545 §3.1.
const CRLF = "\r\n";

// TEXT value escaping (§3.3.11): backslash first, then comma/semicolon/newline.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold a content line to ≤75 octets (§3.1); continuation lines begin with a
// single space that counts toward their own 75. Counted in UTF-8 octets, not
// chars, so multi-byte titles fold correctly.
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const chOctets = encoder.encode(ch).length;
    if (octets + chOctets > 75) {
      parts.push(current);
      current = " ";
      octets = 1;
    }
    current += ch;
    octets += chOctets;
  }
  parts.push(current);
  return parts.join(CRLF);
}

// 2026-06-10T19:00:00.000Z → 20260610T190000Z. due_at is stored as a UTC
// instant (toISOString), so DTSTART in UTC is exact; the subscriber's calendar
// renders it in their own timezone.
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// nowMs is a parameter (not Date.now() here) so callers decide when the clock
// is read — same purity rule as formatCountdown.
export function eventsToIcs(events: Event[], nowMs: number): string {
  const dtstamp = toIcsUtc(new Date(nowMs).toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Keystone//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Keystone Deadlines",
  ];
  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@keystone`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toIcsUtc(ev.due_at)}`,
      `SUMMARY:${escapeText(ev.title)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
