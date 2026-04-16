/**
 * One-time cleanup: delete duplicate events (same title+date+locationName),
 * keeping the most recently crawled copy, then re-fingerprint all remaining
 * events using the current normalization algorithm.
 *
 * Run with:
 *   DATABASE_URL="..." npx ts-node --project tsconfig.json src/dedup-cleanup.ts
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function normLocation(location: string): string {
  const firstPart = location.split(",")[0];
  return norm(firstPart)
    .replace(/\b(columbus|ohio|oh|usa)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFingerprint(title: string, date: string, locationName: string): string {
  const normalized = [norm(title), date, normLocation(locationName)].join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function main() {
  // Step 1: find all duplicate groups
  const dupeGroups = await prisma.$queryRaw<
    { title: string; date: Date; locationName: string; ids: string[] }[]
  >`
    SELECT title, date, "locationName",
           array_agg(id::text ORDER BY "crawledAt" DESC) as ids
    FROM "Event"
    GROUP BY title, date, "locationName"
    HAVING COUNT(*) > 1
  `;

  console.log(`Found ${dupeGroups.length} duplicate groups.`);

  let deleted = 0;
  for (const group of dupeGroups) {
    // ids is ordered newest-first; delete all but the first (newest)
    const toDelete = group.ids.slice(1);
    await prisma.event.deleteMany({ where: { id: { in: toDelete } } });
    deleted += toDelete.length;
  }

  console.log(`Deleted ${deleted} duplicate events.`);

  // Step 2: re-fingerprint all remaining events
  const events = await prisma.event.findMany({
    select: { id: true, title: true, date: true, locationName: true },
  });

  console.log(`Re-fingerprinting ${events.length} events...`);

  const seenHashes = new Map<string, string>(); // hash → id of first event that claimed it
  const toDeleteAfterReprint: string[] = [];
  let updated = 0;

  for (const event of events) {
    const dateStr = event.date.toISOString().split("T")[0];
    const newHash = buildFingerprint(event.title, dateStr, event.locationName);

    if (seenHashes.has(newHash)) {
      // Another event already claimed this normalized hash — this is a dupe
      toDeleteAfterReprint.push(event.id);
      continue;
    }

    seenHashes.set(newHash, event.id);
    await prisma.event.update({
      where: { id: event.id },
      data: { fingerprintHash: newHash },
    }).catch(async () => {
      // Unique constraint: a different existing event already has this hash
      toDeleteAfterReprint.push(event.id);
    });
    updated++;
  }

  if (toDeleteAfterReprint.length > 0) {
    console.log(`Deleting ${toDeleteAfterReprint.length} additional norm-dupes...`);
    await prisma.event.deleteMany({ where: { id: { in: toDeleteAfterReprint } } });
  }

  console.log(`Re-fingerprinted ${updated} events.`);
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
