import { updateCurrentUserAvatarFromPicker } from "@/src/services/avatarURLs";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Text, TouchableOpacity } from "react-native";

type Props = {
  onUpdated?: (newUrl: string) => void;
};

export function ChangeAvatarButton({ onUpdated }: Props) {
  const [loading, setLoading] = useState(false);

  const handleChangeAvatar = async () => {
    try {
      setLoading(true);

      const publicUrl = await updateCurrentUserAvatarFromPicker();
      if (!publicUrl) return;

      onUpdated?.(publicUrl);
      Alert.alert("Success", "Your profile photo has been updated.");
    } catch (error: any) {
      Alert.alert(
        "Upload failed",
        error?.message ?? "Could not update avatar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleChangeAvatar}
      activeOpacity={0.85}
      disabled={loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.82)",
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Ionicons name="image-outline" size={16} color="#4F46E5" />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 14,
          fontWeight: "500",
          color: "#4F46E5",
        }}
      >
        {loading ? "Updating..." : "Change Avatar"}
      </Text>
    </TouchableOpacity>
  );
}