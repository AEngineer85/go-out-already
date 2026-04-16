/**
 * Visit Delaware Ohio events scraper
 *
 * Source: https://www.visitdelohio.com/events/
 * API: WordPress REST API with custom `event` post type
 * Endpoint: /wp-json/wp/v2/event
 *
 * Key fields:
 *   - meta.start_time  → Unix timestamp (ms) for event start
 *   - meta.end_time    → Unix timestamp (ms) for event end
 *   - meta.location    → Venue name
 *   - meta.address     → Full address string
 *   - meta.external_url / meta.register_url → source link
 *
 * Covers Delaware County and surrounding Central Ohio area.
 * 1000+ events, up to a year out. No auth required.
 */

import axios from "axios";
import type { RawEvent } from "../src/types";
import { toEasternDateStr, toEasternHHMM } from "../src/timeUtils";

const BASE_URL = "https://www.visitdelohio.com/wp-json/wp/v2/event";
const SOURCE_NAME = "Visit Delaware Ohio";
const PER_PAGE = 100;

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

interface DelcoEventMeta {
  start_time?: number;   // Unix seconds (NOT ms) — multiply by 1000 for Date constructor
  end_time?: number;     // Unix seconds
  location?: string;     // venue name
  address?: string;      // full address
  external_url?: string;
  register_url?: string;
  all_day?: boolean;
}

interface DelcoEvent {
  id: number;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  meta: DelcoEventMeta;
}

export async function scrapeVisitDelawareOhio(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  // Filter to only future events by ordering by meta start_time
  // WP REST API doesn't support meta-based filtering on the v2 endpoint
  // without custom query params; we fetch ordered by date and stop when past the window
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data, headers } = await axios.get<DelcoEvent[]>(BASE_URL, {
        params: {
          per_page: PER_PAGE,
          page,
          orderby: "event_date",
          order: "asc",
          after: new Date(now.getTime() - 86400000).toISOString(),
        },
        headers: {
          "User-Agent": "GoOutAlready/1.0 (+https://gooutalready.com)",
          Accept: "application/json",
        },
        timeout: 15000,
      });

      const totalPages = parseInt(headers["x-wp-totalpages"] ?? "1", 10);
      hasMore = page < totalPages;

      for (const ev of data ?? []) {
        const meta = ev.meta ?? {};
        if (!meta.start_time) continue;

        const startDate = new Date(meta.start_time * 1000);
        if (startDate < now || startDate > sixMonthsOut) continue;

        const dateStr = toEasternDateStr(startDate);
        const startTime = meta.all_day ? undefined : toEasternHHMM(startDate);
        const endTime =
          meta.end_time && !meta.all_day
            ? toEasternHHMM(new Date(meta.end_time * 1000))
            : undefined;

        const title = ev.title.rendered
          .replace(/&#8211;/g, "–")
          .replace(/&#8217;/g, "'")
          .replace(/&#038;/g, "&")
          .replace(/&amp;/g, "&")
          .trim();

        const description = ev.content.rendered
          ? ev.content.rendered.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 500)
          : undefined;

        const sourceUrl =
          meta.external_url || meta.register_url || ev.link;

        events.push({
          title,
          description,
          date: dateStr,
          startTime,
          endTime,
          locationName: meta.location?.trim() || "Delaware County, OH",
          address: meta.address?.trim() || undefined,
          sourceUrl,
          sourceName: SOURCE_NAME,
        });
      }

      page++;
    }
  } catch (err) {
    console.warn("[visitDelawareOhio] Scrape error:", err instanceof Error ? err.message : err);
  }

  console.log(`[visitDelawareOhio] Found ${events.length} events`);
  return events;
}
