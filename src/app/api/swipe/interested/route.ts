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

  // Include both upcoming and past events (user may want to review past saves)
  const events = actions.map((a) => a.event);

  return NextResponse.json({ events });
}
