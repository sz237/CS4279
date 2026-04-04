import { auth, db } from "@/src/config/firebase";
import {
    deleteSupabaseAvatar,
    pickProcessAndUploadAvatar,
} from "@/src/services/avatars";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function updateCurrentUserAvatarFromPicker(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in.");
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.exists() ? userSnap.data() : null;

  const oldPhotoPath = (existing?.photoPath as string | null | undefined) ?? null;

  const uploaded = await pickProcessAndUploadAvatar(user.uid);
  if (!uploaded) {
    return null;
  }

  await updateDoc(userRef, {
    photoURL: uploaded.publicUrl,
    photoPath: uploaded.storagePath,
  });

  if (oldPhotoPath && oldPhotoPath !== uploaded.storagePath) {
    try {
      await deleteSupabaseAvatar(oldPhotoPath);
    } catch {
      // non-fatal
    }
  }

  return uploaded.publicUrl;
}