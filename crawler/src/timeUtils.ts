/**
 * timeUtils.ts
 *
 * Shared time/date helpers for the crawler.
 *
 * ALL times stored in the database are in Eastern Time (America/New_York),
 * because that's where the events are. The crawler runs on Render whose
 * system timezone is UTC, so we must explicitly convert every time value
 * rather than relying on toTimeString() / toLocaleString() without a
 * timezone argument.
 */

const EASTERN_TZ = "America/New_York";

/**
 * Converts any Date object to a "HH:MM" string in Eastern Time.
 * Uses Intl.DateTimeFormat.formatToParts for maximum portability
 * (works on all Node.js 12+ regardless of ICU build variant).
 */
export function toEasternHHMM(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  let h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  // Some implementations return 24 for midnight — normalise to 0
  if (h === 24) h = 0;
  return `${h.toString().padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/**
 * Converts any Date object to a "YYYY-MM-DD" string in Eastern Time.
 * Uses en-CA locale which produces ISO date format natively.
 */
export function toEasternDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TZ,
  }).format(date);
}
