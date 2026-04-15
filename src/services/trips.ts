import type { AIDayResult } from "@/services/types";
import { auth, db } from "@/src/config/firebase";
import {
  getBestPhotoUrl,
  searchText,
  type PlaceV1,
} from "@/src/googlePlaces";
import type { ItineraryModel, ItineraryStatus, StopModel } from "@/src/models";
import {
  deleteSupabaseTripCover,
  pickProcessAndUploadTripCover,
} from "@/src/services/tripCovers";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

// ─── Itineraries ──────────────────────────────────────────────────────────────

/** Write (or overwrite) an itinerary document. */
export async function saveItinerary(itinerary: ItineraryModel): Promise<void> {
  await setDoc(doc(db, "itineraries", itinerary.id), itinerary);
}

/** Partially update an itinerary document. */
export async function updateItinerary(
  id: string,
  fields: Partial<ItineraryModel>
): Promise<void> {
  await updateDoc(doc(db, "itineraries", id), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

/** Fetch a single itinerary by ID. Returns null if not found. */
export async function getItinerary(id: string): Promise<ItineraryModel | null> {
  const snap = await getDoc(doc(db, "itineraries", id));
  return snap.exists() ? (snap.data() as ItineraryModel) : null;
}

/** Fetch all itineraries the current user is a member of. */
export async function getUserItineraries(): Promise<ItineraryModel[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const q = query(
    collection(db, "itineraries"),
    where("memberUids", "array-contains", userId),
    orderBy("startDate", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ItineraryModel);
}

async function fetchCityCoverImageUrl(
  cityOrArea: string,
  excludeUrl?: string | null
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_googlePlacesApiKey as string | undefined;
  if (!apiKey || !cityOrArea.trim()) return null;

  try {
    const resp = await searchText({
      apiKey,
      textQuery: cityOrArea,
      maxResultCount: 10,
    });

    const candidates = (resp.places ?? [])
      .filter((p: PlaceV1) => p.photos && p.photos.length > 0)
      .map((p) =>
        getBestPhotoUrl({
          apiKey,
          place: p,
          maxWidthPx: 1200,
        })
      )
      .filter((url): url is string => !!url)
      .filter((url) => url !== excludeUrl);

    if (candidates.length === 0) return null;

    const chosen =
      candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];

    return chosen;
  } catch {
    return null;
  }
}

export async function ensureTripCoverImage(
  trip: Pick<ItineraryModel, "id" | "cityOrArea" | "coverImageUrl">
): Promise<string | null> {
  if (trip.coverImageUrl) return trip.coverImageUrl;

  const url = await fetchCityCoverImageUrl(trip.cityOrArea);
  if (!url) return null;

  await updateItinerary(trip.id, { coverImageUrl: url });
  return url;
}

/**
 * Returns the best preview image for a trip:
 * user-uploaded Supabase imageUrl
 * Google Images coverImageUrl
 * backfill coverImageUrl if missing
 */
export async function getTripPreviewImageUri(
  trip: Pick<ItineraryModel, "id" | "cityOrArea" | "coverImageUrl" | "imageUrl">
): Promise<string | null> {
  if (trip.imageUrl) return trip.imageUrl;
  if (trip.coverImageUrl) return trip.coverImageUrl;

  const backfilled = await ensureTripCoverImage({
    id: trip.id,
    cityOrArea: trip.cityOrArea,
    coverImageUrl: trip.coverImageUrl ?? null,
  });

  return backfilled;
}

/**
 * Change the trip cover by selecting from the device photo library,
 * uploading to Supabase Storage, and saving the public URL to Firestore.
 */
export async function changeTripCoverPhoto(
  trip: Pick<ItineraryModel, "id" | "cityOrArea" | "coverImageUrl" | "imageUrl" | "imagePath">
): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("You must be signed in to update a trip cover.");
  }

  const existingTrip = await getItinerary(trip.id);
  const oldImagePath = existingTrip?.imagePath ?? null;

  const uploaded = await pickProcessAndUploadTripCover(uid, trip.id);
  if (!uploaded) {
    return await getTripPreviewImageUri(trip);
  }

  await updateItinerary(trip.id, {
    imageUrl: uploaded.publicUrl,
    imagePath: uploaded.storagePath,
  });

  if (oldImagePath && oldImagePath !== uploaded.storagePath) {
    try {
      await deleteSupabaseTripCover(oldImagePath);
    } catch {
      // non-fatal
    }
  }

  return uploaded.publicUrl;
}

// ─── Joining ──────────────────────────────────────────────────────────────────

/**
 * Find an itinerary by its invite code without joining.
 * Returns the itinerary if found, null if the code is invalid.
 */
export async function findItineraryByCode(
  inviteCode: string
): Promise<ItineraryModel | null> {
  const q = query(
    collection(db, "itineraries"),
    where("inviteCode", "==", inviteCode),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as ItineraryModel;
}

/**
 * Find an itinerary by its invite code and add the current user as an editor.
 * Returns the itinerary if found, null if the code is invalid.
 */
export async function joinItineraryByCode(
  inviteCode: string,
  selectedInterests: string[] = []
): Promise<ItineraryModel | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const q = query(
    collection(db, "itineraries"),
    where("inviteCode", "==", inviteCode),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const ref = snap.docs[0].ref;
  const itinerary = snap.docs[0].data() as ItineraryModel;

  if (itinerary.memberUids.includes(user.uid)) {
    await updateDoc(ref, {
      [`memberInterestsByUid.${user.uid}`]: selectedInterests,
      updatedAt: new Date().toISOString(),
    });

    return itinerary;
  }

  await updateDoc(ref, {
    memberUids: arrayUnion(user.uid),
    memberUsernames: arrayUnion(user.displayName ?? user.email ?? ""),
    [`memberInterestsByUid.${user.uid}`]: selectedInterests,
    updatedAt: new Date().toISOString(),
  });

  return itinerary;
}

// ─── Stops ────────────────────────────────────────────────────────────────────

/** Partially update a stop document. */
export async function updateStop(
  itineraryId: string,
  stopId: string,
  fields: Partial<StopModel>
): Promise<void> {
  await updateDoc(doc(db, "itineraries", itineraryId, "stops", stopId), fields);
}

/** Delete a stop from an itinerary and atomically decrement stopCount. */
export async function deleteStop(
  itineraryId: string,
  stopId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "itineraries", itineraryId, "stops", stopId));
  batch.update(doc(db, "itineraries", itineraryId), {
    stopCount: increment(-1),
    updatedAt: new Date().toISOString(),
  });
  await batch.commit();
}

/** Batch-update both orderIndex and timeLabel for a reordered + relabelled list. */
export async function reorderAndRelabelStops(
  itineraryId: string,
  stops: { id: string; timeLabel: string }[]
): Promise<void> {
  const batch = writeBatch(db);
  stops.forEach(({ id, timeLabel }, index) => {
    batch.update(
      doc(db, "itineraries", itineraryId, "stops", id),
      { orderIndex: index, timeLabel }
    );
  });
  await batch.commit();
}

/** Batch-update orderIndex for a reordered list of stop IDs. */
export async function reorderStops(
  itineraryId: string,
  orderedStopIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  orderedStopIds.forEach((stopId, index) => {
    batch.update(
      doc(db, "itineraries", itineraryId, "stops", stopId),
      { orderIndex: index }
    );
  });
  await batch.commit();
}

/** Write a stop under an itinerary. */
export async function saveStop(
  itineraryId: string,
  stop: StopModel
): Promise<void> {
  await setDoc(
    doc(db, "itineraries", itineraryId, "stops", stop.id),
    stop
  );
}

/** Fetch all stops for an itinerary, ordered by their position. */
export async function getStops(itineraryId: string): Promise<StopModel[]> {
  const q = query(
    collection(db, "itineraries", itineraryId, "stops"),
    orderBy("orderIndex", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StopModel);
}

/** Fetch stops for a specific day within an itinerary. */
export async function getStopsForDay(
  itineraryId: string,
  day: string // "YYYY-MM-DD"
): Promise<StopModel[]> {
  // No orderBy to avoid composite index requirement — sort in JS instead.
  const q = query(
    collection(db, "itineraries", itineraryId, "stops"),
    where("day", "==", day)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as StopModel)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

// ─── Travel estimation ────────────────────────────────────────────────────────

function haversineKm(
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

/**
 * For every consecutive pair of stops in the ordered list, compute Haversine-based
 * travel mode and estimated minutes, then batch-write back to Firestore.
 * The last stop always gets null (no next stop). Pairs where either stop has
 * lat=0/lng=0 (geocoding failed) are also set to null.
 */
export async function persistTravelForDay(
  itineraryId: string,
  orderedStops: StopModel[]
): Promise<void> {
  if (orderedStops.length === 0) return;

  const batch = writeBatch(db);

  for (let i = 0; i < orderedStops.length; i++) {
    const stop = orderedStops[i];
    const next = orderedStops[i + 1];
    const ref = doc(db, "itineraries", itineraryId, "stops", stop.id);

    if (
      next &&
      stop.lat !== 0 && stop.lng !== 0 &&
      next.lat !== 0 && next.lng !== 0
    ) {
      const dist = haversineKm(stop, next);
      const travelMode = dist < 1.5 ? "walk" : "drive";
      const speed = travelMode === "walk" ? 5 : 40;
      const roadDist = dist * (travelMode === "drive" ? 1.25 : 1.0);
      const travelMinutes = Math.max(1, Math.round((roadDist / speed) * 60));
      batch.update(ref, { travelMode, travelMinutes });
    } else {
      batch.update(ref, { travelMode: null, travelMinutes: null });
    }
  }

  await batch.commit();
}

// ─── AI Itinerary Save ────────────────────────────────────────────────────────

type SaveAiParams = {
  cityOrArea: string;
  radiusMiles: number | undefined;
  startDate: string;
  endDate: string;
  interests: string[];
};

function computeStatus(startDate: string, endDate: string): ItineraryStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (endDate < today) return "past";
  if (startDate <= today) return "current";
  return "upcoming";
}

async function generateUniqueInviteCode(cityOrArea: string): Promise<string> {
  const prefix = cityOrArea.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  while (true) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${prefix}-${suffix}`;
    const existing = await findItineraryByCode(code);
    if (!existing) return code;
  }
}

/**
 * Saves an AI-generated itinerary to Firestore.
 * Writes the root ItineraryModel doc and a StopModel for every resolved activity.
 * Returns the new itinerary ID.
 */
export async function saveAiItinerary(
  params: SaveAiParams,
  aiDays: AIDayResult[]
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to save an itinerary.");

  const itineraryId = doc(collection(db, "itineraries")).id;
  const now = new Date().toISOString();

  const allActivities = aiDays.flatMap((day) =>
    day.activities.map((act) => ({ ...act, day: day.date }))
  );

  const stopIds = allActivities.map((_, i) => `${itineraryId}_stop_${i}`);
  const inviteCode = await generateUniqueInviteCode(params.cityOrArea);
  const coverImageUrl = await fetchCityCoverImageUrl(params.cityOrArea);

  const itinerary: ItineraryModel = {
    id: itineraryId,
    ownerUid: user.uid,
    title: `${params.cityOrArea} Trip`,
    cityOrArea: params.cityOrArea,
    startDate: params.startDate,
    endDate: params.endDate,
    radiusMiles: params.radiusMiles ?? null,
    interests: params.interests,
    stops: stopIds,
    imageUrl: null,
    imagePath: null,
    coverImageUrl,
    memberUids: [user.uid],
    memberUsernames: [user.displayName ?? user.email ?? ""],
    inviteCode,
    status: computeStatus(params.startDate, params.endDate),
    accommodation: null,
    notes: null,
    stopCount: allActivities.length,
    createdAt: now,
    updatedAt: now,
  };

  await saveItinerary(itinerary);

  for (let i = 0; i < allActivities.length; i++) {
    const act = allActivities[i];
    const stop: StopModel = {
      id: stopIds[i],
      orderIndex: i,
      day: act.day,
      timeLabel: act.aiTime ?? null,
      duration: act.aiDurationMinutes ? `${act.aiDurationMinutes} min` : null,
      placeId: act.id,
      name: act.name,
      address: act.address ?? "",
      photoUrl: act.imageUrl ?? null,
      lat: act.lat,
      lng: act.lng,
      rating: act.rating ?? null,
      userRatingCount: act.userRatingCount ?? null,
      types: act.types ?? [],
      briefSummary: null,
      travelMode: act.aiTravelMode ?? null,
      travelMinutes: act.aiCommuteMinutes ?? null,
      category: act.aiCategory ?? null,
    };
    await saveStop(itineraryId, stop);
  }

  return itineraryId;
}