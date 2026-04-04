import { supabase } from "@/src/config/supabase";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const TRIP_COVER_HEIGHT = 800;
const TRIP_COVER_WIDTH = 1200;

export type UploadedTripCoverResult = {
  publicUrl: string;
  storagePath: string;
};

export async function deleteSupabaseTripCover(storagePath: string | null | undefined) {
  if (!storagePath) return;

  const { error } = await supabase.storage.from("trip-covers").remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function pickProcessAndUploadTripCover(
  uid: string,
  tripId: string
): Promise<UploadedTripCoverResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required.");
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [3, 2],
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
    [{ resize: { width: TRIP_COVER_WIDTH, height: TRIP_COVER_HEIGHT } }],
    {
      compress: 0.82,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();

  const timestamp = Date.now();
  const filePath = `public/${uid}/${tripId}/cover-${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("trip-covers")
    .upload(filePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("trip-covers").getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Could not generate public URL for trip cover.");
  }

  return {
    publicUrl: data.publicUrl,
    storagePath: filePath,
  };
}