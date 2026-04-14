import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

export async function scrapeExperienceColumbus(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get("https://www.experiencecolumbus.com/events/", {
      headers: { "User-Agent": "GoOutAlready/1.0" },
      timeout: 15000,
    });
    const $ = cheerio.load(data);

    $(".event-listing__item, .tribe-event, article.type-tribe_events").each((_, el) => {
      const title = $(el).find("h2, h3, .tribe-event-name, .event-title").first().text().trim();
      const dateText = $(el).find(".tribe-event-date-start, .event-date, time").first().text().trim();
      const location = $(el).find(".tribe-venue, .event-location, .venue").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "https://www.experiencecolumbus.com/events/";

      if (title && dateText) {
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime())) {
          events.push({
            title,
            date: parsedDate.toISOString().split("T")[0],
            locationName: location || "Columbus, OH",
            sourceUrl: link,
            sourceName: "Experience Columbus",
          });
        }
      }
    });
  } catch (err) {
    console.error("[experienceColumbus] Error:", err);
  }
  return events;
}
