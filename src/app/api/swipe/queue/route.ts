import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { distanceMiles, geocodeAddress } from "@/lib/geocode";
import {
  computePersonalScore,
  computeKeywordBoost,
  shouldBlockByTime,
  shouldBlockByKeyword,
  COLD_START_THRESHOLD,
  RECENCY_BIAS_MULTIPLIERS,
} from "@/lib/swipePreferences";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  // Resolve user + all discovery prefs in one query
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      defaultRadiusMiles: true,
      homeLat: true,
      homeLng: true,
      homeZipCode: true,
      recencyBias: true,
      blockWorkHours: true,
      workStartHour: true,
      workEndHour: true,
      blockLateWeeknights: true,
      weeknightCutoffHour: true,
      weekendsOnly: true,
      boostFreeEvents: true,
      maxWeeksAhead: true,
      favoriteKeywords: true,
      blockedKeywords: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If zip was saved but geocoding previously failed, resolve it now and persist
  if (user.homeLat == null && user.homeZipCode) {
    const coords = await geocodeAddress(`${user.homeZipCode}, USA`);
    if (coords) {
      await prisma.user.update({
        where: { id: user.id },
        data: { homeLat: coords.lat, homeLng: coords.lng },
      });
      user.homeLat = coords.lat;
      user.homeLng = coords.lng;
    }
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

  // Date window: today → maxWeeksAhead weeks out
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeksAhead = user.maxWeeksAhead ?? 8;
  const windowEnd = new Date(
    today.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000
  );

  // Fetch all candidate events not yet swiped
  const candidates = await prisma.event.findMany({
    where: {
      archived: false,
      date: { gte: today, lte: windowEnd },
      ...(swipedEventIds.length > 0 ? { id: { notIn: swipedEventIds } } : {}),
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
      lat: true,
      lng: true,
      tags: true,
      sourceName: true,
      sourceUrl: true,
      additionalSources: true,
      relevanceScore: true,
      addedToCalendar: true,
      crawledAt: true,
    },
  });

  // ── Apply hard filters ────────────────────────────────────────────────────

  // 1. Location radius (only if user has set a home location)
  const radiusFiltered =
    user.homeLat != null && user.homeLng != null
      ? candidates.filter((e) => {
          if (e.lat == null || e.lng == null) return false; // unknown location → exclude when radius is set
          return (
            distanceMiles(user.homeLat!, user.homeLng!, e.lat, e.lng) <=
            (user.defaultRadiusMiles ?? 25)
          );
        })
      : candidates;

  // 2. Time blocks (work hours, late weeknights, weekends-only)
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

  // 3. Blocked keywords (hard exclude — user never wants to see these)
  const blockedKeywords = user.blockedKeywords ?? [];
  const keywordFiltered = timeFiltered.filter(
    (e) => !shouldBlockByKeyword(e, blockedKeywords)
  );

  // ── Score and sort ────────────────────────────────────────────────────────

  const isColdStart = totalSwipes < COLD_START_THRESHOLD;
  const recencyBiasMultiplier =
    RECENCY_BIAS_MULTIPLIERS[user.recencyBias ?? "moderate"] ?? 1.0;
  const favoriteKeywords = user.favoriteKeywords ?? [];

  const scored = keywordFiltered.map((event) => ({
    event,
    score: isColdStart
      ? // Cold start: global relevance + keyword boost (manual prefs apply immediately)
        event.relevanceScore +
        computeKeywordBoost(
          {
            title: event.title,
            description: event.description,
            locationName: event.locationName,
          },
          favoriteKeywords
        )
      : computePersonalScore(
          { ...event, date: new Date(event.date) },
          tagWeights,
          sourceWeights,
          {
            recencyBiasMultiplier,
            favoriteKeywords,
            boostFreeEvents: user.boostFreeEvents,
          }
        ),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: sooner events first
    return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
  });

  const page = scored.slice(0, limit).map((s) => ({
    ...s.event,
    // Include distance from home if user has a home location and event has coords
    distanceMiles:
      user.homeLat != null && user.homeLng != null &&
      s.event.lat != null && s.event.lng != null
        ? Math.round(distanceMiles(user.homeLat, user.homeLng, s.event.lat, s.event.lng) * 10) / 10
        : null,
  }));
  const nextCursor =
    scored.length > limit ? scored[limit - 1].event.id : null;

  return NextResponse.json({ events: page, nextCursor });
}
