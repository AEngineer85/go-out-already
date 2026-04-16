import crypto from "crypto";

/**
 * Normalize a string for fingerprinting: lowercase, remove punctuation,
 * collapse whitespace.
 */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Normalize a location name for fingerprinting.
 * - Takes only the part before the first comma (e.g. "Huntington Park, Columbus" → "Huntington Park")
 * - Strips generic Columbus/OH suffixes that different sources add inconsistently
 */
function normLocation(location: string): string {
  const firstPart = location.split(",")[0];
  return norm(firstPart)
    .replace(/\b(columbus|ohio|oh|usa)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFingerprint(
  title: string,
  date: string,
  locationName: string
): string {
  const normalized = [norm(title), date, normLocation(locationName)].join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
