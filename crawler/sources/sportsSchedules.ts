import axios from "axios";
import * as cheerio from "cheerio";
import type { RawEvent } from "../src/types";

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

// ── Columbus Clippers (MiLB) ──────────────────────────────────────────────────
// Uses the free MLB Stats API — no key required
async function scrapeClippers(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const start = now.toISOString().split("T")[0];
    const end = sixMonthsOut.toISOString().split("T")[0];
    const { data } = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule`,
      {
        params: {
          teamId: 455, // Columbus Clippers MiLB team ID
          sportId: 11, // Triple-A
          startDate: start,
          endDate: end,
          hydrate: "team,venue",
        },
        timeout: 10000,
      }
    );

    for (const date of data.dates ?? []) {
      for (const game of date.games ?? []) {
        const isHome = game.teams?.home?.team?.id === 455;
        if (!isHome) continue; // only home games

        const gameDate = new Date(game.gameDate);
        const title = `Columbus Clippers vs. ${game.teams?.away?.team?.name}`;
        const venue = game.venue?.name || "Huntington Park";

        events.push({
          title,
          date: gameDate.toISOString().split("T")[0],
          startTime: gameDate.toTimeString().slice(0, 5),
          locationName: venue,
          address: "330 Huntington Park Ln, Columbus, OH 43215",
          sourceUrl: "https://www.milb.com/columbus",
          sourceName: "Columbus Clippers",
        });
      }
    }
  } catch (err) {
    console.warn("[sportsSchedules] Clippers error:", err);
  }
  return events;
}

// ── Columbus Blue Jackets (NHL) ───────────────────────────────────────────────
// Uses the free NHL API — no key required
async function scrapeBlueJackets(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get(
      `https://api-web.nhle.com/v1/club-schedule-season/CBJ/now`,
      { timeout: 10000 }
    );

    for (const game of data.games ?? []) {
      const gameDate = new Date(game.gameDate);
      if (gameDate < now || gameDate > sixMonthsOut) continue;
      if (game.homeTeam?.abbrev !== "CBJ") continue; // only home games

      const opponent = game.awayTeam?.placeName?.default || "Opponent";
      events.push({
        title: `Columbus Blue Jackets vs. ${opponent}`,
        date: gameDate.toISOString().split("T")[0],
        startTime: game.startTimeUTC
          ? new Date(game.startTimeUTC).toTimeString().slice(0, 5)
          : undefined,
        locationName: "Nationwide Arena",
        address: "200 W Nationwide Blvd, Columbus, OH 43215",
        sourceUrl: "https://www.nhl.com/bluejackets/schedule",
        sourceName: "Columbus Blue Jackets",
      });
    }
  } catch (err) {
    console.warn("[sportsSchedules] Blue Jackets error:", err);
  }
  return events;
}

// ── Columbus Crew (MLS) ───────────────────────────────────────────────────────
async function scrapeCrew(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get(
      "https://www.columbuscrew.com/schedule",
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)" },
        timeout: 15000,
      }
    );
    const $ = cheerio.load(data);

    $("[class*='ScheduleTable'], [class*='schedule-game'], [class*='match']").each((_, el) => {
      const dateText = $(el).find("[class*='date'], time").first().text().trim();
      const opponent = $(el).find("[class*='opponent'], [class*='team']").first().text().trim();
      const isHome = $(el).find("[class*='home']").length > 0 ||
        $(el).text().toLowerCase().includes("nationwide");

      if (!dateText || !isHome) return;

      const parsedDate = new Date(dateText);
      if (isNaN(parsedDate.getTime())) return;
      if (parsedDate < now || parsedDate > sixMonthsOut) return;

      events.push({
        title: `Columbus Crew vs. ${opponent || "Opponent"}`,
        date: parsedDate.toISOString().split("T")[0],
        locationName: "Lower.com Field",
        address: "96 Columbus Crew Way, Columbus, OH 43211",
        sourceUrl: "https://www.columbuscrew.com/schedule",
        sourceName: "Columbus Crew",
      });
    });
  } catch (err) {
    console.warn("[sportsSchedules] Crew error:", err);
  }
  return events;
}

// ── Ohio State Athletics ──────────────────────────────────────────────────────
async function scrapeOhioState(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get(
      "https://ohiostatebuckeyes.com/calendar/",
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GoOutAlready/1.0)" },
        timeout: 15000,
      }
    );
    const $ = cheerio.load(data);

    $(".tribe-event, .event-item, [class*='EventCard']").each((_, el) => {
      const title = $(el).find("h2, h3, [class*='title']").first().text().trim();
      const dateText = $(el).find("time, [class*='date']").first().text().trim();
      const location = $(el).find("[class*='location'], [class*='venue']").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";

      if (!title || !dateText) return;
      const parsedDate = new Date(dateText);
      if (isNaN(parsedDate.getTime())) return;
      if (parsedDate < now || parsedDate > sixMonthsOut) return;

      events.push({
        title: `Ohio State: ${title}`,
        date: parsedDate.toISOString().split("T")[0],
        locationName: location || "Ohio State Campus",
        sourceUrl: link.startsWith("http") ? link : `https://ohiostatebuckeyes.com${link}`,
        sourceName: "Ohio State Athletics",
      });
    });
  } catch (err) {
    console.warn("[sportsSchedules] Ohio State error:", err);
  }
  return events;
}

export async function scrapeSportsSchedules(): Promise<RawEvent[]> {
  const [clippers, jackets, crew, osu] = await Promise.all([
    scrapeClippers(),
    scrapeBlueJackets(),
    scrapeCrew(),
    scrapeOhioState(),
  ]);

  console.log(`[sportsSchedules] Clippers: ${clippers.length}, Blue Jackets: ${jackets.length}, Crew: ${crew.length}, OSU: ${osu.length}`);
  return [...clippers, ...jackets, ...crew, ...osu];
}
