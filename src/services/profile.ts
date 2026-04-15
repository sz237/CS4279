import { auth, db } from "@/src/config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

export type ProfileUser = {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  photoPath: string | null;
  bio: string | null;
};

export type FriendItem = {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
};

export type FriendRequest = {
  fromUid: string;
  fromUsername: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  createdAt?: any;
};

export type FriendStatus = "friends" | "pending_sent" | "pending_received" | "none";

export type ItineraryDoc = {
  id: string;
  ownerUid: string;
  title: string;
  cityOrArea: string;
  startDate: string;
  endDate: string;
  radiusMiles: number | null;
  interests: string[];
  stops: string[];
  imageUrl?: string | null;
  imagePath?: string | null;
  coverImageUrl?: string | null;
  memberUids: string[];
  memberUsernames: string[];
  roleByUid?: Record<string, "owner" | "editor">;
  createdAt?: any;
  updatedAt?: any;
  stopCount?: number;
  inviteCode?: string;
  status?: "current" | "upcoming" | "past";
  accommodation?: { name: string; address: string } | null;
  notes?: string | null;
};

export type LocalTripMeta = {
  rating: number;
  shareUrl: string;
};

const TRIP_META_KEY = "nomad_trip_meta_v1";

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/^@+/, "");
}

export async function getCurrentUserProfile(): Promise<ProfileUser | null> {
  const current = auth.currentUser;
  if (!current) return null;

  const ref = doc(db, "users", current.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      uid: current.uid,
      email: current.email ?? "",
      username: "",
      displayName: current.displayName ?? "",
      photoURL: current.photoURL ?? null,
      photoPath: null,
      bio: null,
    };
  }

  const data = snap.data() as Partial<ProfileUser>;

  return {
    uid: data.uid ?? current.uid,
    email: data.email ?? current.email ?? "",
    username: data.username ?? "",
    displayName: data.displayName ?? current.displayName ?? "",
    photoURL: data.photoURL ?? current.photoURL ?? null,
    photoPath: data.photoPath ?? null,
    bio: data.bio ?? null,
  };
}

export async function updateCurrentUserProfile(params: {
  displayName: string;
  username: string;
  bio: string;
  photoURL: string | null;
}) {
  const current = auth.currentUser;
  if (!current) throw new Error("You must be signed in.");

  const displayName = params.displayName.trim();
  const username = normalizeUsername(params.username);
  const bio = params.bio.trim() || null;
  const photoURL = params.photoURL?.trim() ? params.photoURL.trim() : null;

  if (!displayName) throw new Error("Display name is required.");
  if (!username) throw new Error("Username is required.");

  const userRef = doc(db, "users", current.uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.exists() ? (userSnap.data() as Partial<ProfileUser>) : null;
  const oldUsername = existing?.username ? normalizeUsername(existing.username) : "";

  if (oldUsername !== username) {
    const newUsernameRef = doc(db, "usernames", username);
    const newUsernameSnap = await getDoc(newUsernameRef);

    if (newUsernameSnap.exists()) {
      const ownerUid = newUsernameSnap.data()?.uid;
      if (ownerUid !== current.uid) {
        throw new Error("That username is already taken.");
      }
    }

    const batch = writeBatch(db);

    batch.set(
      userRef,
      {
        uid: current.uid,
        email: existing?.email ?? current.email ?? "",
        username,
        displayName,
        photoURL,
        photoPath: existing?.photoPath ?? null,
        bio,
      },
      { merge: true }
    );

    batch.set(doc(db, "usernames", username), { uid: current.uid });

    if (oldUsername && oldUsername !== username) {
      batch.delete(doc(db, "usernames", oldUsername));
    }

    await batch.commit();
  } else {
    const batch = writeBatch(db);
    batch.set(
      userRef,
      {
        uid: current.uid,
        email: existing?.email ?? current.email ?? "",
        username,
        displayName,
        photoURL,
        photoPath: existing?.photoPath ?? null,
        bio,
      },
      { merge: true }
    );
    await batch.commit();
  }

  await updateAuthProfile(current, {
    displayName,
    photoURL: photoURL ?? undefined,
  });
}

export async function getUserPublicProfile(uid: string): Promise<ProfileUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<ProfileUser>;
  return {
    uid,
    email: "",
    username: data.username ?? "",
    displayName: data.displayName ?? "",
    photoURL: data.photoURL ?? null,
    photoPath: data.photoPath ?? null,
    bio: data.bio ?? null,
  };
}

export async function getFriends(uid: string): Promise<FriendItem[]> {
  const snap = await getDocs(collection(db, "users", uid, "friends"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      uid: x.friendUid,
      username: x.friendUsername,
      displayName: x.friendDisplayName,
      photoURL: x.friendPhotoURL ?? null,
    };
  });
}

export async function getPendingRequests(uid: string): Promise<FriendRequest[]> {
  const snap = await getDocs(collection(db, "users", uid, "friendRequests"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      fromUid: x.fromUid,
      fromUsername: x.fromUsername,
      fromDisplayName: x.fromDisplayName,
      fromPhotoURL: x.fromPhotoURL ?? null,
      createdAt: x.createdAt,
    };
  });
}

export async function sendFriendRequest(to: FriendItem): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("You must be signed in.");

  const currentProfile = await getCurrentUserProfile();
  await setDoc(doc(db, "users", to.uid, "friendRequests", current.uid), {
    fromUid: current.uid,
    fromUsername: currentProfile?.username ?? "",
    fromDisplayName: currentProfile?.displayName ?? current.displayName ?? "",
    fromPhotoURL: currentProfile?.photoURL ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(from: FriendRequest): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("You must be signed in.");

  const currentProfile = await getCurrentUserProfile();
  const batch = writeBatch(db);

  batch.set(doc(db, "users", current.uid, "friends", from.fromUid), {
    friendUid: from.fromUid,
    friendUsername: from.fromUsername,
    friendDisplayName: from.fromDisplayName,
    friendPhotoURL: from.fromPhotoURL,
  });

  batch.set(doc(db, "users", from.fromUid, "friends", current.uid), {
    friendUid: current.uid,
    friendUsername: currentProfile?.username ?? "",
    friendDisplayName: currentProfile?.displayName ?? current.displayName ?? "",
    friendPhotoURL: currentProfile?.photoURL ?? null,
  });

  batch.delete(doc(db, "users", current.uid, "friendRequests", from.fromUid));

  await batch.commit();
}

export async function rejectFriendRequest(fromUid: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("You must be signed in.");
  await deleteDoc(doc(db, "users", current.uid, "friendRequests", fromUid));
}

export async function removeFriend(friendUid: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("You must be signed in.");
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", current.uid, "friends", friendUid));
  batch.delete(doc(db, "users", friendUid, "friends", current.uid));
  await batch.commit();
}

export async function getFriendStatus(otherUid: string): Promise<FriendStatus> {
  const current = auth.currentUser;
  if (!current) return "none";

  const [friendSnap, sentSnap, receivedSnap] = await Promise.all([
    getDoc(doc(db, "users", current.uid, "friends", otherUid)),
    getDoc(doc(db, "users", otherUid, "friendRequests", current.uid)),
    getDoc(doc(db, "users", current.uid, "friendRequests", otherUid)),
  ]);

  if (friendSnap.exists()) return "friends";
  if (sentSnap.exists()) return "pending_sent";
  if (receivedSnap.exists()) return "pending_received";
  return "none";
}

export async function getOwnedItineraries(uid: string): Promise<ItineraryDoc[]> {
  const q = query(collection(db, "itineraries"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const x = d.data() as Omit<ItineraryDoc, "id">;
    return {
      id: d.id,
      ...x,
    };
  });
}

export async function deleteOwnedItineraries(itineraryIds: string[]) {
  const batch = writeBatch(db);

  for (const itineraryId of itineraryIds) {
    const stopsSnap = await getDocs(collection(db, "itineraries", itineraryId, "stops"));
    stopsSnap.forEach((stopDoc) => {
      batch.delete(stopDoc.ref);
    });

    batch.delete(doc(db, "itineraries", itineraryId));
  }

  await batch.commit();
}

export async function getTripMetaMap(): Promise<Record<string, LocalTripMeta>> {
  const raw = await AsyncStorage.getItem(TRIP_META_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, LocalTripMeta>;
  } catch {
    return {};
  }
}

export async function setTripMeta(itineraryId: string, meta: LocalTripMeta) {
  const map = await getTripMetaMap();
  map[itineraryId] = meta;
  await AsyncStorage.setItem(TRIP_META_KEY, JSON.stringify(map));
}

export async function deleteTripMetaMany(itineraryIds: string[]) {
  const map = await getTripMetaMap();
  for (const id of itineraryIds) {
    delete map[id];
  }
  await AsyncStorage.setItem(TRIP_META_KEY, JSON.stringify(map));
}

export function generateTripShareLink(itineraryId: string) {
  return `https://nomad.app/trip/${itineraryId}`;
}