import { auth, db } from "@/src/config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
} from "firebase/firestore";

export type ProfileUser = {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  bio: string | null;
};

export type FollowListItem = {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
};

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
  memberUids: string[];
  memberUsernames: string[];
  roleByUid: Record<string, "owner" | "editor">;
  createdAt?: any;
  updatedAt?: any;
  stopCount?: number;
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
    bio: data.bio ?? null,
  };
}

export async function updateCurrentUserProfile(params: {
  displayName: string;
  username: string;
  photoURL: string | null;
}) {
  const current = auth.currentUser;
  if (!current) throw new Error("You must be signed in.");

  const displayName = params.displayName.trim();
  const username = normalizeUsername(params.username);
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
        bio: existing?.bio ?? null,
      },
      { merge: true }
    );

    batch.set(doc(db, "usernames", username), { uid: current.uid });

    if (oldUsername && oldUsername !== username) {
      batch.delete(doc(db, "usernames", oldUsername));
    }

    await batch.commit();
  } else {
    await writeBatch(db)
      .set(
        userRef,
        {
          uid: current.uid,
          email: existing?.email ?? current.email ?? "",
          username,
          displayName,
          photoURL,
          bio: existing?.bio ?? null,
        },
        { merge: true }
      )
      .commit();
  }

  await updateAuthProfile(current, {
    displayName,
    photoURL: photoURL ?? undefined,
  });
}

export async function getFollowing(uid: string): Promise<FollowListItem[]> {
  const snap = await getDocs(collection(db, "users", uid, "following"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      uid: x.followingUid,
      username: x.followingUsername,
      displayName: x.followingDisplayName,
      photoURL: x.followingPhotoURL ?? null,
    };
  });
}

export async function getFollowers(uid: string): Promise<FollowListItem[]> {
  const snap = await getDocs(collection(db, "users", uid, "followers"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      uid: x.followerUid,
      username: x.followerUsername,
      displayName: x.followerDisplayName,
      photoURL: x.followerPhotoURL ?? null,
    };
  });
}

export function getFakeFollowing(): FollowListItem[] {
  return [
    {
      uid: "demo-following-1",
      username: "ava_travels",
      displayName: "Ava Patel",
      photoURL: null,
    },
    {
      uid: "demo-following-2",
      username: "milesaway",
      displayName: "Miles Turner",
      photoURL: null,
    },
    {
      uid: "demo-following-3",
      username: "rlu",
      displayName: "Rosalyn Lu",
      photoURL: "https://i.insider.com/5df14d0ee94e860668396b82?width=700",
    },
    {
      uid: "demo-following-4",
      username: "tvtruong",
      displayName: "Trieu Truong",
      photoURL:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2F0c3xlbnwwfHwwfHx8MA%3D%3D",
    },
    {
      uid: "demo-following-5",
      username: "tamaraq",
      displayName: "Tamara Quiroz",
      photoURL:
        "https://www.chromethemer.com/backgrounds/google/images/beach-puppy-google-background.jpg",
    },
  ];
}

export function getFakeFollowers(): FollowListItem[] {
  return [
    {
      uid: "demo-follower-1",
      username: "rlu",
      displayName: "Rosalyn Lu",
      photoURL: "https://i.insider.com/5df14d0ee94e860668396b82?width=700",
    },
    {
      uid: "demo-follower-2",
      username: "tvtruong",
      displayName: "Trieu Truong",
      photoURL:
        "https://images.unsplash.com/photo-1543852786-1cf6624b9987?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2F0c3xlbnwwfHwwfHx8MA%3D%3D",
    },
    {
      uid: "demo-follower-3",
      username: "tamaraq",
      displayName: "Tamara Quiroz",
      photoURL:
        "https://www.chromethemer.com/backgrounds/google/images/beach-puppy-google-background.jpg",
    },
  ];
}

// ---------- NEW: use fake lists directly for UI right now ----------
export function getFollowingForUI(_firestoreItems?: FollowListItem[]) {
  return getFakeFollowing();
}

export function getFollowersForUI(_firestoreItems?: FollowListItem[]) {
  return getFakeFollowers();
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

// ---------- NEW: auto-generate shareable trip link ----------
export function generateTripShareLink(itineraryId: string) {
  return `https://nomad.app/trip/${encodeURIComponent(itineraryId)}`;
}