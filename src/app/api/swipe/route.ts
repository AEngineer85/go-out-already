import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeWeightDelta } from "@/lib/swipePreferences";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { eventId, direction } = body as {
    eventId: string;
    direction: "right" | "left";
  };

  if (!eventId || (direction !== "right" && direction !== "left")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Resolve the database UUID from the session email (more reliable than googleId/token.sub)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Load event tags and source for preference updates
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tags: true, sourceName: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Run everything in a single transaction
  const swipeAction = await prisma.$transaction(async (tx) => {
    // Upsert the swipe decision (re-swipe overwrites direction)
    const action = await tx.swipeAction.upsert({
      where: { userId_eventId: { userId: user.id, eventId } },
      update: { direction, createdAt: new Date() },
      create: { userId: user.id, eventId, direction },
    });

    // Update tag preference weights (EMA)
    for (const tag of event.tags) {
      const existing = await tx.userTagPreference.findUnique({
        where: { userId_tag: { userId: user.id, tag } },
        select: { weight: true },
      });
      const currentWeight = existing?.weight ?? 0;
      const delta = computeWeightDelta(currentWeight, direction);

      await tx.userTagPreference.upsert({
        where: { userId_tag: { userId: user.id, tag } },
        update: {
          weight: { increment: delta },
          swipeCount: { increment: 1 },
        },
        create: {
          userId: user.id,
          tag,
          weight: delta,
          swipeCount: 1,
        },
      });
    }

    // Update source preference weight (EMA)
    const existingSource = await tx.userSourcePreference.findUnique({
      where: {
        userId_sourceName: { userId: user.id, sourceName: event.sourceName },
      },
      select: { weight: true },
    });
    const currentSourceWeight = existingSource?.weight ?? 0;
    const sourceDelta = computeWeightDelta(currentSourceWeight, direction);

    await tx.userSourcePreference.upsert({
      where: {
        userId_sourceName: { userId: user.id, sourceName: event.sourceName },
      },
      update: {
        weight: { increment: sourceDelta },
        swipeCount: { increment: 1 },
      },
      create: {
        userId: user.id,
        sourceName: event.sourceName,
        weight: sourceDelta,
        swipeCount: 1,
      },
    });

    return action;
  });

  return NextResponse.json({
    swipeId: swipeAction.id,
    direction: swipeAction.direction,
  });
}
