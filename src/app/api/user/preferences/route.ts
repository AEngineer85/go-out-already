import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      defaultRadiusMiles: true,
      defaultReminderMinutes: true,
      alertEmail: true,
      email: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { defaultRadiusMiles, defaultReminderMinutes, alertEmail } = body;

  const updated = await prisma.user.update({
    where: { email: session.user.email! },
    data: {
      ...(defaultRadiusMiles != null && { defaultRadiusMiles }),
      ...(defaultReminderMinutes != null && { defaultReminderMinutes }),
      ...(alertEmail !== undefined && { alertEmail }),
    },
    select: {
      defaultRadiusMiles: true,
      defaultReminderMinutes: true,
      alertEmail: true,
    },
  });

  return NextResponse.json(updated);
}
