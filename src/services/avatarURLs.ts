import { auth, db } from "@/src/config/firebase";
import { doc, updateDoc } from "firebase/firestore";

/**
 * Writes the new avatar URL into Firestore users/{uid}.photoURL
 */
export async function updateCurrentUserPhotoURL(photoURL: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in.");
  }

  await updateDoc(doc(db, "users", user.uid), {
    photoURL,
  });
}