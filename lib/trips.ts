import AsyncStorage from "@react-native-async-storage/async-storage";

export type TripStop = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
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