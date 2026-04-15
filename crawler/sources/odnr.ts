/**
 * Ohio DNR Events scraper
 *
 * Uses the undocumented but publicly accessible search API that powers
 * the ODNR events calendar at ohiodnr.gov/go-and-do/plan-a-visit/events-calendar
 *
 * Endpoint: GET /wps/odx-common/content/search/odnr.en?q=authoringTemplate:Event&size=2000
 * Returns JSON with up to 2000 events. Timestamps are Unix milliseconds (UTC).
 *
 * We filter to Central Ohio events by matching contentPath against known
 * regional path segments and event location names.
 */

import axios from "axios";
import type { RawEvent } from "../src/types";
import { toEasternHHMM, toEasternDateStr } from "../src/timeUtils";

const API_URL =
  "https://ohiodnr.gov/wps/odx-common/content/search/odnr.en?q=authoringTemplate:Event&size=2000";

const BASE_EVENT_URL = "https://ohiodnr.gov";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

/**
 * contentPath segments and location keywords that indicate a Central Ohio event.
 * ODNR organises events under regional folder names in their CMS.
 */
const CENTRAL_OHIO_PATTERNS = [
  "central-ohio",
  "central ohio",
  "alum creek",
  "hocking hills",
  "scioto trail",
  "tar hollow",
  "AW Marion",
  "aw-marion",
  "buckeye lake",
  "delaware state park",
  "Delaware-State",
  "rocky fork",
  "paint creek",
  "salt fork",
  "shawnee",
  "madison lake",
  "deer creek",
  "sycamore state",
  "caesar creek",
  "geology-events", // Ohio Geological Survey events often held near Columbus
];

function isCentralOhio(hit: OdnrHit): boolean {
  const path = (hit._source.contentPath ?? "").toLowerCase();
  const locName = (hit._source.elements?.locationName ?? "").toLowerCase();
  const title = (hit._source.title ?? "").toLowerCase();
  const combined = `${path} ${locName} ${title}`;
  return CENTRAL_OHIO_PATTERNS.some((p) => combined.includes(p.toLowerCase()));
}

interface OdnrElements {
  summary?: string;
  body?: string;
  startDateAndTime?: number; // Unix ms UTC
  endDateAndTime?: number;
  locationName?: string;
  location?: string; // address-ish text
  locationURL?: string;
  registrationLink?: string;
}

interface OdnrHit {
  _id: string;
  _source: {
    title: string;
    contentPath?: string;
    elements?: OdnrElements;
  };
}

interface OdnrResponse {
  hits: {
    hits: OdnrHit[];
  };
}

/**
 * Strip HTML tags from a string for use as plain-text description.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Convert a contentPath like
 *   "Ohio Content English/odnr/home/news-and-events/all-events/parks-wc-events/Central-Ohio/HomeschoolAquatic-4-16-26"
 * to a portal URL like
 *   "https://ohiodnr.gov/wps/portal/gov/odnr/home/news-and-events/all-events/parks-wc-events/Central-Ohio/HomeschoolAquatic-4-16-26"
 */
function contentPathToUrl(contentPath: string, locationUrl?: string): string {
  if (locationUrl && locationUrl.startsWith("http")) return locationUrl;
  // Strip leading "Ohio Content English/odnr" and replace with portal prefix
  const trimmed = contentPath.replace(
    /^Ohio\s+Content\s+English\/odnr\//i,
    ""
  );
  return `${BASE_EVENT_URL}/wps/portal/gov/odnr/${trimmed}`;
}

export async function scrapeODNR(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  try {
    const { data } = await axios.get<OdnrResponse>(API_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const hits = data?.hits?.hits ?? [];
    console.log(`[odnr] Total ODNR events in API: ${hits.length}`);

    for (const hit of hits) {
      const src = hit._source;
      const el = src.elements ?? {};

      // Skip if no start time
      if (!el.startDateAndTime) continue;

      const startDate = new Date(el.startDateAndTime);
      if (startDate < now || startDate > sixMonthsOut) continue;

      // Only Central Ohio events
      if (!isCentralOhio(hit)) continue;

      // Build date/time strings in Eastern Time
      const dateStr = toEasternDateStr(startDate);
      const startTime = toEasternHHMM(startDate);
      const endTime = el.endDateAndTime
        ? toEasternHHMM(new Date(el.endDateAndTime))
        : undefined;

      // Skip midnight start times that mean "all day / time unknown"
      const useStartTime = startTime !== "00:00" ? startTime : undefined;
      const useEndTime = endTime && endTime !== "00:00" ? endTime : undefined;

      // Description: prefer summary, fall back to stripped body
      const description =
        el.summary?.trim() ||
        (el.body ? stripHtml(el.body).slice(0, 400) : undefined);

      // Location
      const locationName = el.locationName?.trim() || "Ohio DNR Property";
      const address = el.location?.trim() || undefined;

      // Source URL: prefer locationURL if it points to the event, else derive from contentPath
      const sourceUrl = contentPathToUrl(
        src.contentPath ?? "",
        el.registrationLink || undefined
      );

      events.push({
        title: src.title.trim(),
        description,
        date: dateStr,
        startTime: useStartTime,
        endTime: useEndTime,
        locationName,
        address,
        sourceUrl,
        sourceName: "Ohio DNR",
      });
    }
  } catch (err) {
    console.warn(
      "[odnr] Scrape error:",
      err instanceof Error ? err.message : err
    );
  }

  console.log(`[odnr] Found ${events.length} Central Ohio events`);
  return events;
}
