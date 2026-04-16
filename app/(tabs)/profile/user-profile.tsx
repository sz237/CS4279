import { auth } from "@/src/config/firebase";
import type { ItineraryModel } from "@/src/models";
import {
  ProfileUser,
  getFriends,
  getMemberItineraries,
  getUserPublicProfile,
} from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
import { TripPreviewCard } from "@/components/trips/TripPreviewCard";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function tripStatus(trip: ItineraryModel): "past" | "current" | "upcoming" {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  if (today < trip.startDate) return "upcoming";
  if (today > trip.endDate) return "past";
  return "current";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, photoURL, size = 88 }: { name: string; photoURL?: string | null; size?: number }) {
  const initials = initialsFromName(name || "U");
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: "700", color: UI.colors.brand }}>{initials}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const currentUid = auth.currentUser?.uid ?? "";

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [trips, setTrips] = useState<ItineraryModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoading(true);
        const [p, friends, allTrips] = await Promise.all([
          getUserPublicProfile(uid),
          getFriends(uid),
          getMemberItineraries(uid),
        ]);

        setProfile(p);
        setFriendCount(friends.length);

        const isSelf = currentUid === uid;
        const isFriend = friends.some((f) => f.uid === currentUid);

        // Block entirely if the profile is private and viewer isn't a friend
        if (!isSelf && !isFriend && p?.profilePrivacy === "private") {
          setTrips([]);
          return;
        }

        // Trip visibility rules (checked against the profile owner's uid):
        //   - You always see your own trips
        //   - Members of the trip always see it regardless of privacy
        //   - "public" → anyone can see (past trips only)
        //   - "friends" → only friends can see (past trips only, default)
        //   - "private" / "only you" → hidden from everyone except self/members
        const visible = allTrips.filter((t) => {
          if (isSelf) return true;
          const isMember = (t.memberUids ?? []).includes(currentUid);
          if (isMember) return true;
          const ownerPrivacy = (t.memberPrivacy?.[uid] as "public" | "friends" | "private") ?? "friends";
          if (ownerPrivacy === "private") return false;
          if (ownerPrivacy === "public") return tripStatus(t) === "past";
          if (isFriend && ownerPrivacy === "friends") return tripStatus(t) === "past";
          return false;
        });

        // Sort: upcoming → current → past
        // Within upcoming: soonest startDate first (ascending)
        // Within current: ending soonest first (ascending endDate)
        // Within past: most recent first (descending startDate)
        const groupOrder = { upcoming: 0, current: 1, past: 2 };
        visible.sort((a, b) => {
          const sa = tripStatus(a);
          const sb = tripStatus(b);
          if (sa !== sb) return groupOrder[sa] - groupOrder[sb];
          if (sa === "past") return b.startDate.localeCompare(a.startDate);
          if (sa === "current") return a.endDate.localeCompare(b.endDate);
          return a.startDate.localeCompare(b.startDate); // upcoming
        });
        setTrips(visible);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, currentUid]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.colors.pageBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: UI.colors.textMuted, fontSize: 14 }}>Loading…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.colors.pageBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: UI.colors.textMuted, fontSize: 14 }}>User not found.</Text>
      </View>
    );
  }

  const isPrivateAndBlocked = !!(
    profile.profilePrivacy === "private" &&
    currentUid !== uid &&
    trips.length === 0
  );
  const pastTrips = trips.filter((t) => tripStatus(t) === "past");
  const activeTrips = trips.filter((t) => tripStatus(t) !== "past");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: UI.colors.pageBg }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Identity ── */}
      <View className="items-center mt-4 mb-4">
        <Avatar name={profile.displayName} photoURL={profile.photoURL} size={88} />

        <Text className="mt-3 text-xl font-bold text-center" style={{ color: UI.colors.textPrimary }}>
          {profile.displayName}
        </Text>

        {!!profile.username && (
          <Text className="mt-0.5 text-sm text-center" style={{ color: UI.colors.textSecondary }}>
            @{profile.username}
          </Text>
        )}

        {!!profile.bio && (
          <Text className="mt-2 text-sm text-center px-6" style={{ color: UI.colors.textSecondary, lineHeight: 20 }}>
            {profile.bio}
          </Text>
        )}
      </View>

      {/* ── Friends stat ── */}
      <View style={{ height: 1, backgroundColor: UI.colors.cardBorder }} />
      <View style={{ paddingVertical: 14, flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: UI.colors.textPrimary }}>Friends</Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: UI.colors.textSecondary }}>{friendCount}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: UI.colors.cardBorder }} />

      {/* ── Private account gate ── */}
      {isPrivateAndBlocked ? (
        <View style={{ alignItems: "center", paddingVertical: 40, gap: 10, marginTop: 8 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: UI.colors.textPrimary }}>
            Private Account
          </Text>
          <Text style={{ fontSize: 13, color: UI.colors.textMuted, textAlign: "center", maxWidth: 220 }}>
            Add {profile.displayName} as a friend to see their trips.
          </Text>
        </View>
      ) : null}

      {/* ── Active trips ── */}
      {!isPrivateAndBlocked && activeTrips.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: UI.colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Active Trips
          </Text>
          {activeTrips.map((t) => <TripPreviewCard key={t.id} trip={{ ...t, status: tripStatus(t) }} />)}
        </View>
      )}

      {/* ── Past trips ── */}
      {!isPrivateAndBlocked && (
        <View style={{ marginTop: activeTrips.length > 0 ? 16 : 24 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: UI.colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Past Trips
          </Text>
          {pastTrips.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
              <Text style={{ fontSize: 14, color: UI.colors.textMuted, textAlign: "center" }}>
                No past trips yet.
              </Text>
            </View>
          ) : (
            pastTrips.map((t) => <TripPreviewCard key={t.id} trip={{ ...t, status: tripStatus(t) }} />)
          )}
        </View>
      )}
    </ScrollView>
  );
}
