import { supabase } from "@/src/config/supabase";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type UploadedAvatarResult = {
  publicUrl: string;
  storagePath: string;
};

export async function deleteSupabaseAvatar(storagePath: string | null | undefined) {
  if (!storagePath) return;

  const { error } = await supabase.storage.from("avatars").remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Pick an avatar from the device photo library, crop it square,
 * resize/compress it to 400x400 JPEG, upload it to Supabase Storage,
 * and return both the public URL and storage path.
 */
export async function pickProcessAndUploadAvatar(
  uid: string
): Promise<UploadedAvatarResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required.");
  }

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

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 400, height: 400 } }],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();

  const timestamp = Date.now();
  const filePath = `public/${uid}/avatar-${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Could not generate public URL for avatar.");
  }

  return {
    publicUrl: data.publicUrl,
    storagePath: filePath,
  };
}