export const TAG_RULES: Record<string, string[]> = {
  "sporting-events": [
    "game",
    "match",
    "osu",
    "buckeyes",
    "clippers",
    "crew",
    "blue jackets",
    "tournament",
    "athletics",
  ],
  "races-runs": [
    "5k",
    "10k",
    "half marathon",
    "marathon",
    "fun run",
    "trail run",
    "race",
    "color run",
  ],
  festivals: [
    "festival",
    "fest",
    "fair",
    "expo",
    "celebration",
    "jubilee",
  ],
  parades: ["parade", "procession", "march", "float", "drill team"],
  "great-for-kids": [
    "family",
    "kids",
    "children",
    "playground",
    "youth",
    "all ages",
    "kid-friendly",
    "ages 0",
  ],
  "live-music": [
    "concert",
    "live music",
    "band",
    "performance",
    "orchestra",
    "symphony",
    "jazz",
    "open mic",
  ],
  "food-drink": [
    "food truck",
    "brewery",
    "tasting",
    "farmers market",
    "wine",
    "beer",
    "culinary",
  ],
  "arts-culture": [
    "art",
    "gallery",
    "exhibit",
    "museum",
    "theatre",
    "theater",
    "film",
    "screening",
    "poetry",
  ],
  "outdoors-nature": [
    "hike",
    "trail",
    "nature",
    "park",
    "garden",
    "kayak",
    "paddle",
    "bird",
    "wildlife",
  ],
  community: [
    "volunteer",
    "cleanup",
    "neighborhood",
    "civic",
    "town hall",
    "association",
  ],
  education: [
    "workshop",
    "class",
    "lecture",
    "seminar",
    "learning",
    "skill",
    "training",
  ],
  "pet-friendly": [
    "dog",
    "pet",
    "leash",
    "bark in the park",
    "four-legged",
    "canine",
  ],
  "seasonal-holiday": [
    "halloween",
    "christmas",
    "thanksgiving",
    "easter",
    "fourth of july",
    "seasonal",
  ],
  "fundraiser-charity": [
    "fundraiser",
    "gala",
    "charity",
    "benefit",
    "auction",
    "nonprofit",
  ],
  "free-admission": [
    "free",
    "no cost",
    "free admission",
    "complimentary",
    "no charge",
  ],
};

export function assignTags(title: string, description: string = ""): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags;
}

export const SOURCE_TIERS: Record<string, number> = {
  "columbusrecparks.com": 2,
  "delcoparks.com": 2,
  "metroparks.net": 2,
  "columbus.gov": 2,
  "ohiostateparks.org": 2,
  "experiencecolumbus.com": 1.5,
  "columbusunderground.com": 1,
  "614now.com": 1,
  "dispatch.com": 1.5,
  "columbusalive.com": 1,
  "thisweekcommunitynews.com": 1,
  "dcgazette.com": 1,
  "columbusmuseum.org": 1.5,
  "cosi.org": 1.5,
  "fpconservancy.org": 1.5,
  "shortnorth.org": 1,
  "columbussymphony.com": 1.5,
  "eventbrite.com": 1,
  "runsignup.com": 1,
  "active.com": 1,
  "ohioraces.com": 1,
};

export function getSourceTierScore(sourceUrl: string): number {
  const domain = new URL(sourceUrl).hostname.replace("www.", "");
  return SOURCE_TIERS[domain] ?? 0;
}

export function computeRelevanceScore(event: {
  tags: string[];
  sourceUrl: string;
  additionalSources?: unknown[] | null;
  description?: string | null;
  startTime?: string | null;
  locationName?: string;
  date: Date;
}): number {
  let score = 0;

  const additionalSources = event.additionalSources as unknown[] | null | undefined;
  if (additionalSources && additionalSources.length > 0) {
    score += 3.0;
  }

  try {
    score += getSourceTierScore(event.sourceUrl);
  } catch {
    // invalid URL, skip
  }

  const hasTime = !!event.startTime;
  const hasLocation = !!event.locationName;
  const hasDescription = !!event.description;
  if (hasTime && hasLocation && hasDescription) {
    score += 1.0;
  }

  if (event.tags.includes("free-admission")) score += 0.5;
  if (event.tags.includes("great-for-kids")) score += 0.5;

  const now = new Date();
  const threeWeeksOut = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  if (event.date > threeWeeksOut) {
    const weeksOut =
      (event.date.getTime() - threeWeeksOut.getTime()) /
      (7 * 24 * 60 * 60 * 1000);
    score -= 0.1 * weeksOut;
  }

  return Math.max(0, score);
}
