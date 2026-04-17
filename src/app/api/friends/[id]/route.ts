import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/friends/[id] — remove a friend (deletes both directions) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });
  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const friendId = params.id;

  // Delete both directions so neither user still sees the other
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId: currentUser.id, friendId },
        { userId: friendId, friendId: currentUser.id },
      ],
    },
  });

  return NextResponse.json({ ok: true });
}
