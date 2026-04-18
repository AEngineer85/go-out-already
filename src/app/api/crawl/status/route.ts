import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A crawl is considered "still running" if it started within the last 25 minutes
// and has no completedAt. (Full crawl across 13+ sources takes ~10–12 minutes.)
const RUNNING_WINDOW_MS = 25 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [latestCompleted, latestAny] = await Promise.all([
    prisma.crawlLog.findFirst({
      where: { completedAt: { not: null } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.crawlLog.findFirst({
      orderBy: { startedAt: "desc" },
    }),
  ]);

  // Detect an in-progress run: most recent log has no completedAt and started recently
  const isRunning =
    latestAny != null &&
    latestAny.completedAt == null &&
    Date.now() - new Date(latestAny.startedAt).getTime() < RUNNING_WINDOW_MS;

  return NextResponse.json({
    ...(latestCompleted ?? {}),
    isRunning,
  });
}
