import axios from "axios";

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: { countrycode?: string };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const key = address.toLowerCase().trim();

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    const response = await axios.get<PhotonResponse>(
      "https://photon.komoot.io/api/",
      {
        params: { q: address, limit: 1, lang: "en" },
        timeout: 8000,
      }
    );

    const features = response.data.features ?? [];
    const usFeature = features.find(
      (f) => !f.properties.countrycode || f.properties.countrycode === "US"
    ) ?? features[0];

    if (usFeature) {
      const [lng, lat] = usFeature.geometry.coordinates;
      const result = { lat, lng };
      geocodeCache.set(key, result);
      return result;
    }

    geocodeCache.set(key, null);
    return null;
  } catch {
    return null;
  }
}

export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
