import { chromium } from "playwright";
import type { RawEvent } from "../src/types";

export async function scrapeColumbusRecParks(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto("https://www.columbusrecparks.com/events/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Try ICS first
    const icsLink = await page.$("a[href*='.ics'], a[href*='ical']");
    if (icsLink) {
      await browser.close();
      return events; // ICS feed handler will cover this
    }

    const eventEls = await page.$$(".tribe-event, .event-listing__item, article");

    for (const el of eventEls) {
      const title = await el.$eval(
        "h2, h3, .tribe-event-name, .event-title",
        (e) => e.textContent?.trim() || ""
      ).catch(() => "");

      const dateText = await el.$eval(
        ".tribe-event-date-start, .event-date, time",
        (e) => e.textContent?.trim() || ""
      ).catch(() => "");

      const location = await el.$eval(
        ".tribe-venue, .event-location, .venue",
        (e) => e.textContent?.trim() || ""
      ).catch(() => "");

      const link = await el.$eval("a", (e) => (e as HTMLAnchorElement).href).catch(() => "");

      if (title && dateText) {
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime()) && parsedDate >= new Date()) {
          events.push({
            title,
            date: parsedDate.toISOString().split("T")[0],
            locationName: location || "Columbus, OH",
            sourceUrl: link || "https://www.columbusrecparks.com/events/",
            sourceName: "Columbus Rec & Parks",
          });
        }
      }
    }
  } catch (err) {
    console.error("[columbusRecParks] Error:", err);
  } finally {
    await browser.close();
  }

  return events;
}
