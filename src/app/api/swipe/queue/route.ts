import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computePersonalScore,
  COLD_START_THRESHOLD,
} from "@/lib/swipePreferences";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  // Resolve user UUID from email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Count total swipes for cold-start detection
  const totalSwipes = await prisma.swipeAction.count({
    where: { userId: user.id },
  });

  // Load user's learned weights (empty maps = cold start)
  const [tagPrefs, sourcePrefs] = await Promise.all([
    prisma.userTagPreference.findMany({
      where: { userId: user.id },
      select: { tag: true, weight: true },
    }),
    prisma.userSourcePreference.findMany({
      where: { userId: user.id },
      select: { sourceName: true, weight: true },
    }),
  ]);

  const tagWeights = new Map(tagPrefs.map((p) => [p.tag, p.weight]));
  const sourceWeights = new Map(
    sourcePrefs.map((p) => [p.sourceName, p.weight])
  );

  // Get all already-swiped event IDs for this user
  const swipedActions = await prisma.swipeAction.findMany({
    where: { userId: user.id },
    select: { eventId: true },
  });
  const swipedEventIds = swipedActions.map((a) => a.eventId);

  // Date window: today → 8 weeks out (wider than main feed for discovery)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eightWeeksOut = new Date(today.getTime() + 56 * 24 * 60 * 60 * 1000);

  // Fetch all candidate events not yet swiped
  const candidates = await prisma.event.findMany({
    where: {
      archived: false,
      date: {
        gte: today,
        lte: eightWeeksOut,
      },
      ...(swipedEventIds.length > 0
        ? { id: { notIn: swipedEventIds } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      startTime: true,
      endTime: true,
      locationName: true,
      address: true,
      tags: true,
      sourceName: true,
      additionalSources: true,
      relevanceScore: true,
      addedToCalendar: true,
      crawledAt: true,
    },
  });

  // Score and sort — use personal scores only after cold-start threshold
  const isColdStart = totalSwipes < COLD_START_THRESHOLD;

  const scored = candidates.map((event) => ({
    event,
    score: isColdStart
      ? event.relevanceScore
      : computePersonalScore(
          { ...event, date: new Date(event.date) },
          tagWeights,
          sourceWeights
        ),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: sooner events first
    return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
  });

  const page = scored.slice(0, limit).map((s) => s.event);
  const nextCursor =
    scored.length > limit ? scored[limit - 1].event.id : null;

  return NextResponse.json({ events: page, nextCursor });
}
