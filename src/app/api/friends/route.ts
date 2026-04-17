import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/friends — list the current user's friends */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const friendships = await prisma.friendship.findMany({
    where: { userId: user.id },
    include: {
      friend: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    friends: friendships.map((f) => f.friend),
  });
}

/** POST /api/friends — add a friend by email (creates bidirectional friendship) */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = (await request.json()) as { email?: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const [currentUser, targetUser] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, image: true },
    }),
  ]);

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!targetUser) {
    return NextResponse.json(
      { error: "No account found with that email address" },
      { status: 404 }
    );
  }
  if (currentUser.id === targetUser.id) {
    return NextResponse.json({ error: "You can't add yourself" }, { status: 400 });
  }

  // Check if already friends
  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: currentUser.id, friendId: targetUser.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already friends" }, { status: 409 });
  }

  // Create bidirectional friendship
  await prisma.$transaction([
    prisma.friendship.create({
      data: { userId: currentUser.id, friendId: targetUser.id },
    }),
    prisma.friendship.create({
      data: { userId: targetUser.id, friendId: currentUser.id },
    }),
  ]);

  return NextResponse.json({ friend: targetUser }, { status: 201 });
}
