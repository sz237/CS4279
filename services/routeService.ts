import type { TripStop } from "@/lib/trips";
import type { TravelMode } from "./types";

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestNeighborRoute(stops: TripStop[]): TripStop[] {
  if (stops.length <= 2) return stops;

  const remaining = stops.slice(1);
  const route: TripStop[] = [stops[0]];
  let curr = stops[0];

  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(
        { lat: curr.lat, lng: curr.lng },
        { lat: remaining[i].lat, lng: remaining[i].lng }
      );
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    curr = next;
  }
  return route;
}

export function estimateTravelMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TravelMode
): number {
  const km = haversineKm(from, to);
  const speedKmh = mode === "walk" ? 5 : mode === "transit" ? 25 : 40;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

export function parseTravelMode(raw: string): TravelMode {
  const s = raw.toLowerCase();
  if (s === "walk") return "walk";
  if (s === "transit") return "transit";
  return "drive";
}
