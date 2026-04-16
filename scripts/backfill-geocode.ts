/**
 * Backfill lat/lng for all events that currently have null coordinates.
 * Run once with: npx ts-node --project tsconfig.json scripts/backfill-geocode.ts
 *
 * Uses Photon (photon.komoot.io) — free, no API key required.
 */

import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { countrycode?: string };
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data } = await axios.get<{ features: PhotonFeature[] }>(
      "https://photon.komoot.io/api/",
      { params: { q: query, limit: 1, lang: "en" }, timeout: 8000 }
    );
    const features = data.features ?? [];
    const f =
      features.find((f) => !f.properties.countrycode || f.properties.countrycode === "US") ??
      features[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const events = await prisma.event.findMany({
    where: { lat: null },
    select: { id: true, locationName: true, title: true },
  });

  console.log(`Found ${events.length} events without coordinates.`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const query = event.locationName
      ? `${event.locationName}, Ohio`
      : `${event.title}, Ohio`;

    const coords = await geocode(query);

    if (coords) {
      await prisma.event.update({
        where: { id: event.id },
        data: { lat: coords.lat, lng: coords.lng },
      });
      updated++;
      if (updated % 25 === 0) {
        console.log(`  ${updated} updated, ${failed} failed, ${events.length - i - 1} remaining...`);
      }
    } else {
      failed++;
    }

    await sleep(350); // be polite to Photon
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
