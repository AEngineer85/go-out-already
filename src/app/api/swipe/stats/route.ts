import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, blockedKeywords: true },
  });
  if (!user) {
    return NextResponse.json({ interestedCount: 0 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build keyword exclusion conditions for each blocked keyword
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

  const [interestedCount, swipedIds, totalUpcoming] = await Promise.all([
    prisma.swipeAction.count({
      where: { userId: user.id, direction: "right" },
    }),
    prisma.swipeAction.findMany({
      where: { userId: user.id },
      select: { eventId: true },
    }),
    prisma.event.count({
      where: {
        archived: false,
        date: { gte: today },
        ...(keywordExclusions.length > 0 ? { AND: keywordExclusions } : {}),
      },
    }),
  ]);

  const unswipedCount = Math.max(0, totalUpcoming - swipedIds.length);

  return NextResponse.json({ interestedCount, unswipedCount });
}
