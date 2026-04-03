import { supabase } from "@/src/config/supabase";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * Pick an avatar from the device photo library, crop it square,
 * resize/compress it to 400x400 JPEG, upload to Supabase Storage,
 * and return the public URL.
 */
export async function pickProcessAndUploadAvatar(uid: string): Promise<string | null> {
  // ask for media library permission
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required.");
  }

  // open library with square crop UI
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (picked.canceled || !picked.assets?.length) {
    return null;
  }

  const asset = picked.assets[0];
  if (!asset.uri) {
    throw new Error("No image URI returned from picker.");
  }

  // resize/compress to exactly 400x400
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 400, height: 400 } }],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  // read processed file into ArrayBuffer for Supabase upload
  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();

  // upload to a stable path per user
  const filePath = `public/${uid}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // get public URL
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Could not generate public URL for avatar.");
  }

  return data.publicUrl;
}