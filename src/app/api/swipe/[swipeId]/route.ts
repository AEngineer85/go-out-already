import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeWeightDelta } from "@/lib/swipePreferences";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { swipeId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { swipeId } = params;

  // Resolve user UUID from email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Load the swipe action and verify ownership
  const swipeAction = await prisma.swipeAction.findUnique({
    where: { id: swipeId },
    select: { id: true, userId: true, eventId: true, direction: true },
  });

  if (!swipeAction) {
    return NextResponse.json({ error: "Swipe not found" }, { status: 404 });
  }
  if (swipeAction.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load event to reverse weight updates
  const event = await prisma.event.findUnique({
    where: { id: swipeAction.eventId },
    select: { tags: true, sourceName: true },
  });
  if (!event) {
    // Event was deleted — just remove the swipe record
    await prisma.swipeAction.delete({ where: { id: swipeId } });
    return NextResponse.json({ ok: true });
  }

  const originalDirection = swipeAction.direction as "right" | "left";
  const reverseDirection = originalDirection === "right" ? "left" : "right";

  // Reverse all weight deltas in a transaction
  await prisma.$transaction(async (tx) => {
    for (const tag of event.tags) {
      const existing = await tx.userTagPreference.findUnique({
        where: { userId_tag: { userId: user.id, tag } },
        select: { weight: true },
      });
      if (existing) {
        const reverseDelta = computeWeightDelta(existing.weight, reverseDirection);
        await tx.userTagPreference.update({
          where: { userId_tag: { userId: user.id, tag } },
          data: {
            weight: { increment: reverseDelta },
            swipeCount: { decrement: 1 },
          },
        });
      }
    }

    const existingSource = await tx.userSourcePreference.findUnique({
      where: {
        userId_sourceName: { userId: user.id, sourceName: event.sourceName },
      },
      select: { weight: true },
    });
    if (existingSource) {
      const sourceReverseDelta = computeWeightDelta(
        existingSource.weight,
        reverseDirection
      );
      await tx.userSourcePreference.update({
        where: {
          userId_sourceName: { userId: user.id, sourceName: event.sourceName },
        },
        data: {
          weight: { increment: sourceReverseDelta },
          swipeCount: { decrement: 1 },
        },
      });
    }

    await tx.swipeAction.delete({ where: { id: swipeId } });
  });

  return NextResponse.json({ ok: true });
}
