/**
 * Firestore path: itineraries/{itineraryId}
 *
 * Created by one user (owner). Others join via an invite link/code.
 * Stops live in a subcollection.
 */
export interface ItineraryModel {
  id: string;
  ownerUid: string;
  title: string; // e.g. "NYC Spring Break"
  cityOrArea: string; // e.g. "New York, NY"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  radiusMiles: number | null;
  interests: string[]; // e.g. ["museums", "local cuisine"]
  stops: string[]; // ordered array of stopIds

  // Access control
  // ownerUid is always at index 0; everyone else in memberUids is an editor
  memberUids: string[];
  memberUsernames: string[]; // snapshot — avoids extra reads in UI

  // Invite — owner shares this code/link; anyone with it can join
  inviteCode: string; // short random code, e.g. "NYC-4X9K"

  // Status (derived from dates but stored for cheap home screen queries)
  status: ItineraryStatus;

  // Extra details shown on overview screen
  accommodation: Accommodation | null;
  notes: string | null;

  // Quick count (avoids reading subcollection just for a length)
  stopCount: number;

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type ItineraryStatus = "current" | "upcoming" | "past";

export interface Accommodation {
  name: string;
  address: string;
}

/**
 * Firestore path: itineraries/{itineraryId}/stops/{stopId}
 *
 * A single stop. The day and time fields are optional so stops work
 * both in a flat "places list" mode and a day-by-day itinerary mode.
 */
export interface StopModel {
  id: string;
  orderIndex: number; // 0, 1, 2… for drag-drop ordering

  // Day/time — optional (null when user hasn't assigned a day yet)
  day: string | null; // "YYYY-MM-DD"
  timeLabel: string | null; // "9:00 AM"
  duration: string | null; // "1.5 hours"

  // Place data (from Google Places)
  placeId: string; // Google Place ID (stable)
  name: string;
  address: string;
  photoUrl: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  types: string[];

  // AI-generated summary
  briefSummary: string | null;

  // AI trip planning metadata
  travelMode: string | null;    // "walking" / "driving" / "transit" to the next stop
  travelMinutes: number | null; // estimated commute duration to the next stop
  category: string | null;      // e.g. "coffee shop", "restaurant", "attraction"
}
