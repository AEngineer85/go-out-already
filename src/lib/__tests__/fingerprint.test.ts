import { describe, it, expect } from "vitest";
import { buildFingerprint } from "../fingerprint";

describe("buildFingerprint", () => {
  it("returns a 64-char hex sha256", () => {
    const fp = buildFingerprint("Test Event", "2026-04-15", "Some Venue");
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    const a = buildFingerprint("Test Event", "2026-04-15", "Some Venue");
    const b = buildFingerprint("Test Event", "2026-04-15", "Some Venue");
    expect(a).toBe(b);
  });

  it("differs with different title", () => {
    const a = buildFingerprint("Event A", "2026-04-15", "Venue");
    const b = buildFingerprint("Event B", "2026-04-15", "Venue");
    expect(a).not.toBe(b);
  });

  it("differs with different date", () => {
    const a = buildFingerprint("Event", "2026-04-15", "Venue");
    const b = buildFingerprint("Event", "2026-04-16", "Venue");
    expect(a).not.toBe(b);
  });

  it("is case-insensitive on title", () => {
    const a = buildFingerprint("Summer Fest", "2026-07-04", "Goodale Park");
    const b = buildFingerprint("SUMMER FEST", "2026-07-04", "Goodale Park");
    expect(a).toBe(b);
  });

  it("strips punctuation from title and location", () => {
    const a = buildFingerprint("Jazz & Blues!", "2026-08-01", "Short North");
    const b = buildFingerprint("Jazz  Blues", "2026-08-01", "Short North");
    expect(a).toBe(b);
  });
});
