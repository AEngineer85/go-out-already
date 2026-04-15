/**
 * swipePreferences.ts
 *
 * Pure scoring and weight-update functions for the swipe preference model.
 * No Prisma dependency — imported by API routes.
 *
 * Algorithm: Exponential Moving Average toward ±1 signal.
 *   new_weight = old_weight + LEARNING_RATE * (signal - old_weight)
 *   signal = +1.0 for right-swipe, -1.0 for left-swipe
 *
 * Cold-start: use global relevanceScore only until COLD_START_THRESHOLD total swipes.
 */

export const LEARNING_RATE = 0.3;
export const MAX_WEIGHT = 5.0;
export const MIN_WEIGHT = -5.0;
export const COLD_START_THRESHOLD = 5;
export const TAG_WEIGHT_FACTOR = 0.8;
export const SOURCE_WEIGHT_FACTOR = 0.4;
export const RECENCY_PENALTY_PER_WEEK = 0.05;

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

/**
 * Scores a candidate event for a specific user using their learned tag and
 * source weights. Higher score = should appear earlier in the swipe queue.
 *
 * Falls back gracefully when weights are empty (cold-start: returns
 * event.relevanceScore only).
 */
export function computePersonalScore(
  event: {
    relevanceScore: number;
    tags: string[];
    sourceName: string;
    date: Date;
  },
  tagWeights: Map<string, number>,
  sourceWeights: Map<string, number>
): number {
  let score = event.relevanceScore;

  for (const tag of event.tags) {
    const w = tagWeights.get(tag);
    if (w !== undefined) score += w * TAG_WEIGHT_FACTOR;
  }

  const sw = sourceWeights.get(event.sourceName);
  if (sw !== undefined) score += sw * SOURCE_WEIGHT_FACTOR;

  const weeksUntil =
    (event.date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000);
  score -= Math.max(0, weeksUntil) * RECENCY_PENALTY_PER_WEEK;

  return score;
}
