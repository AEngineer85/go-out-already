import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

const DISCOVERY_SELECT = {
  defaultRadiusMiles: true,
  defaultReminderMinutes: true,
  alertEmail: true,
  email: true,
  homeZipCode: true,
  homeLat: true,
  homeLng: true,
  recencyBias: true,
  blockWorkHours: true,
  workStartHour: true,
  workEndHour: true,
  blockLateWeeknights: true,
  weeknightCutoffHour: true,
  weekendsOnly: true,
  boostFreeEvents: true,
  maxWeeksAhead: true,
  favoriteKeywords: true,
  blockedKeywords: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: DISCOVERY_SELECT,
  });

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    defaultRadiusMiles,
    defaultReminderMinutes,
    alertEmail,
    homeZipCode,
    recencyBias,
    blockWorkHours,
    workStartHour,
    workEndHour,
    blockLateWeeknights,
    weeknightCutoffHour,
    weekendsOnly,
    boostFreeEvents,
    maxWeeksAhead,
    favoriteKeywords,
    blockedKeywords,
  } = body;

  // Geocode the zip code server-side if it changed
  let homeLat: number | null | undefined;
  let homeLng: number | null | undefined;
  if (homeZipCode !== undefined) {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { homeZipCode: true },
    });
    if (homeZipCode && homeZipCode !== currentUser?.homeZipCode) {
      const coords = await geocodeAddress(homeZipCode + ", USA");
      homeLat = coords?.lat ?? null;
      homeLng = coords?.lng ?? null;
    } else if (!homeZipCode) {
      homeLat = null;
      homeLng = null;
    }
  }

  const updated = await prisma.user.update({
    where: { email: session.user.email! },
    data: {
      ...(defaultRadiusMiles != null && { defaultRadiusMiles }),
      ...(defaultReminderMinutes != null && { defaultReminderMinutes }),
      ...(alertEmail !== undefined && { alertEmail }),
      ...(homeZipCode !== undefined && { homeZipCode }),
      ...(homeLat !== undefined && { homeLat }),
      ...(homeLng !== undefined && { homeLng }),
      ...(recencyBias !== undefined && { recencyBias }),
      ...(blockWorkHours !== undefined && { blockWorkHours }),
      ...(workStartHour != null && { workStartHour }),
      ...(workEndHour != null && { workEndHour }),
      ...(blockLateWeeknights !== undefined && { blockLateWeeknights }),
      ...(weeknightCutoffHour != null && { weeknightCutoffHour }),
      ...(weekendsOnly !== undefined && { weekendsOnly }),
      ...(boostFreeEvents !== undefined && { boostFreeEvents }),
      ...(maxWeeksAhead != null && { maxWeeksAhead }),
      ...(favoriteKeywords !== undefined && { favoriteKeywords }),
      ...(blockedKeywords !== undefined && { blockedKeywords }),
    },
    select: DISCOVERY_SELECT,
  });

  return NextResponse.json(updated);
}
