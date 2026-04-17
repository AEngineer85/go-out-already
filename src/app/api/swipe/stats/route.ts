import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { distanceMiles } from "@/lib/geocode";
import { shouldBlockByTime } from "@/lib/swipePreferences";

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
      maxWeeksAhead: true,
      blockWorkHours: true,
      workStartHour: true,
      workEndHour: true,
      blockLateWeeknights: true,
      weeknightCutoffHour: true,
      weekendsOnly: true,
    },
  });
  if (!user) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Apply the same maxWeeksAhead window as the queue route
  const weeksAhead = user.maxWeeksAhead ?? 8;
  const windowEnd = new Date(today.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000);

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
    prisma.event.findMany({
      where: {
        archived: false,
        date: { gte: today, lte: windowEnd },
        ...(keywordExclusions.length > 0 ? { AND: keywordExclusions } : {}),
      },
      select: { id: true, lat: true, lng: true, date: true, startTime: true },
    }),
  ]);

  // Apply radius filter
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

  // Apply time block filters (same logic as queue route)
  const timeFiltered = radiusFiltered.filter(
    (e) =>
      !shouldBlockByTime(
        { date: new Date(e.date), startTime: e.startTime },
        {
          blockWorkHours: user.blockWorkHours,
          workStartHour: user.workStartHour,
          workEndHour: user.workEndHour,
          blockLateWeeknights: user.blockLateWeeknights,
          weeknightCutoffHour: user.weeknightCutoffHour,
          weekendsOnly: user.weekendsOnly,
        }
      )
  );

  const swipedSet = new Set(swipedIds.map((s) => s.eventId));
  const unswipedCount = timeFiltered.filter((e) => !swipedSet.has(e.id)).length;

  return NextResponse.json({ interestedCount, unswipedCount });
}
