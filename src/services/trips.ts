import { db, auth } from "@/src/config/firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { ItineraryModel, StopModel } from "@/src/models";

// ─── Itineraries ──────────────────────────────────────────────────────────────

/** Write (or overwrite) an itinerary document. */
export async function saveItinerary(itinerary: ItineraryModel): Promise<void> {
  await setDoc(doc(db, "itineraries", itinerary.id), itinerary);
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
 * Find an itinerary by its invite code and add the current user as an editor.
 * Returns the itinerary if found, null if the code is invalid.
 */
export async function joinItineraryByCode(
  inviteCode: string
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

  // Already a member — nothing to do
  if (itinerary.memberUids.includes(user.uid)) return itinerary;

  await updateDoc(ref, {
    memberUids: arrayUnion(user.uid),
    memberUsernames: arrayUnion(user.displayName ?? user.email ?? ""),
    updatedAt: new Date().toISOString(),
  });

  return itinerary;
}

// ─── Stops ────────────────────────────────────────────────────────────────────

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
