import { describe, it, expect } from "vitest";
import { distanceMiles } from "../geocode";

describe("distanceMiles", () => {
  it("returns 0 for identical coordinates", () => {
    expect(distanceMiles(40.0, -83.0, 40.0, -83.0)).toBe(0);
  });

  it("Delaware OH (43015) to Hocking Hills is ~50 miles, not within 15", () => {
    // Delaware OH approx: 40.2978, -83.0680
    // Hocking Hills (Old Man's Cave): 39.4337, -82.5417
    const d = distanceMiles(40.2978, -83.068, 39.4337, -82.5417);
    expect(d).toBeGreaterThan(15);
    expect(d).toBeGreaterThan(45);
    expect(d).toBeLessThan(70);
  });

  it("Delaware OH to Columbus OH is ~25 miles", () => {
    // Columbus approx: 39.9612, -82.9988
    const d = distanceMiles(40.2978, -83.068, 39.9612, -82.9988);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(35);
  });

  it("is symmetric", () => {
    const a = distanceMiles(40.2978, -83.068, 39.4337, -82.5417);
    const b = distanceMiles(39.4337, -82.5417, 40.2978, -83.068);
    expect(a).toBeCloseTo(b, 5);
  });
});
