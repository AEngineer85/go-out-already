const TAG_RULES: Record<string, string[]> = {
  "sporting-events": ["game", "match", "osu", "buckeyes", "clippers", "crew", "blue jackets", "tournament", "athletics"],
  "races-runs": ["5k", "10k", "half marathon", "marathon", "fun run", "trail run", "race", "color run"],
  festivals: ["festival", "fest", "fair", "expo", "celebration", "jubilee"],
  parades: ["parade", "procession", "march", "float", "drill team"],
  "great-for-kids": ["family", "kids", "children", "playground", "youth", "all ages", "kid-friendly"],
  "live-music": ["concert", "live music", "band", "performance", "orchestra", "symphony", "jazz", "open mic"],
  "food-drink": ["food truck", "brewery", "tasting", "farmers market", "wine", "beer", "culinary"],
  "arts-culture": ["art", "gallery", "exhibit", "museum", "theatre", "theater", "film", "screening", "poetry"],
  "outdoors-nature": ["hike", "trail", "nature", "park", "garden", "kayak", "paddle", "bird", "wildlife"],
  community: ["volunteer", "cleanup", "neighborhood", "civic", "town hall", "association"],
  education: ["workshop", "class", "lecture", "seminar", "learning", "skill", "training"],
  "pet-friendly": ["dog", "pet", "leash", "bark in the park", "four-legged", "canine"],
  "seasonal-holiday": ["halloween", "christmas", "thanksgiving", "easter", "fourth of july", "seasonal"],
  "fundraiser-charity": ["fundraiser", "gala", "charity", "benefit", "auction", "nonprofit"],
  "free-admission": ["free", "no cost", "free admission", "complimentary", "no charge"],
};

export function assignTags(title: string, description = ""): string[] {
  const text = `${title} ${description}`.toLowerCase();
  return Object.entries(TAG_RULES)
    .filter(([, kws]) => kws.some((kw) => text.includes(kw)))
    .map(([tag]) => tag);
}

const SOURCE_TIERS: Record<string, number> = {
  "columbusrecparks.com": 2,
  "metroparks.net": 2,
  "columbus.gov": 2,
  "ohiostateparks.org": 2,
  "experiencecolumbus.com": 1.5,
  "dispatch.com": 1.5,
  "columbusmuseum.org": 1.5,
  "cosi.org": 1.5,
  "columbussymphony.com": 1.5,
  "columbusunderground.com": 1,
  "columbusalive.com": 1,
  "eventbrite.com": 1,
  "runsignup.com": 1,
};

function getSourceTier(sourceUrl: string): number {
  try {
    const domain = new URL(sourceUrl).hostname.replace("www.", "");
    return SOURCE_TIERS[domain] ?? 0;
  } catch {
    return 0;
  }
}

export function computeRelevanceScore(params: {
  tags: string[];
  sourceUrl: string;
  hasMultipleSources: boolean;
  hasTime: boolean;
  hasLocation: boolean;
  hasDescription: boolean;
  date: Date;
}): number {
  let score = 0;
  if (params.hasMultipleSources) score += 3.0;
  score += getSourceTier(params.sourceUrl);
  if (params.hasTime && params.hasLocation && params.hasDescription) score += 1.0;
  if (params.tags.includes("free-admission")) score += 0.5;
  if (params.tags.includes("great-for-kids")) score += 0.5;
  const now = new Date();
  const threeWeeksOut = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  if (params.date > threeWeeksOut) {
    const weeksOut = (params.date.getTime() - threeWeeksOut.getTime()) / (7 * 24 * 60 * 60 * 1000);
    score -= 0.1 * weeksOut;
  }
  return Math.max(0, score);
}
