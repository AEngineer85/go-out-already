/**
 * Uptown Westerville events scraper
 *
 * Source: https://uptownwestervilleinc.com
 * API: Tribe Events Calendar Pro REST API (unauthenticated)
 * Endpoint: /wp-json/tribe/events/v1/events
 *
 * Returns 259+ events with full venue, cost, and category data.
 * Paginates 100 at a time. Cloudflare blocks the ICS feed but
 * the REST API responds without triggering the challenge.
 */

import axios from "axios";
import type { RawEvent } from "../src/types";
import { toEasternDateStr, toEasternHHMM } from "../src/timeUtils";

const BASE_URL = "https://uptownwestervilleinc.com/wp-json/tribe/events/v1/events";
const SOURCE_NAME = "Uptown Westerville";
const PER_PAGE = 100;

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

interface TribeVenue {
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface TribeEvent {
  id: number;
  title: string;
  description: string;
  start_date: string; // "2026-04-15 18:30:00" (Eastern)
  end_date: string;
  url: string;
  cost?: string;
  all_day: boolean;
  venue?: TribeVenue;
}

interface TribeResponse {
  events: TribeEvent[];
  next_rest_url?: string;
  total: number;
  total_pages: number;
}

function buildAddress(venue?: TribeVenue): string | undefined {
  if (!venue) return undefined;
  const parts = [venue.address, venue.city, venue.state, venue.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/**
 * Parse "2026-04-15 18:30:00" (Eastern local time) into YYYY-MM-DD and HH:MM.
 * These timestamps are already Eastern — no conversion needed.
 */
function parseTribeDateTime(dt: string): { date: string; time: string | undefined } {
  if (!dt) return { date: "", time: undefined };
  const [datePart, timePart] = dt.split(" ");
  const time = timePart && timePart !== "00:00:00" ? timePart.slice(0, 5) : undefined;
  return { date: datePart, time };
}

export async function scrapeUptownWesterville(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  const startDate = now.toISOString().split("T")[0];

  let page = 1;
  let totalPages = 1;

  try {
    do {
      const { data } = await axios.get<TribeResponse>(BASE_URL, {
        params: {
          per_page: PER_PAGE,
          start_date: startDate,
          page,
        },
        headers: {
          "User-Agent": "GoOutAlready/1.0 (+https://gooutalready.com)",
          Accept: "application/json",
        },
        timeout: 15000,
      });

      totalPages = data.total_pages ?? 1;

      for (const ev of data.events ?? []) {
        const { date, time: startTime } = parseTribeDateTime(ev.start_date);
        const { time: endTime } = parseTribeDateTime(ev.end_date);

        if (!date) continue;

        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) continue;
        if (eventDate < now || eventDate > sixMonthsOut) continue;

        const venueName = ev.venue?.venue?.trim();
        const address = buildAddress(ev.venue);

        // Strip HTML from description
        const description = ev.description
          ? ev.description.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 500)
          : undefined;

        events.push({
          title: ev.title.trim(),
          description,
          date,
          startTime: ev.all_day ? undefined : startTime,
          endTime: ev.all_day ? undefined : endTime,
          locationName: venueName || "Uptown Westerville",
          address,
          sourceUrl: ev.url || "https://uptownwestervilleinc.com/uwi-presents/",
          sourceName: SOURCE_NAME,
        });
      }

      page++;
    } while (page <= totalPages);
  } catch (err) {
    console.warn("[uptownWesterville] Scrape error:", err instanceof Error ? err.message : err);
  }

  console.log(`[uptownWesterville] Found ${events.length} events`);
  return events;
}
