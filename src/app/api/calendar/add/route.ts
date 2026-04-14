import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { google } from "googleapis";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventIds, reminderMinutes } = await request.json();

  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return NextResponse.json({ error: "No event IDs provided" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.refreshToken) {
    return NextResponse.json(
      { error: "No Google credentials found. Please re-authenticate." },
      { status: 401 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: decrypt(user.refreshToken),
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
  });

  const results: Array<{ id: string; success: boolean; calendarEventId?: string; error?: string }> = [];

  for (const event of events) {
    if (event.addedToCalendar && event.calendarEventId) {
      results.push({ id: event.id, success: true, calendarEventId: event.calendarEventId });
      continue;
    }

    try {
      const startDate = new Date(event.date);
      const isAllDay = !event.startTime;

      const startObj = isAllDay
        ? { date: startDate.toISOString().split("T")[0] }
        : {
            dateTime: `${startDate.toISOString().split("T")[0]}T${event.startTime}:00`,
            timeZone: "America/New_York",
          };

      let endObj;
      if (isAllDay) {
        endObj = { date: startDate.toISOString().split("T")[0] };
      } else if (event.endTime) {
        endObj = {
          dateTime: `${startDate.toISOString().split("T")[0]}T${event.endTime}:00`,
          timeZone: "America/New_York",
        };
      } else {
        const endTime = new Date(
          `${startDate.toISOString().split("T")[0]}T${event.startTime}:00`
        );
        endTime.setHours(endTime.getHours() + 2);
        endObj = {
          dateTime: endTime.toISOString(),
          timeZone: "America/New_York",
        };
      }

      const location = [event.locationName, event.address]
        .filter(Boolean)
        .join(", ");

      const description = [
        event.description,
        `Source: ${event.sourceUrl}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const minutes = reminderMinutes ?? user.defaultReminderMinutes ?? 1440;

      const calEvent = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description,
          location,
          start: startObj,
          end: endObj,
          source: { url: event.sourceUrl, title: event.sourceName },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes }],
          },
        },
      });

      await prisma.event.update({
        where: { id: event.id },
        data: {
          addedToCalendar: true,
          calendarEventId: calEvent.data.id,
        },
      });

      results.push({
        id: event.id,
        success: true,
        calendarEventId: calEvent.data.id ?? undefined,
      });
    } catch (err) {
      results.push({
        id: event.id,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
