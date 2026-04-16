import { describe, it, expect } from "vitest";
import {
  computeWeightDelta,
  shouldBlockByKeyword,
  shouldBlockByTime,
  computeKeywordBoost,
  LEARNING_RATE,
  KEYWORD_BOOST,
} from "../swipePreferences";

// ── computeWeightDelta ─────────────────────────────────────────────────────

describe("computeWeightDelta", () => {
  it("returns positive delta for a right swipe from neutral", () => {
    const delta = computeWeightDelta(0, "right");
    expect(delta).toBeCloseTo(LEARNING_RATE * 1.0, 5); // 0.3
  });

  it("returns negative delta for a left swipe from neutral", () => {
    const delta = computeWeightDelta(0, "left");
    expect(delta).toBeCloseTo(LEARNING_RATE * -1.0, 5); // -0.3
  });

  it("delta shrinks as weight approaches the signal (convergence)", () => {
    const d1 = computeWeightDelta(0, "right");
    const d2 = computeWeightDelta(0.5, "right");
    expect(Math.abs(d1)).toBeGreaterThan(Math.abs(d2));
  });

  it("never exceeds MAX_WEIGHT = 5", () => {
    const delta = computeWeightDelta(4.9, "right");
    expect(4.9 + delta).toBeLessThanOrEqual(5.0);
  });

  it("never goes below MIN_WEIGHT = -5", () => {
    const delta = computeWeightDelta(-4.9, "left");
    expect(-4.9 + delta).toBeGreaterThanOrEqual(-5.0);
  });
});

// ── shouldBlockByKeyword ───────────────────────────────────────────────────

describe("shouldBlockByKeyword", () => {
  const event = {
    title: "Saturday Hike at Hocking Hills",
    description: "A great outdoor walk through the woods.",
    locationName: "Hocking Hills State Park",
  };

  it("blocks when keyword matches title (case-insensitive)", () => {
    expect(shouldBlockByKeyword(event, ["hike"])).toBe(true);
    expect(shouldBlockByKeyword(event, ["HIKE"])).toBe(true);
  });

  it("blocks when keyword matches description", () => {
    expect(shouldBlockByKeyword(event, ["walk"])).toBe(true);
  });

  it("blocks when keyword matches locationName", () => {
    expect(shouldBlockByKeyword(event, ["hocking hills"])).toBe(true);
  });

  it("does not block when keyword is absent", () => {
    expect(shouldBlockByKeyword(event, ["concert"])).toBe(false);
  });

  it("does not block when blockedKeywords is empty", () => {
    expect(shouldBlockByKeyword(event, [])).toBe(false);
  });

  it("blocks when ANY keyword matches (OR logic)", () => {
    expect(shouldBlockByKeyword(event, ["concert", "hike"])).toBe(true);
  });

  it("ignores blank/whitespace-only keywords", () => {
    expect(shouldBlockByKeyword(event, ["  ", ""])).toBe(false);
  });

  it("handles null description gracefully", () => {
    const noDesc = { title: "Hike", description: null, locationName: "Park" };
    expect(shouldBlockByKeyword(noDesc, ["hike"])).toBe(true);
  });
});

// ── shouldBlockByTime ──────────────────────────────────────────────────────

describe("shouldBlockByTime", () => {
  const basePrefs = {
    blockWorkHours: false,
    workStartHour: 9,
    workEndHour: 17,
    blockLateWeeknights: false,
    weeknightCutoffHour: 22,
    weekendsOnly: false,
  };

  // 2026-04-20 is a Monday
  const monday = new Date("2026-04-20T00:00:00");
  // 2026-04-18 is a Saturday
  const saturday = new Date("2026-04-18T00:00:00");

  it("does not block by default when no filters enabled", () => {
    expect(shouldBlockByTime({ date: monday }, basePrefs)).toBe(false);
  });

  it("weekendsOnly blocks Monday events", () => {
    expect(
      shouldBlockByTime({ date: monday }, { ...basePrefs, weekendsOnly: true })
    ).toBe(true);
  });

  it("weekendsOnly does not block Saturday events", () => {
    expect(
      shouldBlockByTime(
        { date: saturday, startTime: "14:00" },
        { ...basePrefs, weekendsOnly: true }
      )
    ).toBe(false);
  });

  it("blockWorkHours blocks a Mon event at 10am", () => {
    expect(
      shouldBlockByTime(
        { date: monday, startTime: "10:00" },
        { ...basePrefs, blockWorkHours: true }
      )
    ).toBe(true);
  });

  it("blockWorkHours does not block a Mon event at 7pm", () => {
    expect(
      shouldBlockByTime(
        { date: monday, startTime: "19:00" },
        { ...basePrefs, blockWorkHours: true }
      )
    ).toBe(false);
  });

  it("blockLateWeeknights blocks a Sunday event at 23:00", () => {
    const sunday = new Date("2026-04-19T00:00:00");
    expect(
      shouldBlockByTime(
        { date: sunday, startTime: "23:00" },
        { ...basePrefs, blockLateWeeknights: true }
      )
    ).toBe(true);
  });

  it("blockLateWeeknights does not block a Saturday event at 23:00", () => {
    expect(
      shouldBlockByTime(
        { date: saturday, startTime: "23:00" },
        { ...basePrefs, blockLateWeeknights: true }
      )
    ).toBe(false);
  });

  it("events with no startTime are never blocked by work/late filters", () => {
    expect(
      shouldBlockByTime(
        { date: monday },
        { ...basePrefs, blockWorkHours: true, blockLateWeeknights: true }
      )
    ).toBe(false);
  });
});

// ── computeKeywordBoost ───────────────────────────────────────────────────

describe("computeKeywordBoost", () => {
  const event = {
    title: "Free Jazz Concert",
    description: "Live music in the Short North",
    locationName: "Newport Music Hall",
  };

  it("returns 0 when no keywords", () => {
    expect(computeKeywordBoost(event, [])).toBe(0);
  });

  it("returns KEYWORD_BOOST for a single match", () => {
    expect(computeKeywordBoost(event, ["jazz"])).toBe(KEYWORD_BOOST);
  });

  it("returns double KEYWORD_BOOST for two matches", () => {
    expect(computeKeywordBoost(event, ["jazz", "concert"])).toBe(
      KEYWORD_BOOST * 2
    );
  });

  it("is case-insensitive", () => {
    expect(computeKeywordBoost(event, ["JAZZ"])).toBe(KEYWORD_BOOST);
  });

  it("returns 0 when no keywords match", () => {
    expect(computeKeywordBoost(event, ["hike", "festival"])).toBe(0);
  });
});
