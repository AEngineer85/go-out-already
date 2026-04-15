/**
 * Alum Creek Marina event scraper
 *
 * Source: https://www.alumcreekmarina.net/events.html
 * Platform: Weebly — fully server-rendered, no JavaScript needed.
 *
 * HTML structure per event:
 *   <h2 class="wsite-content-title"><font size="5">Band Name</font></h2>
 *   <div class="paragraph">August 2nd, 2025, 5:30-8:30pm<br/>Rock &amp; Roll</div>
 *
 * Times are already in Eastern Time (local venue hours).
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

const SOURCE_URL = "https://www.alumcreekmarina.net/events.html";
const SOURCE_NAME = "Alum Creek Marina";
const LOCATION = "Alum Creek Marina";
const ADDRESS = "3185 Hollenback Rd, Sunbury, OH 43074";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

/**
 * Parse a time range with optional minutes, e.g.:
 *   "5:30-8:30pm"  → startTime: "17:30", endTime: "20:30"
 *   "6-9pm"        → startTime: "18:00", endTime: "21:00"
 *   "1-3pm"        → startTime: "13:00", endTime: "15:00"
 *   "11am-2pm"     → startTime: "11:00", endTime: "14:00"
 */
function parseTimeRange(
  raw: string
): { startTime: string; endTime: string } | null {
  // Matches: "5:30-8:30pm", "6-9pm", "11am-2pm", "12-6pm"
  const m = raw.match(
    /(\d{1,2})(?::(\d{2}))?([ap]m)?-(\d{1,2})(?::(\d{2}))?([ap]m)/i
  );
  if (!m) return null;

  const [, sh, sm, sp, eh, em, ep] = m;

  const endH = parseInt(eh, 10);
  const endM = parseInt(em ?? "0", 10);
  const endPM = ep.toLowerCase() === "pm";
  const end24 = endPM ? (endH === 12 ? 12 : endH + 12) : endH === 12 ? 0 : endH;

  // Start period: use explicit if given, else inherit from end
  const startPM = sp ? sp.toLowerCase() === "pm" : endPM;
  const startH = parseInt(sh, 10);
  const startM = parseInt(sm ?? "0", 10);
  const start24 = startPM
    ? startH === 12 ? 12 : startH + 12
    : startH === 12 ? 0 : startH;

  const fmt = (h: number, min: number) =>
    `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

  return { startTime: fmt(start24, startM), endTime: fmt(end24, endM) };
}

/**
 * Parse date strings like:
 *   "August 2nd, 2025"   → "2025-08-02"
 *   "July 26, 2025"      → "2025-07-26"
 *   "September 13th, 2025" → "2025-09-13"
 */
function parseDateStr(raw: string): string | null {
  // Strip ordinal suffixes (1st, 2nd, 3rd, 4th … 31st)
  const cleaned = raw.replace(/(\d+)(?:st|nd|rd|th)/, "$1");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export async function scrapeAlumCreekMarina(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  try {
    const { data } = await axios.get(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)" },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // Each event: h2.wsite-content-title followed by div.paragraph
    $("h2.wsite-content-title").each((_, titleEl) => {
      const title = $(titleEl).text().trim();
      if (!title) return;

      // The next meaningful sibling with date/time info
      const infoEl = $(titleEl).nextAll("div.paragraph").first();
      if (!infoEl.length) return;

      // Raw text may be multi-line: first line is "Date, time", rest is genre/notes
      const rawText = infoEl.text().trim();
      const firstLine = rawText.split(/\n|<br\s*\/?>/i)[0].trim();

      // Split on last comma before the time: "August 2nd, 2025, 5:30-8:30pm"
      // → date part: "August 2nd, 2025"  time part: "5:30-8:30pm"
      const commaIdx = firstLine.lastIndexOf(",");
      if (commaIdx === -1) return;

      const datePart = firstLine.slice(0, commaIdx).trim();
      const timePart = firstLine.slice(commaIdx + 1).trim();

      const dateStr = parseDateStr(datePart);
      if (!dateStr) return;

      const eventDate = new Date(dateStr);
      if (eventDate < now || eventDate > sixMonthsOut) return;

      const times = parseTimeRange(timePart);

      // Pull description from any additional lines (genre, notes)
      const lines = (infoEl.html() ?? "")
        .split(/<br\s*\/?>/i)
        .map((l) => cheerio.load(l)("body").text().trim())
        .filter(Boolean);
      const description =
        lines.length > 1 ? lines.slice(1).join(" · ") : undefined;

      events.push({
        title: `Live Music: ${title} at Alum Creek Marina`,
        description,
        date: dateStr,
        startTime: times?.startTime,
        endTime: times?.endTime,
        locationName: LOCATION,
        address: ADDRESS,
        sourceUrl: SOURCE_URL,
        sourceName: SOURCE_NAME,
      });
    });
  } catch (err) {
    console.warn(
      "[alumCreekMarina] Scrape error:",
      err instanceof Error ? err.message : err
    );
  }

  console.log(`[alumCreekMarina] Found ${events.length} events`);
  return events;
}
