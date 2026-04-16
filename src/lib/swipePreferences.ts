/**
 * swipePreferences.ts
 *
 * Pure scoring and weight-update functions for the swipe preference model.
 * No Prisma dependency — imported by API routes.
 *
 * Learned layer: Exponential Moving Average toward ±1 signal.
 *   new_weight = old_weight + LEARNING_RATE * (signal - old_weight)
 *   signal = +1.0 for right-swipe, -1.0 for left-swipe
 *
 * Manual layer: keyword boosts, time blocking, recency bias — set explicitly
 *   by the user in Settings > Card Discovery and My Interests.
 *
 * Cold-start: use global relevanceScore only until COLD_START_THRESHOLD total
 *   swipes. Keyword boosts apply immediately even during cold-start.
 */

// ── EMA constants ──────────────────────────────────────────────────────────
export const LEARNING_RATE = 0.3;
export const MAX_WEIGHT = 5.0;
export const MIN_WEIGHT = -5.0;
export const COLD_START_THRESHOLD = 5;
export const TAG_WEIGHT_FACTOR = 0.8;
export const SOURCE_WEIGHT_FACTOR = 0.4;
export const RECENCY_PENALTY_PER_WEEK = 0.05;

// ── Manual preference constants ────────────────────────────────────────────
/** Score boost per favorite keyword match (title + description + location). */
export const KEYWORD_BOOST = 2.5;
/** Score boost when "free" is detected in an event's text (if enabled). */
export const FREE_EVENT_BOOST = 1.0;

/** Multiplier applied to RECENCY_PENALTY_PER_WEEK based on user's recency bias. */
export const RECENCY_BIAS_MULTIPLIERS: Record<string, number> = {
  all:      0,    // no recency penalty — all dates treated equally
  moderate: 1.0,  // default — mild pull toward sooner events
  soon:     5.0,  // strong pull — events this week rank much higher
};

// ── EMA weight update ──────────────────────────────────────────────────────

/**
 * Computes the delta to add to the currently stored weight after a swipe.
 * The delta is clamped so the result stays within [MIN_WEIGHT, MAX_WEIGHT].
 */
export function computeWeightDelta(
  currentWeight: number,
  direction: "right" | "left"
): number {
  const signal = direction === "right" ? 1.0 : -1.0;
  const newWeight = currentWeight + LEARNING_RATE * (signal - currentWeight);
  const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, newWeight));
  return clamped - currentWeight;
}

// ── Manual preference functions ────────────────────────────────────────────

/**
 * Returns true if the event should be excluded because its title, description,
 * or location contains one of the user's blocked keywords (case-insensitive).
 */
export function shouldBlockByKeyword(
  event: { title: string; description?: string | null; locationName: string },
  blockedKeywords: string[]
): boolean {
  if (!blockedKeywords.length) return false;
  const haystack =
    `${event.title} ${event.description ?? ""} ${event.locationName}`.toLowerCase();
  return blockedKeywords.some(
    (kw) => kw.trim() && haystack.includes(kw.trim().toLowerCase())
  );
}

/**
 * Returns a score boost for an event based on the user's favorite keywords.
 * Checks title, description, and locationName (case-insensitive).
 * Adds KEYWORD_BOOST for each keyword that matches anywhere in the text.
 */
export function computeKeywordBoost(
  event: { title: string; description?: string | null; locationName: string },
  favoriteKeywords: string[]
): number {
  if (!favoriteKeywords.length) return 0;
  const haystack =
    `${event.title} ${event.description ?? ""} ${event.locationName}`.toLowerCase();
  let boost = 0;
  for (const kw of favoriteKeywords) {
    if (kw.trim() && haystack.includes(kw.trim().toLowerCase())) {
      boost += KEYWORD_BOOST;
    }
  }
  return boost;
}

/**
 * Returns true if the event should be excluded from the queue based on
 * the user's time-block preferences.
 *
 * Hard filters (event is removed entirely, not just penalised):
 *   - weekendsOnly: non-Fri/Sat/Sun events are blocked
 *   - blockWorkHours: Mon-Fri events starting during work hours are blocked
 *   - blockLateWeeknights: Sun-Thu events starting at/after the cutoff are blocked
 *
 * Events with no startTime are never blocked by time rules (we can't know
 * when they happen, so we err on the side of showing them).
 */
export function shouldBlockByTime(
  event: { date: Date; startTime?: string | null },
  prefs: {
    blockWorkHours: boolean;
    workStartHour: number;
    workEndHour: number;
    blockLateWeeknights: boolean;
    weeknightCutoffHour: number;
    weekendsOnly: boolean;
  }
): boolean {
  const dow = event.date.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const isWeekend = dow === 0 || dow === 5 || dow === 6; // Fri/Sat/Sun
  const isWeekday = !isWeekend;
  const isSunThurs = dow === 0 || (dow >= 1 && dow <= 4);

  if (prefs.weekendsOnly && !isWeekend) return true;

  // No startTime → can't apply time-of-day rules
  if (!event.startTime) return false;

  const startHour = parseInt(event.startTime.split(":")[0], 10);
  if (isNaN(startHour)) return false;

  if (prefs.blockWorkHours && isWeekday) {
    if (startHour >= prefs.workStartHour && startHour < prefs.workEndHour) return true;
  }

  if (prefs.blockLateWeeknights && isSunThurs) {
    if (startHour >= prefs.weeknightCutoffHour) return true;
  }

  return false;
}

// ── Personal queue scoring ─────────────────────────────────────────────────

/**
 * Scores a candidate event for a specific user.
 * Combines the learned EMA weights with manual preference boosts.
 * Higher score = appears earlier in the swipe queue.
 */
export function computePersonalScore(
  event: {
    relevanceScore: number;
    tags: string[];
    sourceName: string;
    date: Date;
    title: string;
    description?: string | null;
    locationName: string;
  },
  tagWeights: Map<string, number>,
  sourceWeights: Map<string, number>,
  options: {
    recencyBiasMultiplier: number;
    favoriteKeywords: string[];
    boostFreeEvents: boolean;
  }
): number {
  let score = event.relevanceScore;

  // Learned tag weights
  for (const tag of event.tags) {
    const w = tagWeights.get(tag);
    if (w !== undefined) score += w * TAG_WEIGHT_FACTOR;
  }

  // Learned source weight
  const sw = sourceWeights.get(event.sourceName);
  if (sw !== undefined) score += sw * SOURCE_WEIGHT_FACTOR;

  // Recency penalty (scaled by user's recency bias)
  const weeksUntil =
    (event.date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000);
  score -=
    Math.max(0, weeksUntil) *
    RECENCY_PENALTY_PER_WEEK *
    options.recencyBiasMultiplier;

  // Manual keyword boost
  score += computeKeywordBoost(event, options.favoriteKeywords);

  // Free event boost
  if (options.boostFreeEvents) {
    const text = `${event.title} ${event.description ?? ""}`.toLowerCase();
    if (/\bfree\b/.test(text)) score += FREE_EVENT_BOOST;
  }

  return score;
}
