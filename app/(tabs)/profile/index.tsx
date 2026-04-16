import { auth } from "@/src/config/firebase";
import {
  FriendItem,
  FriendRequest,
  ProfileUser,
  getCurrentUserProfile,
  getFriends,
  getPendingRequests,
} from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


function NavRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
    >
      {/* Icon container */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: danger ? "#FEE2E2" : "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={danger ? UI.colors.danger : UI.colors.textPrimary} />
      </View>

      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: danger ? UI.colors.danger : UI.colors.textPrimary }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ marginTop: 2, fontSize: 13, color: UI.colors.textSecondary }}>
            {subtitle}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: "600",
      color: UI.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 28,
      marginBottom: 4,
    }}>
      {title}
    </Text>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function Avatar({ name, photoURL, size = 96 }: { name: string; photoURL?: string | null; size?: number }) {
  const initials = initialsFromName(name || "U");
  if (photoURL) {
    return (
      <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E0E7FF",
      }}
    >
      <Text style={{ fontSize: size * 0.33, fontWeight: "700", color: UI.colors.brand }}>
        {initials}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [friends, setFriends] = useState<FriendItem[] | null>(null);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
  const initialized = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      if (!initialized.current) setLoading(true);
      const p = await getCurrentUserProfile();
      setProfile(p);

      const uid = p?.uid ?? auth.currentUser?.uid;
      if (uid) {
        const [friendsList, requestsList] = await Promise.all([
          getFriends(uid),
          getPendingRequests(uid),
        ]);
        setFriends(friendsList);
        setPendingRequests(requestsList);
      } else {
        setFriends(null);
        setPendingRequests([]);
      }

      setLocalPhotoURL(p?.photoURL ?? auth.currentUser?.photoURL ?? null);
      initialized.current = true;
    } catch (error: any) {
      Alert.alert("Profile Error", error?.message ?? "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert("Error Signing Out", error?.message ?? "Please try again.");
    }
  };

  const displayName = profile?.displayName || auth.currentUser?.displayName || "Your Name";
  const username = profile?.username || "";
  const bio = profile?.bio?.trim() || null;
  const photoURL = localPhotoURL;
  const requestCount = pendingRequests.length;

  return (
    <View style={{ flex: 1, backgroundColor: UI.colors.pageBg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: UI.spacing.pageBottom,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Page header ── */}
        <Text style={{ fontSize: 24, fontWeight: "600", color: UI.colors.textPrimary, marginBottom: 20 }}>
          Profile
        </Text>

        {/* ── Profile header — flat, no card ── */}
        <View className="relative">

          {/* Edit button — top right */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/edit")}
            className="absolute top-0 right-0 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
            accessibilityLabel="Edit profile"
          >
            <Ionicons name="pencil-outline" size={15} color="#71717A" />
          </Pressable>

          {/* Avatar + identity — centered */}
          <View className="items-center mb-3">
            <Avatar name={displayName} photoURL={photoURL} size={88} />
            <Text className="mt-3 text-xl font-bold text-center" style={{ color: UI.colors.textPrimary }} numberOfLines={2}>
              {displayName}
            </Text>
            {!!username && (
              <Text className="mt-0.5 text-sm text-center" style={{ color: UI.colors.textSecondary }}>
                @{username}
              </Text>
            )}
          </View>

          {/* Bio */}
          {bio ? (
            <Text className="text-sm text-center mb-4" style={{ color: UI.colors.textSecondary, lineHeight: 20 }}>
              {bio}
            </Text>
          ) : (
            <Text className="text-sm text-center italic mb-4" style={{ color: UI.colors.textMuted }}>
              No bio yet — tap Edit to add one.
            </Text>
          )}

          {/* Friends row */}
          <View style={{ height: 1, backgroundColor: UI.colors.cardBorder }} />
          <Pressable
            onPress={() => router.push("/(tabs)/profile/follow-list")}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
          >
            {/* Label + count together, left side */}
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: UI.colors.textPrimary }}>
                Friends
              </Text>
              {friends !== null && (
                <Text style={{ fontSize: 15, fontWeight: "600", color: UI.colors.textSecondary }}>
                  {friends.length}
                </Text>
              )}
            </View>

            {/* Request tag, right side */}
            {requestCount > 0 && (
              <View style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginRight: 10,
              }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: UI.colors.danger }}>
                  {requestCount} request{requestCount > 1 ? "s" : ""}
                </Text>
              </View>
            )}

            <Ionicons name="chevron-forward" size={18} color={UI.colors.textMuted} />
          </Pressable>
          <View style={{ height: 1, backgroundColor: UI.colors.cardBorder }} />
        </View>

        {/* ── Trips ── */}
        <SectionLabel title="Trips" />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        <NavRow
          icon="briefcase-outline"
          title="My Trips"
          subtitle="View, rate, and delete itineraries"
          onPress={() => router.push("/(tabs)/profile/my-trips")}
        />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

        {/* ── Settings ── */}
        <SectionLabel title="Settings" />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        <NavRow
          icon="notifications-outline"
          title="Push Notifications"
          subtitle="Trip changes and popular itineraries"
          onPress={() => router.push("/(tabs)/profile/notifications")}
        />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        <NavRow
          icon="shield-checkmark-outline"
          title="Privacy & Security"
          subtitle="Firebase privacy and security information"
          onPress={() => router.push("/(tabs)/profile/privacy")}
        />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        <NavRow
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="Contact the Nomad team"
          onPress={() => router.push("/(tabs)/profile/help")}
        />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        <NavRow
          icon="log-out-outline"
          title="Log Out"
          onPress={handleSignOut}
          danger
        />
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

        {loading && (
          <Text style={{ fontSize: UI.type.body, color: UI.colors.textMuted, textAlign: "center" }}>
            Loading profile…
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
