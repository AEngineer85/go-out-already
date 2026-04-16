import axios from "axios";
import type { RawEvent } from "../src/types";
import { toEasternHHMM, toEasternDateStr } from "../src/timeUtils";

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
          teamId: 445, // Columbus Clippers MiLB team ID
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
        // Hard check: only home games at Huntington Park
        if (game.teams?.home?.team?.id !== 445) continue;

        const gameDate = new Date(game.gameDate);
        const opponent = game.teams?.away?.team?.name ?? "Opponent";
        const venue = game.venue?.name || "Huntington Park";

        events.push({
          title: `Columbus Clippers vs. ${opponent}`,
          date: toEasternDateStr(gameDate),
          startTime: toEasternHHMM(gameDate),
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
      // Hard check: only home games at Nationwide Arena
      if (game.homeTeam?.abbrev !== "CBJ") continue;

      const gameDate = new Date(game.gameDate);
      if (gameDate < now || gameDate > sixMonthsOut) continue;

      const opponent =
        game.awayTeam?.placeName?.default ||
        game.awayTeam?.commonName?.default ||
        "Opponent";

      events.push({
        title: `Columbus Blue Jackets vs. ${opponent}`,
        date: toEasternDateStr(gameDate),
        startTime: game.startTimeUTC
          ? toEasternHHMM(new Date(game.startTimeUTC))
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
// Uses the ESPN public API — more reliable than scraping the JS-rendered site
async function scrapeCrew(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/183/schedule",
      { timeout: 10000 }
    );

    for (const event of data.events ?? []) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      // Hard check: Columbus must be the home competitor
      const homeTeam = competition.competitors?.find(
        (c: { homeAway: string }) => c.homeAway === "home"
      );
      const isColumbusCrew =
        homeTeam?.team?.abbreviation === "CLB" ||
        homeTeam?.team?.displayName?.toLowerCase().includes("columbus");
      if (!isColumbusCrew) continue;

      const gameDate = new Date(event.date);
      if (isNaN(gameDate.getTime())) continue;
      if (gameDate < now || gameDate > sixMonthsOut) continue;

      const awayTeam = competition.competitors?.find(
        (c: { homeAway: string }) => c.homeAway === "away"
      );
      const opponent = awayTeam?.team?.displayName ?? "Opponent";

      events.push({
        title: `Columbus Crew vs. ${opponent}`,
        date: toEasternDateStr(gameDate),
        startTime: toEasternHHMM(gameDate),
        locationName: "Lower.com Field",
        address: "96 Columbus Crew Way, Columbus, OH 43211",
        sourceUrl: "https://www.columbuscrew.com/schedule",
        sourceName: "Columbus Crew",
      });
    }
  } catch (err) {
    console.warn("[sportsSchedules] Crew error:", err);
  }
  return events;
}

// ── Ohio State Football ───────────────────────────────────────────────────────
// Uses the ESPN public API (team ID 194 = Ohio State) — covers all home games
// including the spring game/scrimmage which the cheerio-based scraper missed.
async function scrapeOhioState(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  try {
    const { data } = await axios.get(
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/194/schedule",
      { timeout: 10000 }
    );

    for (const event of data.events ?? []) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const gameDate = new Date(event.date);
      if (isNaN(gameDate.getTime())) continue;
      if (gameDate < now || gameDate > sixMonthsOut) continue;

      const homeTeam = competition.competitors?.find(
        (c: { homeAway: string }) => c.homeAway === "home"
      );
      const isOSUHome =
        homeTeam?.team?.id === "194" ||
        homeTeam?.team?.abbreviation?.toLowerCase() === "osu" ||
        homeTeam?.team?.displayName?.toLowerCase().includes("ohio state");
      if (!isOSUHome) continue;

      const awayTeam = competition.competitors?.find(
        (c: { homeAway: string }) => c.homeAway === "away"
      );
      const opponent = awayTeam?.team?.displayName ?? null;
      const venue = competition.venue?.fullName || "Ohio Stadium";

      // Detect spring game / scrimmage (no real opponent, or ESPN marks it as a scrimmage)
      const isSpringGame =
        !opponent ||
        event.name?.toLowerCase().includes("spring") ||
        event.shortName?.toLowerCase().includes("spring") ||
        competition.notes?.some((n: { headline?: string }) =>
          n.headline?.toLowerCase().includes("spring")
        );

      const title = isSpringGame
        ? "Ohio State Spring Game"
        : `Ohio State vs. ${opponent}`;

      events.push({
        title,
        date: toEasternDateStr(gameDate),
        startTime: toEasternHHMM(gameDate),
        locationName: venue,
        address: "411 Woody Hayes Dr, Columbus, OH 43210",
        sourceUrl: "https://www.ohiostatebuckeyes.com/sports/football/schedule",
        sourceName: "Ohio State Football",
      });
    }
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

  console.log(
    `[sportsSchedules] Clippers: ${clippers.length}, Blue Jackets: ${jackets.length}, Crew: ${crew.length}, OSU: ${osu.length}`
  );
  return [...clippers, ...jackets, ...crew, ...osu];
}
