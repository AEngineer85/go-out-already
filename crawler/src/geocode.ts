import axios from "axios";

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: address, format: "json", limit: 1, countrycodes: "us" },
      headers: { "User-Agent": "GoOutAlready/1.0 (contact@example.com)" },
      timeout: 5000,
    });

    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cache.set(key, result);
      // Nominatim rate limit: 1 req/sec
      await new Promise((r) => setTimeout(r, 1100));
      return result;
    }
    cache.set(key, null);
    return null;
  } catch {
    return null;
  }
}
