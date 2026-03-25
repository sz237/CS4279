import { auth } from "@/src/config/firebase";
import {
    getCurrentUserProfile,
    updateCurrentUserProfile,
} from "@/src/services/profile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export default function EditProfileScreen() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile();
      setDisplayName(profile?.displayName ?? auth.currentUser?.displayName ?? "");
      setUsername(profile?.username ?? "");
      setPhotoURL(profile?.photoURL ?? auth.currentUser?.photoURL ?? "");
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCurrentUserProfile({
        displayName,
        username,
        photoURL: photoURL || null,
      });
      Alert.alert("Saved", "Your profile was updated.");
      router.back();
    } catch (error: any) {
      Alert.alert("Save failed", error?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initials = initialsFromName(displayName || "U");

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20 }}>
      <View className="items-center">
        {photoURL ? (
          <Image
            source={{ uri: photoURL }}
            style={{ width: 110, height: 110, borderRadius: 55 }}
          />
        ) : (
          <View className="h-[110px] w-[110px] items-center justify-center rounded-full bg-indigo-100">
            <Text className="text-3xl font-semibold text-indigo-600">{initials}</Text>
          </View>
        )}
      </View>

      <View className="mt-6 gap-4">
        <View>
          <Text className="mb-2 text-base font-semibold text-gray-900">Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base"
          />
        </View>

        <View>
          <Text className="mb-2 text-base font-semibold text-gray-900">Username</Text>
          <TextInput
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/^@+/, ""))}
            placeholder="username"
            autoCapitalize="none"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base"
          />
          <Text className="mt-1 text-sm text-slate-500">
            Unique string of characters.
          </Text>
        </View>

        <View>
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Profile image URL
          </Text>
          <TextInput
            value={photoURL}
            onChangeText={setPhotoURL}
            placeholder="https://..."
            autoCapitalize="none"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base"
          />
          <Text className="mt-1 text-sm text-slate-500">
            Firebase Storage TBA.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          className="mt-2 flex-row items-center justify-center rounded-2xl bg-gray-900 py-4"
        >
          <Ionicons name="save-outline" size={18} color="#FFFFFF" />
          <Text className="ml-2 text-base font-semibold text-white">
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}