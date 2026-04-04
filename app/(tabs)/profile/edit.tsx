import { ChangeAvatarButton } from "@/components/profile/ChangeAvatar";
import { auth } from "@/src/config/firebase";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile();
      setDisplayName(profile?.displayName ?? auth.currentUser?.displayName ?? "");
      setUsername(profile?.username ?? "");
      setBio(profile?.bio ?? "");
      setPhotoURL(profile?.photoURL ?? auth.currentUser?.photoURL ?? "");
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCurrentUserProfile({
        displayName,
        username,
        bio,
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
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: UI.colors.pageBg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top - 44,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: UI.type.pageTitle,
          fontWeight: "800",
          color: UI.colors.textPrimary,
          marginBottom: 20,
        }}
      >
        Edit Profile
      </Text>

      <View
        style={{
          backgroundColor: UI.colors.cardBg,
          borderColor: UI.colors.cardBorder,
          borderWidth: 1,
          borderRadius: UI.radius.card,
          padding: 20,
          alignItems: "center",
          marginBottom: 16,
          ...UI.shadow.card,
        }}
      >
        {photoURL ? (
          <Image
            source={{ uri: photoURL }}
            style={{ width: 110, height: 110, borderRadius: 55 }}
          />
        ) : (
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#E0E7FF",
            }}
          >
            <Text style={{ fontSize: 30, fontWeight: "600", color: UI.colors.brand }}>
              {initials}
            </Text>
          </View>
        )}

        <View style={{ marginTop: 12 }}>
          <ChangeAvatarButton onUpdated={setPhotoURL} />
        </View>
      </View>

      <View
        style={{
          backgroundColor: UI.colors.cardBg,
          borderColor: UI.colors.cardBorder,
          borderWidth: 1,
          borderRadius: UI.radius.card,
          padding: 16,
          ...UI.shadow.card,
        }}
      >
        <View style={{ gap: 16 }}>
          <View>
            <Text
              style={{
                marginBottom: 8,
                fontSize: UI.type.body,
                fontWeight: "700",
                color: UI.colors.textPrimary,
              }}
            >
              Name
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={UI.colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: UI.colors.cardBorder,
                borderRadius: UI.radius.button,
                backgroundColor: UI.colors.cardBg,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: UI.colors.textPrimary,
              }}
            />
          </View>

          <View>
            <Text
              style={{
                marginBottom: 8,
                fontSize: UI.type.body,
                fontWeight: "700",
                color: UI.colors.textPrimary,
              }}
            >
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase().replace(/^@+/, ""))}
              placeholder="username"
              placeholderTextColor={UI.colors.textMuted}
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: UI.colors.cardBorder,
                borderRadius: UI.radius.button,
                backgroundColor: UI.colors.cardBg,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: UI.colors.textPrimary,
              }}
            />
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: UI.colors.textSecondary,
              }}
            >
              Unique string of characters.
            </Text>
          </View>

          <View>
            <Text
              style={{
                marginBottom: 8,
                fontSize: UI.type.body,
                fontWeight: "700",
                color: UI.colors.textPrimary,
              }}
            >
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people a little about yourself"
              placeholderTextColor={UI.colors.textMuted}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 110,
                borderWidth: 1,
                borderColor: UI.colors.cardBorder,
                borderRadius: UI.radius.button,
                backgroundColor: UI.colors.cardBg,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: UI.colors.textPrimary,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              marginTop: 4,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: UI.radius.button,
              backgroundColor: UI.colors.textPrimary,
              paddingVertical: 14,
            }}
          >
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 16,
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}