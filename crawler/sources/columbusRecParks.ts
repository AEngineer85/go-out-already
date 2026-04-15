import type { RawEvent } from "../src/types";

// Columbus Rec & Parks events are covered by the ICS feed in icsFeeds.ts.
// Playwright was removed to prevent OOM crashes on the Render free tier
// (two 200MB Chromium instances on a 512MB container = heap failure).
export async function scrapeColumbusRecParks(): Promise<RawEvent[]> {
  return [];
}
