/**
 * Henmick Farm & Brewery event scraper
 *
 * Source: https://www.henmick.com/thismonth
 * Format: Squarespace server-rendered HTML. Two sections of plain <p> tags:
 *   - SPECIAL EVENTS: "April 12, Sunday Local Vendor Pop-Up Market 12-6p"
 *   - LIVE MUSIC:     "April 18, Luke Mossburg 6-9p"
 *
 * No JSON-LD, no ICS feed — Cheerio + regex parsing only.
 * All times are already in Eastern Time (local farm hours), so no conversion needed.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

const SOURCE_URL = "https://www.henmick.com/thismonth";
const SOURCE_NAME = "Henmick Farm & Brewery";
const LOCATION = "Henmick Farm & Brewery";
const ADDRESS = "4380 North Old State Road, Delaware, OH 43015";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

/**
 * Convert a bare hour + PM/AM flag to a 24-hour integer.
 * e.g. (6, "p") → 18,  (12, "p") → 12,  (1, "p") → 13
 */
function to24h(hour: number, period: string): number {
  const pm = period.toLowerCase() === "p";
  if (pm) return hour === 12 ? 12 : hour + 12;
  return hour === 12 ? 0 : hour; // AM
}

/**
 * Parse a time range string like "6-9p", "12-6p", "1-3p", "10a-2p"
 * into HH:MM startTime and endTime strings (already Eastern, already correct).
 * Returns null if pattern doesn't match.
 */
function parseTimeRange(
  raw: string
): { startTime: string; endTime: string } | null {
  // Pattern covers: "6-9p", "12-6p", "10a-2p", "12-10p"
  const m = raw.match(/(\d{1,2})([ap])?-(\d{1,2})([ap])/i);
  if (!m) return null;

  const endHour = parseInt(m[3], 10);
  const endPeriod = m[4]; // always present
  const end24 = to24h(endHour, endPeriod);

  // Start period defaults to same as end; override if explicitly given
  const startHour = parseInt(m[1], 10);
  const startPeriod = m[2] ?? endPeriod;
  const start24 = to24h(startHour, startPeriod);

  return {
    startTime: `${start24.toString().padStart(2, "0")}:00`,
    endTime: `${end24.toString().padStart(2, "0")}:00`,
  };
}

/**
 * Parse "April 18" or "May 3" into a YYYY-MM-DD date string.
 * Uses the current year, rolling to next year if the date is more than
 * 7 days in the past (handles end-of-year pages referencing Jan/Feb).
 */
function parseDateStr(monthDay: string): string | null {
  const year = now.getFullYear();
  const attempt = new Date(`${monthDay} ${year}`);
  if (isNaN(attempt.getTime())) return null;

  // If the date is more than a week in the past, try next year
  const candidate =
    attempt.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000
      ? new Date(`${monthDay} ${year + 1}`)
      : attempt;

  // Format as YYYY-MM-DD
  const y = candidate.getFullYear();
  const mo = (candidate.getMonth() + 1).toString().padStart(2, "0");
  const d = candidate.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/**
 * Parse one event line like:
 *   "April 18, Luke Mossburg 6-9p"
 *   "May 10, Mother's Day Pop-Up Market 12-6p"
 *   "April 5, Easter Sunday Live Music w. Just Jazz 1-3p & Beermosas"
 *   "April 25, TBD"
 *
 * Returns null if the line doesn't look like an event.
 */
function parseLine(
  line: string,
  section: string
): { date: string; title: string; startTime?: string; endTime?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 6) return null;

  // Must start with "Month Day,"
  const dateMatch = trimmed.match(/^([A-Za-z]+ \d{1,2}),\s*/);
  if (!dateMatch) return null;

  const dateStr = parseDateStr(dateMatch[1]);
  if (!dateStr) return null;

  // Rest of the string after "Month Day, "
  let rest = trimmed.slice(dateMatch[0].length);

  // Remove duplicate day-of-week prefix like "Easter Sunday, " or "Sunday "
  // so we don't double-count it in the title
  // (keep it — it's useful context)

  // Find the time range pattern: a number-number+period sequence
  // e.g. "6-9p", "12-6p", "1-3p"
  const timeMatch = rest.match(/\s+(\d{1,2}(?:[ap])?-\d{1,2}[ap])\b/i);

  let title: string;
  let times: { startTime: string; endTime: string } | null = null;

  if (timeMatch) {
    // Title is everything before the time match; strip trailing punctuation
    title = rest.slice(0, timeMatch.index).trim().replace(/[,\s]+$/, "");
    times = parseTimeRange(timeMatch[1]);
  } else {
    // No time found (e.g. "TBD") — use full rest as title
    title = rest.trim();
  }

  if (!title || title.toUpperCase() === "TBD") return null;

  // Prefix title with section context for clarity
  const fullTitle =
    section === "LIVE MUSIC"
      ? `Live Music: ${title} at Henmick Farm`
      : `${title} at Henmick Farm`;

  return {
    date: dateStr,
    title: fullTitle,
    startTime: times?.startTime,
    endTime: times?.endTime,
  };
}

export async function scrapeHenmick(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  try {
    const { data } = await axios.get(SOURCE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // Find the main content block — Squarespace renders everything inside
    // .sqs-html-content blocks. We want the one with event text.
    $(".sqs-html-content").each((_, block) => {
      const blockText = $(block).text();
      // Only process blocks that contain event-like content
      if (
        !blockText.includes("LIVE MUSIC") &&
        !blockText.includes("SPECIAL EVENTS")
      )
        return;

      let currentSection = "SPECIAL EVENTS";

      $(block)
        .find("h3, p")
        .each((_, el) => {
          const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
          const text = $(el).text().trim();

          if (tag === "h3") {
            const upper = text.toUpperCase();
            if (upper.includes("LIVE MUSIC")) currentSection = "LIVE MUSIC";
            else if (upper.includes("SPECIAL")) currentSection = "SPECIAL EVENTS";
            return;
          }

          // Skip footer/meta lines
          if (
            text.startsWith("Follow us") ||
            text.startsWith("Closed") ||
            text.startsWith("*")
          )
            return;

          const parsed = parseLine(text, currentSection);
          if (!parsed) return;

          const eventDate = new Date(parsed.date);
          if (eventDate < now || eventDate > sixMonthsOut) return;

          events.push({
            title: parsed.title,
            date: parsed.date,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            locationName: LOCATION,
            address: ADDRESS,
            sourceUrl: SOURCE_URL,
            sourceName: SOURCE_NAME,
          });
        });
    });
  } catch (err) {
    console.warn("[henmick] Scrape error:", err instanceof Error ? err.message : err);
  }

  console.log(`[henmick] Found ${events.length} events`);
  return events;
}
