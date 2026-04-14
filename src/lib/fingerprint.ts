import crypto from "crypto";

export function buildFingerprint(
  title: string,
  date: string,
  locationName: string
): string {
  const normalized = [
    title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim(),
    date,
    locationName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim(),
  ].join("|");

  return crypto.createHash("sha256").update(normalized).digest("hex");
}
