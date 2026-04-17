import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all right-swipes including the full event, most recently saved first
  const actions = await prisma.swipeAction.findMany({
    where: {
      userId: user.id,
      direction: "right",
    },
    include: {
      event: {
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
          addedToCalendar: true,
          crawledAt: true,
          sourceUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Only return upcoming/today's events — past events drop off automatically
  const events = actions
    .map((a) => a.event)
    .filter((e) => new Date(e.date) >= today);

  // Load friend matches: for each event, find which friends also right-swiped it
  const friendships = await prisma.friendship.findMany({
    where: { userId: user.id },
    select: { friendId: true },
  });
  const friendIds = friendships.map((f) => f.friendId);

  const friendMatchMap = new Map<string, { name: string | null; image: string | null }[]>();

  if (friendIds.length > 0 && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const friendActions = await prisma.swipeAction.findMany({
      where: {
        eventId: { in: eventIds },
        userId: { in: friendIds },
        direction: "right",
      },
      include: {
        user: { select: { name: true, image: true } },
      },
    });

    for (const action of friendActions) {
      const existing = friendMatchMap.get(action.eventId) ?? [];
      existing.push({ name: action.user.name, image: action.user.image });
      friendMatchMap.set(action.eventId, existing);
    }
  }

  const eventsWithFriends = events.map((e) => ({
    ...e,
    friendMatches: friendMatchMap.get(e.id) ?? [],
  }));

  return NextResponse.json({ events: eventsWithFriends });
}
