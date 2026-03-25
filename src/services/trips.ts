import type { AIDayResult } from "@/services/types";
import { auth, db } from "@/src/config/firebase";
import type { ItineraryModel, ItineraryStatus, StopModel } from "@/src/models";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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

/** Delete a stop from an itinerary. */
export async function deleteStop(
  itineraryId: string,
  stopId: string
): Promise<void> {
  await deleteDoc(doc(db, "itineraries", itineraryId, "stops", stopId));
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
  const q = query(
    collection(db, "itineraries", itineraryId, "stops"),
    where("day", "==", day),
    orderBy("orderIndex", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StopModel);
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

  // Flatten all activities to build the ordered stop list
  const allActivities = aiDays.flatMap((day) =>
    day.activities.map((act) => ({ ...act, day: day.date }))
  );

  const stopIds = allActivities.map((_, i) => `${itineraryId}_stop_${i}`);
  const inviteCode = await generateUniqueInviteCode(params.cityOrArea);

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
