import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight DB keep-alive endpoint.
 * Called daily by Vercel Cron to prevent Supabase free-tier from pausing
 * after 7 days of inactivity.
 */
export async function GET() {
  // Run a minimal query — just enough to keep the connection warm
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
