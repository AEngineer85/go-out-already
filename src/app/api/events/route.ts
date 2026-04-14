import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { distanceMiles } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tags = searchParams.getAll("tags");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const radius = searchParams.get("radius");
  const recentlyAdded = searchParams.get("recentlyAdded") === "true";
  const hideAdded = searchParams.get("hideAdded") === "true";

  const now = new Date();
  const sixMonthsOut = new Date(now);
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);

  const where: Record<string, unknown> = {
    archived: false,
    date: {
      gte: dateFrom ? new Date(dateFrom) : now,
      lte: dateTo ? new Date(dateTo) : sixMonthsOut,
    },
  };

  if (tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (hideAdded) {
    where.addedToCalendar = false;
  }

  if (recentlyAdded) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    where.crawledAt = { gte: sevenDaysAgo };
  }

  let events = await prisma.event.findMany({
    where,
    orderBy: { date: "asc" },
  });

  if (radius) {
    const radiusMiles = parseFloat(radius);
    const COLUMBUS_LAT = 39.9612;
    const COLUMBUS_LNG = -82.9988;

    events = events.filter((event) => {
      if (event.lat == null || event.lng == null) return true;
      return (
        distanceMiles(COLUMBUS_LAT, COLUMBUS_LNG, event.lat, event.lng) <=
        radiusMiles
      );
    });
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newCount = events.filter((e) => e.crawledAt >= sevenDaysAgo).length;

  return NextResponse.json({ events, newCount });
}
