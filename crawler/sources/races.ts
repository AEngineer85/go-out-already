import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

// ── RunSignUp search (fixed) ──────────────────────────────────────────────────
// Uses their search page with a broader query instead of city-specific pages
async function scrapeRunSignUp(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get(
      "https://runsignup.com/Races/OH",
      {
        params: {
          country: "US",
          state: "OH",
          distance_from: "Columbus, OH",
          within_radius: 30,
          start_date: now.toISOString().split("T")[0],
          end_date: sixMonthsOut.toISOString().split("T")[0],
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 15000,
      }
    );
    const $ = cheerio.load(data);

    $(".race-listing, .race-row, [class*='RaceResult'], [class*='race-card']").each((_, el) => {
      const title = $(el).find("h3, h4, [class*='name'], [class*='title']").first().text().trim();
      const dateText = $(el).find("[class*='date'], time, .date").first().text().trim();
      const location = $(el).find("[class*='location'], [class*='city']").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";

      if (!title) return;
      const parsedDate = new Date(dateText);
      if (isNaN(parsedDate.getTime())) return;
      if (parsedDate < now || parsedDate > sixMonthsOut) return;

      events.push({
        title,
        date: parsedDate.toISOString().split("T")[0],
        locationName: location || "Columbus, OH",
        sourceUrl: link.startsWith("http") ? link : `https://runsignup.com${link}`,
        sourceName: "RunSignUp",
      });
    });
  } catch (err) {
    console.warn("[races] RunSignUp error:", err);
  }
  return events;
}

// ── Columbus Marathon & Half Marathon ─────────────────────────────────────────
async function scrapeColumbusMarathon(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get("https://www.columbusmarathon.com", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)" },
      timeout: 10000,
    });
    const $ = cheerio.load(data);

    // Look for event dates on the homepage
    const dateText = $("[class*='date'], [class*='event-date'], .race-date").first().text().trim();
    const title = $("h1, h2").first().text().trim() || "Columbus Marathon & Half Marathon";

    if (dateText) {
      const parsedDate = new Date(dateText);
      if (!isNaN(parsedDate.getTime()) && parsedDate >= now) {
        events.push({
          title: "Columbus Marathon & Half Marathon",
          description: "Annual Columbus Marathon weekend featuring full marathon, half marathon, and other distances through downtown Columbus.",
          date: parsedDate.toISOString().split("T")[0],
          locationName: "Nationwide Arena / Downtown Columbus",
          address: "Downtown Columbus, OH",
          sourceUrl: "https://www.columbusmarathon.com",
          sourceName: "Columbus Marathon",
        });
      }
    }

    // Also check for any listed events/races
    $("[class*='event'], [class*='race']").each((_, el) => {
      const t = $(el).find("h2, h3, [class*='title']").first().text().trim();
      const d = $(el).find("time, [class*='date']").first().text().trim();
      if (!t || !d) return;
      const pd = new Date(d);
      if (isNaN(pd.getTime()) || pd < now) return;
      events.push({
        title: t,
        date: pd.toISOString().split("T")[0],
        locationName: "Downtown Columbus, OH",
        sourceUrl: "https://www.columbusmarathon.com",
        sourceName: "Columbus Marathon",
      });
    });
  } catch (err) {
    console.warn("[races] Columbus Marathon error:", err);
  }
  return events;
}

// ── OhioRaces.com (fixed) ─────────────────────────────────────────────────────
async function scrapeOhioRaces(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get("https://ohioraces.com/races", {
      params: {
        location: "Columbus, OH",
        radius: 30,
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      timeout: 15000,
    });
    const $ = cheerio.load(data);

    $(".race, [class*='race-item'], [class*='RaceCard'], article").each((_, el) => {
      const title = $(el).find("h2, h3, [class*='title'], [class*='name']").first().text().trim();
      const dateText = $(el).find("time, [class*='date']").first().text().trim();
      const location = $(el).find("[class*='location'], [class*='city']").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";

      if (!title) return;
      const parsedDate = new Date(dateText);
      if (isNaN(parsedDate.getTime())) return;
      if (parsedDate < now || parsedDate > sixMonthsOut) return;

      events.push({
        title,
        date: parsedDate.toISOString().split("T")[0],
        locationName: location || "Central Ohio",
        sourceUrl: link.startsWith("http") ? link : `https://ohioraces.com${link}`,
        sourceName: "OhioRaces.com",
      });
    });
  } catch (err) {
    console.warn("[races] OhioRaces error:", err);
  }
  return events;
}

export async function scrapeRaces(): Promise<RawEvent[]> {
  const [runsignup, marathon, ohioraces] = await Promise.all([
    scrapeRunSignUp(),
    scrapeColumbusMarathon(),
    scrapeOhioRaces(),
  ]);

  console.log(`[races] RunSignUp: ${runsignup.length}, Columbus Marathon: ${marathon.length}, OhioRaces: ${ohioraces.length}`);
  return [...runsignup, ...marathon, ...ohioraces];
}
