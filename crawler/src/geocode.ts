import axios from "axios";

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: { countrycode?: string };
}

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const { data } = await axios.get<{ features: PhotonFeature[] }>(
      "https://photon.komoot.io/api/",
      {
        params: { q: address, limit: 1, lang: "en" },
        timeout: 8000,
      }
    );

    const features = data.features ?? [];
    const usFeature =
      features.find((f) => !f.properties.countrycode || f.properties.countrycode === "US") ??
      features[0];

    if (usFeature) {
      const [lng, lat] = usFeature.geometry.coordinates;
      const result = { lat, lng };
      cache.set(key, result);
      // Photon is free but be a good citizen — small delay between requests
      await new Promise((r) => setTimeout(r, 300));
      return result;
    }

    cache.set(key, null);
    return null;
  } catch {
    return null;
  }
}
