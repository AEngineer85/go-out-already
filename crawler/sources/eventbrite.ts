import axios from "axios";
import type { RawEvent } from "../src/types";

interface EventbriteEvent {
  name: { text: string };
  description: { text: string };
  start: { local: string };
  end: { local: string };
  url: string;
  venue?: {
    name?: string;
    address?: {
      localized_address_display?: string;
    };
  };
}

interface EventbriteResponse {
  events?: EventbriteEvent[];
}

export async function scrapeEventbrite(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  // Eventbrite public search (no API key required for public events)
  const queries = [
    "Columbus OH",
    "Westerville OH",
    "Dublin OH",
    "Hilliard OH",
    "Delaware OH",
  ];

  for (const q of queries) {
    try {
      const { data } = await axios.get<EventbriteResponse>(
        "https://www.eventbriteapi.com/v3/events/search/",
        {
          params: {
            "location.address": q,
            "location.within": "30mi",
            expand: "venue",
            "start_date.range_start": new Date().toISOString(),
            "start_date.range_end": new Date(
              Date.now() + 180 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          headers: {
            "User-Agent": "GoOutAlready/1.0",
          },
          timeout: 10000,
        }
      );

      (data.events || []).forEach((e) => {
        const startDate = new Date(e.start.local);
        const endDate = new Date(e.end.local);

        events.push({
          title: e.name.text,
          description: e.description?.text,
          date: startDate.toISOString().split("T")[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endTime: endDate.toTimeString().slice(0, 5),
          locationName: e.venue?.name || "Columbus, OH",
          address: e.venue?.address?.localized_address_display,
          sourceUrl: e.url,
          sourceName: "Eventbrite",
        });
      });
    } catch (err) {
      console.warn(`[eventbrite] Failed query "${q}":`, err);
    }
  }

  return events;
}
