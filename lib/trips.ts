import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

export type TripStop = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;

  // Optional metadata for nicer UI
  imageUrl?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
};

export type SavedTrip = {
  tripId: string;
  createdAt: string;

  cityOrArea: string;
  radiusMiles?: number;
  startDate: string;
  endDate: string;
  interests: string[];

  stops: TripStop[];
};

const KEY = "NOMAD_SAVED_TRIPS_V1";

export async function getSavedTrips(): Promise<SavedTrip[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedTrip[];
  } catch {
    return [];
  }
}

export async function saveTrip(trip: SavedTrip): Promise<void> {
  const trips = await getSavedTrips();
  const next = [trip, ...trips];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

// ---------- Maps helpers ----------
export function googleMapsUrlForStop(stop: Pick<TripStop, "lat" | "lng" | "name">) {
  // Uses lat/lng for accuracy
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stop.lat},${stop.lng} (${stop.name})`
  )}`;
}

export async function openStopInGoogleMaps(stop: Pick<TripStop, "lat" | "lng" | "name">) {
  const url = googleMapsUrlForStop(stop);
  const can = await Linking.canOpenURL(url);
  if (!can) throw new Error("Cannot open Google Maps URL");
  await Linking.openURL(url);
}