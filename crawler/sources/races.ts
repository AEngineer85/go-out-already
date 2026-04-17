import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

// ── Known Major Annual Races ───────────────────────────────────────────────────
// These races have websites that are JS-rendered (Wix, React SPA) and cannot be
// reliably scraped with Cheerio. Dates are confirmed annually and hardcoded here.
// UPDATE THESE DATES each year when the race announces its date.
const KNOWN_MAJOR_RACES: RawEvent[] = [
  // Columbus Marathon Weekend — typically 4th Sunday of October
  // 2026 date: October 25, 2026 (confirm at columbusmarathon.com each year)
  {
    title: "Nationwide Children's Columbus Marathon",
    description:
      "Annual Columbus Marathon weekend featuring full marathon (26.2 mi), half marathon (13.1 mi), and other distances through downtown Columbus.",
    date: "2026-10-25",
    startTime: "07:30",
    locationName: "Nationwide Arena / Downtown Columbus",
    address: "200 W Nationwide Blvd, Columbus, OH 43215",
    sourceUrl: "https://www.columbusmarathon.com",
    sourceName: "Columbus Marathon",
  },
  {
    title: "Nationwide Children's Columbus Half Marathon",
    description:
      "Half marathon (13.1 mi) as part of the Columbus Marathon weekend.",
    date: "2026-10-25",
    startTime: "07:30",
    locationName: "Nationwide Arena / Downtown Columbus",
    address: "200 W Nationwide Blvd, Columbus, OH 43215",
    sourceUrl: "https://www.columbusmarathon.com",
    sourceName: "Columbus Marathon",
  },
  // OhioHealth Capital City Half & Quarter Marathon — typically late April
  // 2026 date: April 25, 2026 (confirmed at capitalcityhalfmarathon.com)
  {
    title: "OhioHealth Capital City Half Marathon",
    description:
      "Annual half marathon (13.1 mi) and quarter marathon (6.55 mi) through downtown Columbus. Voted #2 Best Half Marathon in the Nation by USA Today.",
    date: "2026-04-25",
    startTime: "08:00",
    locationName: "Columbus Commons",
    address: "160 S High St, Columbus, OH 43215",
    sourceUrl: "https://capitalcityhalfmarathon.com",
    sourceName: "Capital City Half Marathon",
  },
  {
    title: "OhioHealth Capital City Quarter Marathon",
    description: "Quarter marathon (6.55 mi) as part of the Capital City Half Marathon weekend.",
    date: "2026-04-25",
    startTime: "08:00",
    locationName: "Columbus Commons",
    address: "160 S High St, Columbus, OH 43215",
    sourceUrl: "https://capitalcityhalfmarathon.com",
    sourceName: "Capital City Half Marathon",
  },
  // ── Memorial Tournament (PGA Tour) at Muirfield Village ──────────────────
  // Held annually in late May / early June in Dublin, OH.
  // 2026 dates: May 28–31 — verify each year at memorial.org or pgatour.com
  {
    title: "Memorial Tournament presented by Workday — Round 1",
    description:
      "PGA Tour's Memorial Tournament at Muirfield Village Golf Club, one of golf's most prestigious events. Round 1 (Thursday).",
    date: "2026-05-28",
    startTime: "08:00",
    locationName: "Muirfield Village Golf Club",
    address: "5750 Memorial Dr, Dublin, OH 43017",
    sourceUrl: "https://www.memorial.org",
    sourceName: "Memorial Tournament",
  },
  {
    title: "Memorial Tournament presented by Workday — Round 2",
    description:
      "PGA Tour's Memorial Tournament at Muirfield Village Golf Club. Round 2 (Friday).",
    date: "2026-05-29",
    startTime: "08:00",
    locationName: "Muirfield Village Golf Club",
    address: "5750 Memorial Dr, Dublin, OH 43017",
    sourceUrl: "https://www.memorial.org",
    sourceName: "Memorial Tournament",
  },
  {
    title: "Memorial Tournament presented by Workday — Round 3",
    description:
      "PGA Tour's Memorial Tournament at Muirfield Village Golf Club. Round 3 (Saturday).",
    date: "2026-05-30",
    startTime: "08:00",
    locationName: "Muirfield Village Golf Club",
    address: "5750 Memorial Dr, Dublin, OH 43017",
    sourceUrl: "https://www.memorial.org",
    sourceName: "Memorial Tournament",
  },
  {
    title: "Memorial Tournament presented by Workday — Final Round",
    description:
      "PGA Tour's Memorial Tournament at Muirfield Village Golf Club. Final Round (Sunday). Hosted by Jack Nicklaus.",
    date: "2026-05-31",
    startTime: "10:00",
    locationName: "Muirfield Village Golf Club",
    address: "5750 Memorial Dr, Dublin, OH 43017",
    sourceUrl: "https://www.memorial.org",
    sourceName: "Memorial Tournament",
  },
].filter((r) => {
  const d = new Date(r.date);
  return d >= now && d <= sixMonthsOut;
});

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
// Site is Wix (JS-rendered) — cannot be scraped with Cheerio or Playwright.
// Playwright was removed to prevent OOM crashes on the Render free tier.
// KNOWN_MAJOR_RACES above handles reliable coverage with hardcoded confirmed dates.
async function scrapeColumbusMarathon(): Promise<RawEvent[]> {
  return [];
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

// ── Capital City Half Marathon ────────────────────────────────────────────────
// Simple static site — grab any schema.org or date info from homepage.
// The KNOWN_MAJOR_RACES entry above is the reliable fallback.
async function scrapeCapitalCityHalf(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get("https://capitalcityhalfmarathon.com", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)" },
      timeout: 10000,
    });
    const $ = cheerio.load(data);

    // Try schema.org JSON-LD first
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const type = item["@type"];
          if (typeof type === "string" && type.includes("Event") && item.startDate) {
            const d = new Date(item.startDate);
            if (!isNaN(d.getTime()) && d >= now && d <= sixMonthsOut) {
              events.push({
                title: item.name || "OhioHealth Capital City Half Marathon",
                description: item.description,
                date: d.toISOString().split("T")[0],
                startTime: "08:00",
                locationName: "Columbus Commons",
                address: "160 S High St, Columbus, OH 43215",
                sourceUrl: "https://capitalcityhalfmarathon.com",
                sourceName: "Capital City Half Marathon",
              });
            }
          }
        }
      } catch { /* skip malformed JSON */ }
    });
  } catch (err) {
    console.warn("[races] Capital City Half error:", err);
  }
  return events;
}

export async function scrapeRaces(): Promise<RawEvent[]> {
  const [runsignup, marathon, ohioraces, capitalCity] = await Promise.all([
    scrapeRunSignUp(),
    scrapeColumbusMarathon(),
    scrapeOhioRaces(),
    scrapeCapitalCityHalf(),
  ]);

  // Merge dynamic results with hardcoded known races.
  // Deduplication in index.ts will handle any overlaps via fingerprintHash.
  const all = [...KNOWN_MAJOR_RACES, ...runsignup, ...marathon, ...ohioraces, ...capitalCity];

  console.log(
    `[races] Known: ${KNOWN_MAJOR_RACES.length}, RunSignUp: ${runsignup.length}, Columbus Marathon: ${marathon.length}, OhioRaces: ${ohioraces.length}, Capital City: ${capitalCity.length}`
  );
  return all;
}
