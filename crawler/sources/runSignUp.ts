import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

export async function scrapeRunSignUp(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  const SEARCH_URLS = [
    "https://runsignup.com/Races/OH/Columbus",
    "https://runsignup.com/Races/OH/Delaware",
    "https://runsignup.com/Races/OH/Dublin",
    "https://runsignup.com/Races/OH/Westerville",
  ];

  for (const url of SEARCH_URLS) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; GoOutAlready/1.0; +https://github.com/AEngineer85)",
        },
        timeout: 15000,
      });

      const $ = cheerio.load(data);

      $(".race-listing, .race-card, [class*='race']").each((_, el) => {
        const title = $(el).find("h2, h3, .race-name, [class*='name']").first().text().trim();
        const dateText = $(el)
          .find(".race-date, [class*='date'], time")
          .first()
          .text()
          .trim();
        const location = $(el).find(".race-location, [class*='location']").first().text().trim();
        const link = $(el).find("a").first().attr("href");

        if (title && dateText) {
          const parsedDate = new Date(dateText);
          if (!isNaN(parsedDate.getTime()) && parsedDate >= new Date()) {
            events.push({
              title,
              date: parsedDate.toISOString().split("T")[0],
              locationName: location || "Columbus, OH",
              sourceUrl: link
                ? link.startsWith("http")
                  ? link
                  : `https://runsignup.com${link}`
                : url,
              sourceName: "RunSignUp",
            });
          }
        }
      });
    } catch (err) {
      console.warn(`[runSignUp] Failed ${url}:`, err);
    }
  }

  return events;
}
