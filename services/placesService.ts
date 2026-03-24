import {
  getBestAddress,
  getBestName,
  getBestPhotoUrl,
  searchText,
  type PlaceV1,
} from "@/src/googlePlaces";
import type { TripStop } from "@/lib/trips";
import type { Activity } from "@/components/itinerary/ActivityCard";

export function placeToStop(apiKey: string, p: PlaceV1): TripStop {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Place missing coordinates");
  }

  return {
    id: p.id,
    name: getBestName(p),
    address: getBestAddress(p),
    lat,
    lng,
    imageUrl: getBestPhotoUrl({ apiKey, place: p, maxWidthPx: 1200 }),
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    types: p.types,
  };
}

export function stopToActivity(
  stop: TripStop,
  opts: { labelRight?: string }
): Activity {
  const ratingStr =
    stop.rating != null
      ? `${stop.rating.toFixed(1)}★ (${stop.userRatingCount ?? 0})`
      : "";

  return {
    id: stop.id,
    title: stop.name,
    description: stop.address ?? "",
    time: opts.labelRight ?? ratingStr,
    duration: (stop.types?.[0] ?? "").replaceAll("_", " "),
    imageUrl: stop.imageUrl,
  };
}

export async function geocodeCity(
  apiKey: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  const resp = await searchText({ apiKey, textQuery: city, maxResultCount: 1 });
  const p = resp.places?.[0];
  if (p?.location) return { lat: p.location.latitude, lng: p.location.longitude };
  return null;
}

export async function searchPlaces(
  apiKey: string,
  textQuery: string,
  maxResultCount: number,
  locationBias?: { center: { lat: number; lng: number }; radiusMeters: number }
): Promise<PlaceV1[]> {
  const resp = await searchText({ apiKey, textQuery, maxResultCount, locationBias });
  return (resp.places ?? []).filter(
    (p) =>
      typeof p.location?.latitude === "number" &&
      typeof p.location?.longitude === "number"
  );
}

export async function resolveActivityName(
  apiKey: string,
  name: string,
  city: string
): Promise<TripStop | null> {
  try {
    const resp = await searchText({
      apiKey,
      textQuery: `${name} ${city}`,
      maxResultCount: 1,
    });
    const p = resp.places?.[0];
    if (
      p &&
      typeof p.location?.latitude === "number" &&
      typeof p.location?.longitude === "number"
    ) {
      return placeToStop(apiKey, p);
    }
  } catch {
    // unresolvable name — skip
  }
  return null;
}
