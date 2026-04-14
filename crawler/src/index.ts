import { PrismaClient } from "@prisma/client";
import { buildFingerprint } from "./fingerprint";
import { assignTags, computeRelevanceScore } from "./tagging";
import { geocodeAddress } from "./geocode";
import { scrapeICSFeeds } from "../sources/icsFeeds";
import { scrapeRSSFeeds } from "../sources/rssFeeds";
import { scrapeExperienceColumbus } from "../sources/experienceColumbus";
import { scrapeColumbusRecParks } from "../sources/columbusRecParks";
import { scrapeSportsSchedules } from "../sources/sportsSchedules";
import { scrapeRaces } from "../sources/races";
import { scrapeVenueList } from "../sources/schemaOrgScraper";
import type { RawEvent } from "./types";

const prisma = new PrismaClient();

interface SourceResult {
  name: string;
  events: RawEvent[];
  error?: string;
}

async function runSource(
  name: string,
  fn: () => Promise<RawEvent[] | { events: RawEvent[]; errors: string[] }>
): Promise<SourceResult> {
  try {
    const result = await fn();
    if (Array.isArray(result)) {
      return { name, events: result };
    } else {
      return { name, events: result.events, error: result.errors.join("; ") };
    }
  } catch (err) {
    return { name, events: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runCrawl(): Promise<{
  eventsFound: number;
  eventsNew: number;
  sourcesTotal: number;
  sourcesSuccess: number;
  errors: string[];
}> {
  console.log("[crawler] Starting crawl at", new Date().toISOString());

  const crawlLog = await prisma.crawlLog.create({
    data: { startedAt: new Date() },
  });

  const sources: SourceResult[] = [];

  // Run all sources (sequential to avoid rate limits)
  const sourceRunners = [
    () => runSource("ICS Feeds", scrapeICSFeeds),
    () => runSource("RSS Feeds", scrapeRSSFeeds),
    () => runSource("Experience Columbus", scrapeExperienceColumbus),
    () => runSource("Columbus Rec & Parks", scrapeColumbusRecParks),
    () => runSource("Sports Schedules", scrapeSportsSchedules),
    () => runSource("Races", scrapeRaces),
    () => runSource("Venue List (schema.org)", scrapeVenueList),
  ];

  for (const runner of sourceRunners) {
    const result = await runner();
    sources.push(result);
    console.log(`[crawler] ${result.name}: ${result.events.length} events${result.error ? ` (error: ${result.error})` : ""}`);
  }

  const allErrors = sources.flatMap((s) => (s.error ? [`${s.name}: ${s.error}`] : []));
  const sourcesSuccess = sources.filter((s) => !s.error || s.events.length > 0).length;

  // Deduplicate across sources by fingerprint
  const fingerprintMap = new Map<string, RawEvent & { extraSources: string[] }>();

  for (const source of sources) {
    for (const event of source.events) {
      if (!event.title || !event.date || !event.locationName) continue;

      const fp = buildFingerprint(event.title, event.date, event.locationName);

      if (fingerprintMap.has(fp)) {
        const existing = fingerprintMap.get(fp)!;
        if (!existing.extraSources.includes(event.sourceName)) {
          existing.extraSources.push(event.sourceName);
        }
      } else {
        fingerprintMap.set(fp, { ...event, extraSources: [] });
      }
    }
  }

  const eventsFound = fingerprintMap.size;
  let eventsNew = 0;

  // Upsert events
  for (const [fp, event] of fingerprintMap) {
    try {
      const date = new Date(event.date);
      if (isNaN(date.getTime())) continue;

      const tags = assignTags(event.title, event.description);
      const additionalSources = event.extraSources.map((s) => ({ sourceName: s }));

      // Geocode if needed
      let lat: number | undefined;
      let lng: number | undefined;
      if (event.address) {
        const geo = await geocodeAddress(`${event.address}, Ohio`);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      } else if (event.locationName && !event.locationName.toLowerCase().includes("columbus")) {
        const geo = await geocodeAddress(`${event.locationName}, Ohio`);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      const relevanceScore = computeRelevanceScore({
        tags,
        sourceUrl: event.sourceUrl,
        hasMultipleSources: event.extraSources.length > 0,
        hasTime: !!event.startTime,
        hasLocation: !!event.locationName,
        hasDescription: !!event.description,
        date,
      });

      const existing = await prisma.event.findUnique({ where: { fingerprintHash: fp } });

      if (existing) {
        // Update additional sources if new ones found
        const existingAdditional = (existing.additionalSources as { sourceName: string }[] | null) ?? [];
        const allAdditional = [
          ...existingAdditional,
          ...additionalSources.filter(
            (s) => !existingAdditional.some((e) => e.sourceName === s.sourceName)
          ),
        ];
        await prisma.event.update({
          where: { fingerprintHash: fp },
          data: {
            additionalSources: allAdditional,
            relevanceScore,
          },
        });
      } else {
        await prisma.event.create({
          data: {
            title: event.title,
            description: event.description,
            date,
            startTime: event.startTime,
            endTime: event.endTime,
            locationName: event.locationName,
            address: event.address,
            lat,
            lng,
            sourceUrl: event.sourceUrl,
            sourceName: event.sourceName,
            additionalSources,
            tags,
            fingerprintHash: fp,
            relevanceScore,
          },
        });
        eventsNew++;
      }
    } catch (err) {
      console.error("[crawler] Failed to upsert event:", err);
    }
  }

  // Archive events older than 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  await prisma.event.updateMany({
    where: { date: { lt: sixMonthsAgo }, archived: false },
    data: { archived: true },
  });

  const success = eventsFound > 0;

  await prisma.crawlLog.update({
    where: { id: crawlLog.id },
    data: {
      completedAt: new Date(),
      sourcesTotal: sources.length,
      sourcesSuccess,
      eventsFound,
      eventsNew,
      errors: allErrors,
      success,
    },
  });

  console.log(`[crawler] Done. Found ${eventsFound}, new ${eventsNew}`);

  return { eventsFound, eventsNew, sourcesTotal: sources.length, sourcesSuccess, errors: allErrors };
}

// Run directly if called as script
if (require.main === module) {
  runCrawl()
    .then((result) => {
      console.log("[crawler] Result:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[crawler] Fatal error:", err);
      process.exit(1);
    });
}
