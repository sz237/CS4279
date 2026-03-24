/**
 * Firestore path: users/{uid}
 */
export interface UserModel {
  uid: string;
  email: string; // private — do NOT expose publicly
  username: string; // unique lowercase handle, e.g. "averyk"
  displayName: string; // shown in UI, e.g. "Avery Kim"
  photoURL: string | null;
  bio: string | null;
  settings: UserSettings;
  createdAt: string; // ISO timestamp
}

export interface UserSettings {
  pushNotifications: boolean;
  dailyReminders: boolean;
}

/**
 * Firestore path: usernames/{username}
 *
 * Lookup collection so you can enforce unique usernames and resolve
 * a username → uid in a single read.
 */
export interface UsernameRecord {
  uid: string;
}

/**
 * Firestore path: users/{uid}/following/{followingUid}
 * Snapshot of the followed user stored here for cheap list rendering.
 */
export interface FollowingRecord {
  followingUid: string;
  followingUsername: string;
  followingDisplayName: string;
  followingPhotoURL: string | null;
}

/**
 * Firestore path: users/{uid}/followers/{followerUid}
 */
export interface FollowerRecord {
  followerUid: string;
  followerUsername: string;
  followerDisplayName: string;
  followerPhotoURL: string | null;
}
