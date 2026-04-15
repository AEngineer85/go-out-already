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

  const interestedCount = await prisma.swipeAction.count({
    where: { userId: user.id, direction: "right" },
  });

  return NextResponse.json({ interestedCount });
}
