import { auth } from "@/src/config/firebase";
import {
  ProfileUser,
  getCurrentUserProfile,
  getFollowers,
  getFollowersForUI,
  getFollowing,
  getFollowingForUI,
} from "@/src/services/profile";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SectionHeader({ title }: { title: string }) {
  return <Text className="mb-2 text-base font-bold text-gray-900">{title}</Text>;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable className="flex-row items-center py-1" onPress={onPress}>
      <Ionicons name={icon} size={22} color="#94A3B8" />
      <View className="ml-3 flex-1">
        <Text className="text-lg font-medium text-gray-900">{title}</Text>
        <Text className="text-sm text-slate-500">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
    </Pressable>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function Avatar({
  name,
  photoURL,
  size = 96,
}: {
  name: string;
  photoURL?: string | null;
  size?: number;
}) {
  const initials = initialsFromName(name || "U");

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-indigo-100"
      style={{ width: size, height: size }}
    >
      <Text className="text-2xl font-semibold text-indigo-600">{initials}</Text>
    </View>
  );
}

function StatPill({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-2xl border border-gray-200 bg-white p-4"
    >
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="mt-1 text-sm text-slate-500">{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getCurrentUserProfile();
      setProfile(p);

      const uid = p?.uid ?? auth.currentUser?.uid;
      if (uid) {
        const [followingList, followersList] = await Promise.all([
          getFollowing(uid),
          getFollowers(uid),
        ]);
        setFollowing(followingList);
        setFollowers(followersList);
      } else {
        setFollowing([]);
        setFollowers([]);
      }
    } catch (error: any) {
      Alert.alert("Profile Error", error?.message ?? "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert("Error Signing Out", error?.message ?? "Please try again.");
    }
  };

  const displayName = profile?.displayName || auth.currentUser?.displayName || "Your Name";
  const username = profile?.username ? `@${profile.username}` : "@username";
  const email = profile?.email || auth.currentUser?.email || "No email listed";
  const photoURL = profile?.photoURL || auth.currentUser?.photoURL || null;

  const followingForUI = useMemo(() => getFollowingForUI(following), [following]);
  const followersForUI = useMemo(() => getFollowersForUI(followers), [followers]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-3xl font-bold text-gray-900">Profile</Text>

        <Card className="mb-4">
          <View className="flex-row items-center">
            <Avatar name={displayName} photoURL={photoURL} size={96} />
            <View className="ml-4 flex-1">
              <Text className="text-3xl font-semibold text-gray-900">
                {displayName}
              </Text>
              <Text className="mt-1 text-base text-slate-500">{username}</Text>
              <Text className="mt-1 text-base text-slate-500">{email}</Text>

              <Pressable
                className="mt-3 self-start rounded-full bg-indigo-50 px-4 py-2"
                onPress={() => router.push("/(tabs)/profile/edit")}
              >
                <Text className="text-base font-medium text-indigo-600">
                  Edit Profile
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <View className="mb-4 flex-row gap-3">
          <StatPill
            label="Following"
            value={followingForUI.length}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/profile/follow-list",
                params: { type: "following" },
              })
            }
          />
          <StatPill
            label="Followers"
            value={followersForUI.length}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/profile/follow-list",
                params: { type: "followers" },
              })
            }
          />
        </View>

        <View className="mb-4">
          <SectionHeader title="Trips" />
          <Card className="p-0">
            <View className="px-4">
              <NavRow
                icon="briefcase-outline"
                title="Past Trips"
                subtitle="View, rate, share, and delete itineraries you created"
                onPress={() => router.push("/(tabs)/profile/my-trips")}
              />
            </View>
          </Card>
        </View>

        <View className="mb-4">
          <SectionHeader title="Settings" />
          <Card className="p-0">
            <View className="px-4">
              <NavRow
                icon="notifications-outline"
                title="Push Notifications"
                subtitle="Trip changes, followed users, and popular itineraries"
                onPress={() => router.push("/(tabs)/profile/notifications")}
              />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <NavRow
                icon="shield-checkmark-outline"
                title="Privacy & Security"
                subtitle="Read Firebase privacy and security information"
                onPress={() => router.push("/(tabs)/profile/privacy")}
              />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <NavRow
                icon="help-circle-outline"
                title="Help & Support"
                subtitle="Contact the Nomad team"
                onPress={() => router.push("/(tabs)/profile/help")}
              />
            </View>
          </Card>
        </View>

        {loading ? (
          <Text className="text-sm text-slate-400">Loading profile…</Text>
        ) : null}
      </ScrollView>

      <View className="border-t border-gray-200 bg-gray-50 px-3 pb-3 pt-2">
        <Card className="p-0">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center py-1"
          >
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text className="ml-2 text-lg font-medium text-red-600">
              Log Out
            </Text>
          </Pressable>
        </Card>
      </View>
    </View>
  );
}