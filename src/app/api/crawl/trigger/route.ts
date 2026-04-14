import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const crawlerUrl = process.env.CRAWLER_URL;
    if (!crawlerUrl) {
      return NextResponse.json(
        { error: "Crawler URL not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(`${crawlerUrl}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRAWLER_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to trigger crawler" },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "Crawl triggered successfully" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
