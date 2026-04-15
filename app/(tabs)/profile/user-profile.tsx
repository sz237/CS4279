import { auth } from "@/src/config/firebase";
import {
  ItineraryDoc,
  ProfileUser,
  getFriends,
  getOwnedItineraries,
  getUserPublicProfile,
} from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function tripStatus(trip: ItineraryDoc): "past" | "current" | "upcoming" {
  if (trip.status) return trip.status as "past" | "current" | "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate + "T00:00:00");
  const end = new Date(trip.endDate + "T00:00:00");
  if (end < today) return "past";
  if (start <= today) return "current";
  return "upcoming";
}

function formatDateRange(start: string, end: string) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
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

function StatusBadge({ status }: { status: "past" | "current" | "upcoming" }) {
  const config = {
    past:     { label: "Past",     bg: "#F3F4F6", color: "#6B7280" },
    current:  { label: "Current",  bg: "#DCFCE7", color: "#15803D" },
    upcoming: { label: "Upcoming", bg: "#EEF2FF", color: UI.colors.brand },
  }[status];

  return (
    <View style={{ backgroundColor: config.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: config.color }}>{config.label}</Text>
    </View>
  );
}

function TripCard({ trip }: { trip: ItineraryDoc }) {
  const status = tripStatus(trip);
  return (
    <View style={{
      backgroundColor: UI.colors.cardBg,
      borderColor: UI.colors.cardBorder,
      borderWidth: 1,
      borderRadius: UI.radius.card,
      padding: 14,
      marginBottom: 10,
      ...UI.shadow.card,
    }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: UI.colors.textPrimary, marginRight: 8 }} numberOfLines={1}>
          {trip.title}
        </Text>
        <StatusBadge status={status} />
      </View>

      {!!trip.cityOrArea && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <Ionicons name="location-outline" size={13} color={UI.colors.textMuted} />
          <Text style={{ fontSize: 13, color: UI.colors.textSecondary }}>{trip.cityOrArea}</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="calendar-outline" size={13} color={UI.colors.textMuted} />
        <Text style={{ fontSize: 13, color: UI.colors.textSecondary }}>
          {formatDateRange(trip.startDate, trip.endDate)}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const insets = useSafeAreaInsets();
  const currentUid = auth.currentUser?.uid ?? "";

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [trips, setTrips] = useState<ItineraryDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoading(true);
        const [p, friends, allTrips] = await Promise.all([
          getUserPublicProfile(uid),
          getFriends(uid),
          getOwnedItineraries(uid),
        ]);

        setProfile(p);
        setFriendCount(friends.length);

        // Filter trips: always show past; current/upcoming only if invited
        const visible = allTrips.filter((t) => {
          const status = tripStatus(t);
          if (status === "past") return true;
          return (t.memberUids ?? []).includes(currentUid);
        });

        // Sort: current → upcoming → past
        const order = { current: 0, upcoming: 1, past: 2 };
        visible.sort((a, b) => order[tripStatus(a)] - order[tripStatus(b)]);
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

      {/* ── Active trips (invited only) ── */}
      {activeTrips.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: UI.colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Active Trips
          </Text>
          {activeTrips.map((t) => <TripCard key={t.id} trip={t} />)}
        </View>
      )}

      {/* ── Past trips ── */}
      <View style={{ marginTop: activeTrips.length > 0 ? 16 : 24 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: UI.colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Past Trips
        </Text>
        {pastTrips.length === 0 ? (
          <View className="items-center py-8 gap-2">
            <Ionicons name="map-outline" size={36} color="#D1D5DB" />
            <Text style={{ fontSize: 14, color: UI.colors.textMuted, textAlign: "center" }}>
              No past trips yet.
            </Text>
          </View>
        ) : (
          pastTrips.map((t) => <TripCard key={t.id} trip={t} />)
        )}
      </View>
    </ScrollView>
  );
}
