/**
 * Main Street Delaware events scraper
 *
 * Source: https://www.mainstreetdelaware.com/events/
 * Platform: WordPress + eventON v5.0.6 plugin
 *
 * eventON v5 uses a two-nonce REST system:
 *   - `n`     (postnonce) — sent as POST field `nonce=`
 *   - `nonce` (WP nonce)  — sent as POST field `nonceX=` and X-WP-Nonce header
 *
 * Both are scraped fresh from the page each run (valid ~12 hours, unauthenticated).
 *
 * Events are fetched month-by-month via:
 *   POST https://www.mainstreetdelaware.com/?evo-ajax=eventon_get_events
 * with direction=next and fixed_month/fixed_year set to the PREVIOUS month
 * (i.e., "navigate forward from month X" → returns month X+1).
 *
 * Response JSON array has unix_start / unix_end (already correct UTC Unix seconds)
 * and event_title. HTML is also returned with location data in data attributes.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";
import { toEasternDateStr, toEasternHHMM } from "../src/timeUtils";

const EVENTS_PAGE = "https://www.mainstreetdelaware.com/events/";
const AJAX_ENDPOINT = "https://www.mainstreetdelaware.com/?evo-ajax=eventon_get_events";
const SOURCE_NAME = "Main Street Delaware";
const DEFAULT_LOCATION = "Downtown Delaware, OH";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

interface EvoNonces {
  n: string;       // postnonce — used as `nonce=` POST field
  nonce: string;   // WP nonce  — used as `nonceX=` and X-WP-Nonce header
}

interface EvoJsonEvent {
  ID: number;
  event_title: string;
  unix_start: number;  // Unix seconds (ET display time)
  unix_end: number;
}

interface EvoResponse {
  status: string;
  json?: EvoJsonEvent[];
  html?: string;
}

/**
 * Scrape both nonces from the inline evo_general_params script block.
 */
async function getNonces(): Promise<EvoNonces | null> {
  try {
    const { data } = await axios.get(EVENTS_PAGE, { headers: BROWSER_HEADERS, timeout: 15000 });
    const $ = cheerio.load(data);

    let n = "";
    let nonce = "";

    $("script:not([src])").each((_, el) => {
      const text = $(el).html() ?? "";
      if (!text.includes("evo_general_params")) return;

      // "n":"0836f9089a"
      const nMatch = text.match(/"n"\s*:\s*"([a-f0-9]+)"/i);
      if (nMatch) n = nMatch[1];

      // "nonce":"b22d21d545"  — comes after "n" in the same block
      const nonceMatches = [...text.matchAll(/"nonce"\s*:\s*"([a-f0-9]+)"/gi)];
      // Last match is the evo_general_params nonce (not an earlier one from other objects)
      if (nonceMatches.length) nonce = nonceMatches[nonceMatches.length - 1][1];
    });

    if (!n || !nonce) {
      console.warn("[mainStreetDelaware] Nonces not found in page");
      return null;
    }
    return { n, nonce };
  } catch (err) {
    console.warn("[mainStreetDelaware] Page fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fetch one month of events by navigating "next" from the given from-month.
 *
 * fromMonth: 1-based month to navigate FROM (result is fromMonth+1)
 * fromYear:  year of the from-month
 *
 * focusStart/focusEnd: Unix seconds (ET) for the START and END of the TARGET month.
 */
async function fetchMonth(
  nonces: EvoNonces,
  fromMonth: number,
  fromYear: number,
  focusStart: number,
  focusEnd: number
): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  try {
    const body = new URLSearchParams({
      direction: "next",
      "shortcode[calendar_type]": "fullcal",
      "shortcode[fixed_month]": String(fromMonth),
      "shortcode[fixed_year]": String(fromYear),
      "shortcode[event_order]": "ASC",
      "shortcode[event_past_future]": "all",
      "shortcode[number_of_months]": "1",
      "shortcode[lang]": "L1",
      "shortcode[_cver]": "5.0.6",
      "shortcode[focus_start_date_range]": String(focusStart),
      "shortcode[focus_end_date_range]": String(focusEnd),
      "shortcode[event_status]": "all",
      "shortcode[event_type]": "all",
      "shortcode[hide_past]": "no",
      "shortcode[event_location]": "all",
      "shortcode[cal_id]": "",
      ajaxtype: "nav",
      nonce: nonces.n,
      nonceX: nonces.nonce,
    });

    const { data } = await axios.post<EvoResponse>(AJAX_ENDPOINT, body.toString(), {
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-WP-Nonce": nonces.nonce,
        Referer: EVENTS_PAGE,
      },
      timeout: 15000,
    });

    if (data.status !== "GOOD" || !data.json?.length) return events;

    // Parse location from HTML (data-d attribute on evoet_data span)
    const locationMap = new Map<number, string>();
    if (data.html) {
      const $ = cheerio.load(data.html);
      $(".eventon_list_event").each((_, el) => {
        const idAttr = $(el).attr("id") ?? ""; // "event_4169_0"
        const postId = parseInt(idAttr.split("_")[1] ?? "0", 10);
        if (!postId) return;
        const dataD = $(el).find(".evoet_data[data-d]").first().attr("data-d");
        if (dataD) {
          try {
            const parsed = JSON.parse(dataD);
            const locName = parsed["loc.n"] as string | undefined;
            if (locName?.trim()) locationMap.set(postId, locName.trim());
          } catch { /* ignore */ }
        }
        // Also try schema.org URL
        const link = $(el).find("a[itemprop='url']").first().attr("href");
        if (link) {
          const existing = locationMap.get(postId);
          // Store link alongside location using a side-channel (separate map)
          // handled below via urlMap
        }
      });
    }

    // Parse URLs from HTML
    const urlMap = new Map<number, string>();
    if (data.html) {
      const $ = cheerio.load(data.html);
      $(".eventon_list_event").each((_, el) => {
        const idAttr = $(el).attr("id") ?? "";
        const postId = parseInt(idAttr.split("_")[1] ?? "0", 10);
        if (!postId) return;
        const link = $(el).find("a[itemprop='url']").first().attr("href")
          || $(el).find("a.evo_event_url, a.evcal_evdata_row").first().attr("href");
        if (link) urlMap.set(postId, link);
      });
    }

    for (const ev of data.json) {
      if (!ev.unix_start) continue;

      // unix_start is seconds since epoch in ET display time
      const startDate = new Date(ev.unix_start * 1000);
      if (startDate < now || startDate > sixMonthsOut) continue;

      const dateStr = toEasternDateStr(startDate);
      const startTime = toEasternHHMM(startDate);
      const endTime = ev.unix_end ? toEasternHHMM(new Date(ev.unix_end * 1000)) : undefined;

      const locationName = locationMap.get(ev.ID) || DEFAULT_LOCATION;
      const sourceUrl = urlMap.get(ev.ID) || EVENTS_PAGE;

      events.push({
        title: ev.event_title.trim(),
        date: dateStr,
        startTime: startTime !== "00:00" ? startTime : undefined,
        endTime: endTime && endTime !== "00:00" ? endTime : undefined,
        locationName,
        sourceUrl,
        sourceName: SOURCE_NAME,
      });
    }
  } catch (err) {
    console.warn(`[mainStreetDelaware] Month fetch error:`, err instanceof Error ? err.message : err);
  }

  return events;
}

export async function scrapeMainStreetDelaware(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  const nonces = await getNonces();
  if (!nonces) return events;

  // Iterate: for target month T, we navigate "next" from month T-1
  for (let i = 0; i < 6; i++) {
    // Target month
    const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const targetMonth = target.getMonth() + 1; // 1-based
    const targetYear = target.getFullYear();

    // From-month = target - 1
    const from = new Date(target.getFullYear(), target.getMonth() - 1, 1);
    const fromMonth = from.getMonth() + 1;
    const fromYear = from.getFullYear();

    // Focus range: first and last second of target month (ET, as Unix seconds)
    const focusStart = Math.floor(target.getTime() / 1000);
    const lastDay = new Date(targetYear, targetMonth, 0, 23, 59, 59); // last day of month
    const focusEnd = Math.floor(lastDay.getTime() / 1000);

    const monthEvents = await fetchMonth(nonces, fromMonth, fromYear, focusStart, focusEnd);
    events.push(...monthEvents);
  }

  // Dedupe by title+date
  const seen = new Set<string>();
  const deduped = events.filter((e) => {
    const key = `${e.title}|${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[mainStreetDelaware] Found ${deduped.length} events`);
  return deduped;
}
