import axios from "axios";
import { prisma } from "@/lib/prisma";

interface NominatimResult {
  lat: string;
  lon: string;
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
    const response = await axios.get<NominatimResult[]>(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
          countrycodes: "us",
        },
        headers: {
          "User-Agent": "GoOutAlready/1.0 (go-out-already@example.com)",
        },
        timeout: 5000,
      }
    );

    if (response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
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
