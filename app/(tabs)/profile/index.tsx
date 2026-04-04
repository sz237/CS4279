import { SectionHeader } from "@/components/common/SectionHeader";
import { auth } from "@/src/config/firebase";
import {
  ProfileUser,
  getCurrentUserProfile,
  getFollowers,
  getFollowersForUI,
  getFollowing,
  getFollowingForUI,
} from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
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

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={{
        backgroundColor: UI.colors.cardBg,
        borderColor: UI.colors.cardBorder,
        borderWidth: 1,
        borderRadius: UI.radius.card,
        padding: UI.spacing.cardPadding,
        ...UI.shadow.card,
        ...(style ?? {}),
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
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
      }}
    >
      <Ionicons name={icon} size={22} color={UI.colors.textMuted} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: UI.colors.textPrimary,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: UI.type.body,
            color: UI.colors.textSecondary,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={UI.colors.textMuted} />
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
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E0E7FF",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "600", color: UI.colors.brand }}>
        {initials}
      </Text>
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
      style={{
        flex: 1,
        backgroundColor: UI.colors.cardBg,
        borderColor: UI.colors.cardBorder,
        borderWidth: 1,
        borderRadius: UI.radius.card,
        padding: UI.spacing.cardPadding,
        ...UI.shadow.card,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: UI.colors.textPrimary,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: UI.type.body,
          color: UI.colors.textSecondary,
        }}
      >
        {label}
      </Text>
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
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);

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

      setLocalPhotoURL(p?.photoURL ?? auth.currentUser?.photoURL ?? null);
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
  const bio = profile?.bio?.trim() || "No bio added yet.";
  const photoURL = localPhotoURL;

  const followingForUI = useMemo(() => getFollowingForUI(following), [following]);
  const followersForUI = useMemo(() => getFollowersForUI(followers), [followers]);

  return (
    <View className="flex-1" style={{ backgroundColor: UI.colors.pageBg }}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: UI.colors.pageBg }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: UI.spacing.pageBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: UI.type.pageTitle,
            fontWeight: "800",
            color: UI.colors.textPrimary,
            marginBottom: 16,
          }}
        >
          Profile
        </Text>

        <Card style={{ marginBottom: 12 }}>
          <View style={{ position: "relative" }}>
            
            {/* Edit icon */}
            <Pressable
              onPress={() => router.push("/(tabs)/profile/edit")}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 10,
                padding: 6,
                borderRadius: 999,
                backgroundColor: UI.colors.cardBg,
              }}
            >
              <Ionicons name="create-outline" size={18} color={UI.colors.textMuted} />
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <Avatar name={displayName} photoURL={photoURL} size={96} />

              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text
                  style={{
                    fontSize: 30,
                    fontWeight: "600",
                    color: UI.colors.textPrimary,
                  }}
                >
                  {displayName}
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: UI.type.body,
                    color: UI.colors.textSecondary,
                  }}
                >
                  {username}
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: UI.type.body,
                    color: UI.colors.textSecondary,
                  }}
                >
                  {email}
                </Text>

                <Text
                  style={{
                    marginTop: 10,
                    fontSize: UI.type.body,
                    lineHeight: 20,
                    color: UI.colors.textPrimary,
                  }}
                >
                  {bio}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={{ marginBottom: 16, flexDirection: "row", gap: 8 }}>
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

        <View style={{ marginBottom: 16 }}>
          <SectionHeader title="Trips" />
          <Card style={{ padding: 0 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <NavRow
                icon="briefcase-outline"
                title="My Trips"
                subtitle="View, rate, share, and delete itineraries"
                onPress={() => router.push("/(tabs)/profile/my-trips")}
              />
            </View>
          </Card>
        </View>

        <View style={{ marginBottom: 16 }}>
          <SectionHeader title="Settings" />
          <Card style={{ padding: 0 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <NavRow
                icon="notifications-outline"
                title="Push Notifications"
                subtitle="Trip changes, followed users, and popular itineraries"
                onPress={() => router.push("/(tabs)/profile/notifications")}
              />
            </View>

            <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

            <View style={{ paddingHorizontal: 16 }}>
              <NavRow
                icon="shield-checkmark-outline"
                title="Privacy & Security"
                subtitle="Read Firebase privacy and security information"
                onPress={() => router.push("/(tabs)/profile/privacy")}
              />
            </View>

            <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

            <View style={{ paddingHorizontal: 16 }}>
              <NavRow
                icon="help-circle-outline"
                title="Help & Support"
                subtitle="Contact the Nomad team"
                onPress={() => router.push("/(tabs)/profile/help")}
              />
            </View>
          </Card>
        </View>

        <View style={{ marginBottom: 16 }}>
          <SectionHeader title="Account" />
          <Card style={{ padding: 0 }}>
            <Pressable
              onPress={handleSignOut}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
              }}
            >
              <Ionicons name="log-out-outline" size={22} color={UI.colors.danger} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 18,
                  fontWeight: "500",
                  color: UI.colors.danger,
                }}
              >
                Log Out
              </Text>
            </Pressable>
          </Card>
        </View>

        {loading ? (
          <Text style={{ fontSize: UI.type.body, color: UI.colors.textMuted }}>
            Loading profile…
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}