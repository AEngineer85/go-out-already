import Parser from "rss-parser";
import type { RawEvent } from "../src/types";

const parser = new Parser({ timeout: 10000 });

interface RSSFeedConfig {
  url: string;
  sourceName: string;
}

const RSS_FEEDS: RSSFeedConfig[] = [
  // 614 Magazine — active, covers Columbus events broadly
  {
    url: "https://www.614now.com/feed",
    sourceName: "614 Magazine",
  },
  // Short North Arts District
  {
    url: "https://www.shortnorth.org/feed",
    sourceName: "Short North",
  },
  // German Village Society
  {
    url: "https://germanvillage.com/feed",
    sourceName: "German Village",
  },
  // Ohio History Connection
  {
    url: "https://www.ohiohistory.org/feed",
    sourceName: "Ohio History Connection",
  },
];

const now = new Date();
const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

function extractDate(item: Parser.Item): string | null {
  const pubDate = item.pubDate || item.isoDate;
  if (!pubDate) return null;
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return null;
  if (d < now || d > sixMonthsOut) return null;
  return d.toISOString().split("T")[0];
}

export async function scrapeRSSFeeds(): Promise<{ events: RawEvent[]; errors: string[] }> {
  const events: RawEvent[] = [];
  const errors: string[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);

      for (const item of parsed.items) {
        const title = item.title?.trim();
        if (!title) continue;

        const dateStr = extractDate(item);
        if (!dateStr) continue;

        const isEventRelated = /event|festival|concert|show|exhibit|fair|race|parade|workshop|lecture|tour/i.test(
          `${title} ${item.contentSnippet || ""}`
        );
        if (!isEventRelated) continue;

        events.push({
          title,
          description: item.contentSnippet || item.content,
          date: dateStr,
          locationName: "Columbus, OH",
          sourceUrl: item.link || feed.url,
          sourceName: feed.sourceName,
        });
      }
    } catch (err) {
      const msg = `[rssFeeds] Failed ${feed.sourceName}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return { events, errors };
}
