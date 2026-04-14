import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      archived: false,
      date: {
        gte: now,
        lte: sevenDaysOut,
      },
    },
    orderBy: { relevanceScore: "desc" },
    take: 8,
  });

  return NextResponse.json({ events });
}
