import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { distanceMiles } from "@/lib/geocode";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      blockedKeywords: true,
      homeLat: true,
      homeLng: true,
      defaultRadiusMiles: true,
    },
  });
  if (!user) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build keyword exclusion conditions
  const blockedKeywords = user.blockedKeywords ?? [];
  const keywordExclusions: Prisma.EventWhereInput[] = blockedKeywords
    .filter((kw) => kw.trim())
    .map((kw) => ({
      NOT: {
        OR: [
          { title: { contains: kw.trim(), mode: Prisma.QueryMode.insensitive } },
          { description: { contains: kw.trim(), mode: Prisma.QueryMode.insensitive } },
          { locationName: { contains: kw.trim(), mode: Prisma.QueryMode.insensitive } },
        ],
      },
    }));

  const [interestedCount, swipedIds, upcomingEvents] = await Promise.all([
    prisma.swipeAction.count({
      where: { userId: user.id, direction: "right" },
    }),
    prisma.swipeAction.findMany({
      where: { userId: user.id },
      select: { eventId: true },
    }),
    // Fetch enough fields to apply the same in-memory radius filter as the queue
    prisma.event.findMany({
      where: {
        archived: false,
        date: { gte: today },
        ...(keywordExclusions.length > 0 ? { AND: keywordExclusions } : {}),
      },
      select: { id: true, lat: true, lng: true },
    }),
  ]);

  // Apply radius filter (same logic as queue route)
  const radiusFiltered =
    user.homeLat != null && user.homeLng != null
      ? upcomingEvents.filter((e) => {
          if (e.lat == null || e.lng == null) return false;
          return (
            distanceMiles(user.homeLat!, user.homeLng!, e.lat, e.lng) <=
            (user.defaultRadiusMiles ?? 25)
          );
        })
      : upcomingEvents;

  const swipedSet = new Set(swipedIds.map((s) => s.eventId));
  const unswipedCount = radiusFiltered.filter((e) => !swipedSet.has(e.id)).length;

  return NextResponse.json({ interestedCount, unswipedCount });
}
