import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [interestedCount, swipedIds, totalUpcoming] = await Promise.all([
    prisma.swipeAction.count({
      where: { userId: user.id, direction: "right" },
    }),
    prisma.swipeAction.findMany({
      where: { userId: user.id },
      select: { eventId: true },
    }),
    prisma.event.count({
      where: { archived: false, date: { gte: today } },
    }),
  ]);

  const unswipedCount = Math.max(0, totalUpcoming - swipedIds.length);

  return NextResponse.json({ interestedCount, unswipedCount });
}
