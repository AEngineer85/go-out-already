/**
 * Schema.org JSON-LD Event Scraper
 *
 * Iterates over VENUE_LIST, fetches each page, and extracts structured Event
 * data from <script type="application/ld+json"> tags.  For venues that don't
 * publish schema.org markup (e.g. Squarespace / WordPress sites that hide
 * events in plain HTML) a set of Cheerio-based fallback selectors is tried.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";
import { VENUE_LIST, type VenueConfig } from "./venueList";
import { toEasternHHMM, toEasternDateStr } from "../src/timeUtils";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isInRange(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= now && d <= sixMonthsOut;
}

/** Normalise a variety of date strings to YYYY-MM-DD in Eastern Time */
function toDateStr(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return toEasternDateStr(d);
}

/** Extract HH:MM (Eastern Time) from an ISO datetime or plain time string */
function toTimeStr(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const t = toEasternHHMM(d);
    return t === "00:00" ? undefined : t;
  }
  // Already a bare HH:MM string (no timezone info) — use as-is
  const match = raw.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : undefined;
}

function extractLocation(loc: unknown): { name: string; address?: string } {
  if (!loc) return { name: "" };
  if (typeof loc === "string") return { name: loc };
  if (typeof loc === "object" && loc !== null) {
    const l = loc as Record<string, unknown>;
    const name =
      (typeof l.name === "string" ? l.name : "") ||
      (typeof l["@type"] === "string" ? "" : "");
    let address: string | undefined;
    if (l.address) {
      if (typeof l.address === "string") {
        address = l.address;
      } else if (typeof l.address === "object" && l.address !== null) {
        const a = l.address as Record<string, unknown>;
        const parts = [
          a.streetAddress,
          a.addressLocality,
          a.addressRegion,
          a.postalCode,
        ]
          .filter(Boolean)
          .join(", ");
        address = parts || undefined;
      }
    }
    return { name, address };
  }
  return { name: "" };
}

/** Pull events out of one parsed JSON-LD object (may be an array or single) */
function extractEventsFromLd(
  ld: unknown,
  venue: VenueConfig
): RawEvent[] {
  const items: unknown[] = Array.isArray(ld) ? ld : [ld];
  const results: RawEvent[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    // Recurse into @graph arrays
    if (Array.isArray(obj["@graph"])) {
      results.push(...extractEventsFromLd(obj["@graph"], venue));
      continue;
    }

    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (!types.some((t) => typeof t === "string" && t.includes("Event")))
      continue;

    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) continue;

    const startDate = typeof obj.startDate === "string" ? obj.startDate : undefined;
    if (!isInRange(startDate)) continue;

    const endDate = typeof obj.endDate === "string" ? obj.endDate : undefined;
    const desc =
      typeof obj.description === "string" ? obj.description.trim() : undefined;
    const url =
      typeof obj.url === "string"
        ? obj.url
        : typeof obj["@id"] === "string"
        ? obj["@id"]
        : venue.url;

    const { name: locName, address } = extractLocation(obj.location);

    results.push({
      title: name,
      description: desc,
      date: toDateStr(startDate)!,
      startTime: toTimeStr(startDate),
      endTime: toTimeStr(endDate),
      locationName: locName || venue.name,
      address,
      sourceUrl: url,
      sourceName: venue.name,
    });
  }
  return results;
}

// ── Schema.org extraction ─────────────────────────────────────────────────────

async function scrapeVenueSchemaOrg(venue: VenueConfig): Promise<RawEvent[]> {
  const { data } = await axios.get(venue.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeout: 20000,
  });

  const $ = cheerio.load(data);
  const events: RawEvent[] = [];

  // ── JSON-LD pass ──────────────────────────────────────────────────────────
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}");
      events.push(...extractEventsFromLd(json, venue));
    } catch {
      // malformed JSON — skip
    }
  });

  if (events.length > 0) return events;

  // ── HTML fallback pass ────────────────────────────────────────────────────
  // Common CMS / event-plugin selectors (The Events Calendar, Squarespace,
  // Wix, modern venue sites, etc.)
  const cardSelectors = [
    "[class*='eventCard']",
    "[class*='event-card']",
    "[class*='event-item']",
    "[class*='event-listing']",
    "[class*='event-row']",
    "[class*='event_item']",
    ".tribe-event",
    ".tribe-events-calendar-list__event",
    "[class*='EventItem']",
    "[class*='EventCard']",
    "article[class*='event']",
    "li[class*='event']",
    // Squarespace
    "[class*='summary-item']",
    // Generic
    ".vevent",
  ].join(", ");

  $(cardSelectors).each((_, el) => {
    const $el = $(el);

    const title = $el
      .find(
        "h1, h2, h3, h4, [class*='title'], [class*='name'], [class*='summary']"
      )
      .first()
      .text()
      .trim();
    if (!title) return;

    const dateText = $el
      .find(
        "time, [class*='date'], [class*='start'], [datetime], [class*='when']"
      )
      .first()
      .text()
      .trim();
    const dateAttr = $el
      .find("[datetime]")
      .first()
      .attr("datetime");

    const dateStr = toDateStr(dateAttr || dateText);
    if (!dateStr || !isInRange(dateStr)) return;

    const desc = $el
      .find("[class*='description'], [class*='excerpt'], p")
      .first()
      .text()
      .trim();
    const locText = $el
      .find("[class*='location'], [class*='venue'], [class*='address']")
      .first()
      .text()
      .trim();
    const link =
      $el.find("a").first().attr("href") ||
      $el.closest("a").attr("href") ||
      venue.url;

    events.push({
      title,
      description: desc || undefined,
      date: dateStr,
      startTime: toTimeStr(dateAttr || dateText),
      locationName: locText || venue.name,
      sourceUrl: link.startsWith("http")
        ? link
        : `${new URL(venue.url).origin}${link}`,
      sourceName: venue.name,
    });
  });

  return events;
}

// ── Public export ─────────────────────────────────────────────────────────────

export async function scrapeVenueList(): Promise<{
  events: RawEvent[];
  errors: string[];
}> {
  const events: RawEvent[] = [];
  const errors: string[] = [];

  // Sequential to be polite to small venue sites and stay within free-tier
  // memory limits on Render
  for (const venue of VENUE_LIST) {
    try {
      const found = await scrapeVenueSchemaOrg(venue);
      if (found.length > 0) {
        console.log(`[schemaOrg] ${venue.name}: ${found.length} events`);
        events.push(...found);
      }
    } catch (err) {
      const msg = `[schemaOrg] Failed ${venue.name} (${venue.url}): ${
        err instanceof Error ? err.message : String(err)
      }`;
      // Log at warn level — individual venue failures are expected
      console.warn(msg);
      errors.push(msg);
    }

    // Small delay to avoid hammering small venue servers back-to-back
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(
    `[schemaOrg] Total: ${events.length} events from ${VENUE_LIST.length} venues (${errors.length} errors)`
  );
  return { events, errors };
}
