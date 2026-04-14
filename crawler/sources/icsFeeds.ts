import ical from "node-ical";
import type { RawEvent } from "../src/types";

interface ICSFeedConfig {
  url: string;
  sourceName: string;
}

const ICS_FEEDS: ICSFeedConfig[] = [
  // Government & Parks
  {
    url: "https://www.columbusrecparks.com/events/?ical=1",
    sourceName: "Columbus Rec & Parks",
  },
  {
    url: "https://www.metroparks.net/events/?ical=1",
    sourceName: "Metro Parks",
  },
  {
    url: "https://calendar.google.com/calendar/ical/columbus.gov/public/basic.ics",
    sourceName: "City of Columbus",
  },
  {
    url: "https://ohioraces.com/races/feed/ical",
    sourceName: "OhioRaces.com",
  },
  // Arts & Culture venues
  {
    url: "https://www.cosi.org/events/?ical=1",
    sourceName: "COSI",
  },
  {
    url: "https://www.columbussymphony.com/events/?ical=1",
    sourceName: "Columbus Symphony",
  },
  {
    url: "https://www.gcac.org/events/?ical=1",
    sourceName: "Greater Columbus Arts Council",
  },
  {
    url: "https://www.shortnorth.org/events/?ical=1",
    sourceName: "Short North Arts District",
  },
  {
    url: "https://www.shadowboxlive.org/events/?ical=1",
    sourceName: "Shadowbox Live",
  },
  // Community & Neighborhood
  {
    url: "https://www.dublinchamber.org/events/?ical=1",
    sourceName: "Dublin Chamber",
  },
  {
    url: "https://www.westerville.org/events/?ical=1",
    sourceName: "City of Westerville",
  },
  {
    url: "https://www.dublin.oh.us/events/?ical=1",
    sourceName: "City of Dublin",
  },
  {
    url: "https://www.delaware.oh.us/events/?ical=1",
    sourceName: "City of Delaware",
  },
  {
    url: "https://www.hilliardohio.gov/events/?ical=1",
    sourceName: "City of Hilliard",
  },
  // Sports & Recreation
  {
    url: "https://www.milb.com/columbus/schedule/ical",
    sourceName: "Columbus Clippers",
  },
  {
    url: "https://runsignup.com/Races/Results/?ical=1&state=OH",
    sourceName: "RunSignUp Ohio",
  },
  {
    url: "https://www.columbusmuseum.org/events/?ical=1",
    sourceName: "Columbus Museum of Art",
  },
];

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

export async function scrapeICSFeeds(): Promise<{ events: RawEvent[]; errors: string[] }> {
  const events: RawEvent[] = [];
  const errors: string[] = [];

  for (const feed of ICS_FEEDS) {
    try {
      const data = await ical.async.fromURL(feed.url);

      for (const key of Object.keys(data)) {
        const entry = data[key];
        if (entry.type !== "VEVENT") continue;

        const start = entry.start as Date;
        const end = entry.end as Date | undefined;
        if (!start) continue;

        const eventDate = new Date(start);
        if (eventDate < now || eventDate > sixMonthsOut) continue;

        const dateStr = eventDate.toISOString().split("T")[0];
        const startTime = start instanceof Date && !isNaN(start.getTime())
          ? start.toTimeString().slice(0, 5)
          : undefined;
        const endTime = end instanceof Date && !isNaN(end.getTime())
          ? end.toTimeString().slice(0, 5)
          : undefined;

        const location = typeof entry.location === "string" ? entry.location : "";
        const summary = typeof entry.summary === "string" ? entry.summary : "";
        const description = typeof entry.description === "string" ? entry.description : undefined;
        const url = typeof entry.url === "string" ? entry.url : feed.url;

        if (!summary) continue;

        events.push({
          title: summary,
          description,
          date: dateStr,
          startTime: startTime && startTime !== "00:00" ? startTime : undefined,
          endTime: endTime && endTime !== "00:00" ? endTime : undefined,
          locationName: location || "Columbus, OH",
          sourceUrl: url,
          sourceName: feed.sourceName,
        });
      }
    } catch (err) {
      const msg = `[icsFeeds] Failed ${feed.sourceName}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return { events, errors };
}
