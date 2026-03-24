/**
 * Firestore path: places/{placeId}
 *
 * Cached Google Places data. placeId is the Google Place ID.
 * Written on first save so subsequent reads avoid extra API calls.
 */
export interface PlaceModel {
  id: string; // Google Place ID
  name: string;
  address: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  rating?: number;
  userRatingCount?: number;
  types: string[]; // e.g. ["restaurant", "food"]
}
