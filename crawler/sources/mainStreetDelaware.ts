/**
 * Main Street Delaware events scraper
 *
 * Source: https://www.mainstreetdelaware.com/events/
 * Platform: WordPress + eventON v5 plugin
 *
 * eventON renders its calendar entirely via AJAX. The approach:
 *   1. Fetch the events page to extract the nonce and calendar ID from
 *      the inline JS (wp_localize_script / ajde_evcal_calendar div attrs)
 *   2. POST to /wp-admin/admin-ajax.php with action=eventon_init_load
 *      to get the initial month of events
 *   3. Iterate forward months until 6 months out
 *
 * Each event hit contains an `ajde_events` custom post with JSON-LD
 * or data attributes we can parse for title, date, location, and URL.
 *
 * Falls back gracefully to empty array on any network/parsing failure.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

const EVENTS_PAGE = "https://www.mainstreetdelaware.com/events/";
const AJAX_URL = "https://www.mainstreetdelaware.com/wp-admin/admin-ajax.php";
const SOURCE_NAME = "Main Street Delaware";
const LOCATION = "Downtown Delaware, OH";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Fetch the events page and extract:
 *   - nonce: from window.ajde or evcal_front_js_localized inline script
 *   - calendarId: from the div[id^="evcal_calendar_"] element
 */
async function getNonceAndCalId(): Promise<{ nonce: string; calId: string } | null> {
  try {
    const { data } = await axios.get(EVENTS_PAGE, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(data);

    // Calendar div ID like "evcal_calendar_636"
    const calDiv = $("[id^='evcal_calendar_']").first();
    const calId = calDiv.attr("id")?.replace("evcal_calendar_", "") ?? "";

    // Nonce is embedded in inline <script> as part of wp_localize_script
    // Typical: {"ajaxurl":"...","nonce":"abc123"} or ajde_evcal_front = {nonce:"abc123"}
    let nonce = "";
    $("script:not([src])").each((_, el) => {
      const text = $(el).html() ?? "";
      // Match: "nonce":"<value>" or nonce:"<value>"
      const m = text.match(/"nonce"\s*:\s*"([a-f0-9]+)"/i) || text.match(/nonce\s*:\s*"([a-f0-9]+)"/i);
      if (m && !nonce) nonce = m[1];
    });

    if (!nonce || !calId) return null;
    return { nonce, calId };
  } catch {
    return null;
  }
}

/**
 * Fetch one month of events from the eventON AJAX endpoint.
 * month: 1-based month number, year: full year
 */
async function fetchMonth(
  nonce: string,
  calId: string,
  month: number,
  year: number
): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  try {
    const params = new URLSearchParams({
      action: "eventon_init_load",
      n: nonce,
      cal_id: calId,
      emo: String(month).padStart(2, "0"),
      eyr: String(year),
      lang: "L1",
    });

    const { data } = await axios.post(AJAX_URL, params.toString(), {
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: EVENTS_PAGE,
      },
      timeout: 15000,
    });

    // Response is HTML fragment containing event tiles
    const $ = cheerio.load(typeof data === "string" ? data : JSON.stringify(data));

    // eventON v5 event structure: .eventon_list_event or article[data-event_id]
    $(".eventon_list_event, article[data-event_id]").each((_, el) => {
      // Title: .evcal_desc .evcal_event_title, or .evo_h3 a
      const title = $(el).find(".evcal_event_title, .evo_h3 a, h3.evo_h3").first().text().trim();
      if (!title) return;

      // Unix timestamp from data-start_time or data-evcal_eventdate
      const startTs =
        parseInt($(el).attr("data-start_time") ?? $(el).attr("data-evcal_eventdate") ?? "0", 10);

      if (!startTs) return;

      // eventON stores times as Unix seconds (not ms)
      const startDate = new Date(startTs * 1000);
      if (startDate < now || startDate > sixMonthsOut) return;

      const dateStr = startDate.toISOString().split("T")[0];

      // Start/end time from data-start_time_hr / data-end_time_hr (HH:MM)
      const startTime = $(el).attr("data-start_time_hr") || undefined;
      const endTime = $(el).attr("data-end_time_hr") || undefined;

      // Location
      const locationName =
        $(el).find(".evo_location, .evcal_location_name").first().text().trim() || LOCATION;

      // Link
      const link =
        $(el).find("a.evcal_evdata_row, .evcal_event_title a, a.evo_event_url").first().attr("href") ||
        EVENTS_PAGE;

      events.push({
        title,
        date: dateStr,
        startTime: startTime !== "00:00" ? startTime : undefined,
        endTime: endTime !== "00:00" ? endTime : undefined,
        locationName,
        sourceUrl: link,
        sourceName: SOURCE_NAME,
      });
    });
  } catch (err) {
    console.warn(`[mainStreetDelaware] Month ${month}/${year} error:`, err instanceof Error ? err.message : err);
  }

  return events;
}

export async function scrapeMainStreetDelaware(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  const creds = await getNonceAndCalId();
  if (!creds) {
    console.warn("[mainStreetDelaware] Could not extract nonce/calId — skipping");
    return events;
  }

  const { nonce, calId } = creds;

  // Iterate current month through 6 months out
  const startMonth = now.getMonth() + 1; // 1-based
  const startYear = now.getFullYear();

  for (let i = 0; i < 7; i++) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const monthEvents = await fetchMonth(nonce, calId, month, year);
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
