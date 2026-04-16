import { TripPreviewCard } from "@/components/trips/TripPreviewCard";
import { useTrips } from "@/context/TripsContext";
import { auth } from "@/src/config/firebase";
import {
  deleteOwnedItineraries,
  deleteTripMetaMany,
  generateTripShareLink,
  getTripMetaMap,
  setTripMeta,
  type LocalTripMeta,
} from "@/src/services/profile";
import { updateItinerary } from "@/src/services/trips";
import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VisibilityOption = "public" | "friends" | "private";

function visibilityLabel(v: VisibilityOption) {
  if (v === "public") return "Public";
  if (v === "friends") return "Friends Only";
  return "Only you";
}

function visibilityIcon(v: VisibilityOption): any {
  if (v === "public") return "globe-outline";
  if (v === "friends") return "people-outline";
  return "lock-closed-outline";
}

function visibilityDescription(v: VisibilityOption) {
  if (v === "public") return "Anyone viewing your profile can see this";
  if (v === "friends") return "Only your friends can see this";
  return "Only visible to you";
}

function isEndedTrip(endDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return endDate < today;
}

export default function MyTripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, selectTrip } = useTrips();

  const [tripMeta, setTripMetaState] = useState<Record<string, LocalTripMeta>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Drawer state
  const [drawerTripId, setDrawerTripId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [draftVisibility, setDraftVisibility] = useState<VisibilityOption>("friends");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedTrips = useMemo(() => {
    const groupOrder = { upcoming: 0, current: 1, past: 2 };
    return [...trips].sort((a, b) => {
      if (a.status !== b.status) return groupOrder[a.status] - groupOrder[b.status];
      if (a.status === "past") return b.startDate.localeCompare(a.startDate);
      if (a.status === "current") return a.endDate.localeCompare(b.endDate);
      return a.startDate.localeCompare(b.startDate); // upcoming
    });
  }, [trips]);

  const loadMeta = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const metaMap = await getTripMetaMap();
      const mergedMeta: Record<string, LocalTripMeta> = { ...metaMap };
      for (const trip of sortedTrips) {
        if (!mergedMeta[trip.id]) {
          mergedMeta[trip.id] = { rating: 0, shareUrl: generateTripShareLink(trip.id) };
        } else if (!mergedMeta[trip.id].shareUrl) {
          mergedMeta[trip.id] = { ...mergedMeta[trip.id], shareUrl: generateTripShareLink(trip.id) };
        }
      }
      setTripMetaState(mergedMeta);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message ?? "Could not load trips.");
    } finally {
      setLoadingMeta(false);
    }
  }, [sortedTrips]);

  useFocusEffect(useCallback(() => { loadMeta(); }, [loadMeta]));

  const updateTripMeta = async (tripId: string, next: LocalTripMeta) => {
    setTripMetaState((prev) => ({ ...prev, [tripId]: next }));
    await setTripMeta(tripId, next);
  };

  const openTrip = (tripId: string) => {
    selectTrip(tripId);
    router.push({ pathname: "/(tabs)/itinerary/overview", params: { from: "my-trips" } });
  };

  const currentUid = auth.currentUser?.uid ?? null;

  const openTripMenu = (tripId: string) => {
    const trip = sortedTrips.find((t) => t.id === tripId);
    if (!trip || !currentUid) return;
    const current = (trip.memberPrivacy?.[currentUid] as VisibilityOption) ?? "friends";
    setDrawerTripId(tripId);
    setDraftVisibility(current);
    setDropdownOpen(false);
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setDropdownOpen(false);
    setDrawerTripId(null);
  };

  const handleUpdateTrip = async () => {
    if (!drawerTripId || !currentUid) return;
    const trip = sortedTrips.find((t) => t.id === drawerTripId);
    if (!trip) return;
    try {
      setSaving(true);
      await updateItinerary(drawerTripId, {
        memberPrivacy: { ...(trip.memberPrivacy ?? {}), [currentUid]: draftVisibility },
      });
      closeDrawer();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update visibility.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = () => {
    const trip = sortedTrips.find((t) => t.id === drawerTripId);
    if (!trip || !currentUid) return;
    if (trip.ownerUid !== currentUid) {
      Alert.alert("Can't delete", "You can only delete trips you created.");
      return;
    }
    Alert.alert(
      "Delete trip",
      "This will permanently delete the trip for all members. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOwnedItineraries([drawerTripId!]);
              await deleteTripMetaMany([drawerTripId!]);
              closeDrawer();
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: UI.colors.pageBg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top - 48,
          paddingHorizontal: UI.spacing.pageX,
          paddingBottom: 12,
          backgroundColor: UI.colors.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: UI.colors.cardBorder,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "600", color: UI.colors.textPrimary }}>
          My Trips
        </Text>
        <Text style={{ marginTop: 4, fontSize: UI.type.body, color: UI.colors.textSecondary }}>
          {sortedTrips.length} total
        </Text>
      </View>

      {/* Trip list */}
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: UI.colors.pageBg }}
        contentContainerStyle={{
          paddingHorizontal: UI.spacing.pageX,
          paddingTop: 16,
          paddingBottom: UI.spacing.pageBottom,
        }}
      >
        {sortedTrips.map((trip) => {
          const meta = tripMeta[trip.id] ?? { rating: 0, shareUrl: generateTripShareLink(trip.id) };
          return (
            <TripPreviewCard
              key={trip.id}
              trip={trip}
              currentUid={currentUid ?? undefined}
              onPress={() => openTrip(trip.id)}
              onMenuPress={() => openTripMenu(trip.id)}
              showFooter
              rating={meta.rating}
              canRate={isEndedTrip(trip.endDate)}
              onChangeRating={(value) => updateTripMeta(trip.id, { ...meta, rating: value })}
            />
          );
        })}

        {loadingMeta ? (
          <Text style={{ marginTop: 16, fontSize: UI.type.body, color: UI.colors.textMuted }}>
            Loading trips…
          </Text>
        ) : sortedTrips.length === 0 ? (
          <Text style={{ marginTop: 16, fontSize: UI.type.body, color: UI.colors.textSecondary }}>
            No trips found.
          </Text>
        ) : null}
      </ScrollView>

      {/* Visibility drawer */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDrawer}
      >
        <View style={{ flex: 1 }}>
          {/* Backdrop */}
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
            onPress={closeDrawer}
          />

          {/* Sheet */}
          <View
            style={{
              backgroundColor: UI.colors.pageBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#D1D5DB",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 24,
              }}
            />

            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: UI.colors.textPrimary,
                marginBottom: 24,
              }}
            >
              Visibility
            </Text>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: UI.colors.textPrimary,
                letterSpacing: 0.4,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Who can view
            </Text>

            {/* Dropdown trigger */}
            <TouchableOpacity
              onPress={() => setDropdownOpen((v) => !v)}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: dropdownOpen ? UI.colors.brand : UI.colors.cardBorder,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: UI.colors.cardBg,
              }}
            >
              <Ionicons
                name={visibilityIcon(draftVisibility)}
                size={20}
                color={UI.colors.textSecondary}
                style={{ marginRight: 10 }}
              />
              <Text style={{ flex: 1, fontSize: 16, color: UI.colors.textPrimary, fontWeight: "500" }}>
                {visibilityLabel(draftVisibility)}
              </Text>
              <Ionicons
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={UI.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Dropdown options */}
            {dropdownOpen && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: UI.colors.cardBorder,
                  borderRadius: 14,
                  marginTop: 6,
                  overflow: "hidden",
                  backgroundColor: UI.colors.cardBg,
                }}
              >
                {(["public", "friends", "private"] as VisibilityOption[]).map((opt, i) => (
                  <TouchableOpacity
                    key={opt}
                    activeOpacity={0.8}
                    onPress={() => { setDraftVisibility(opt); setDropdownOpen(false); }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor:
                        draftVisibility === opt ? UI.colors.brandSoft : UI.colors.cardBg,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: UI.colors.cardBorder,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor:
                          draftVisibility === opt ? UI.colors.brand : "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={visibilityIcon(opt)}
                        size={17}
                        color={draftVisibility === opt ? "#FFFFFF" : UI.colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: draftVisibility === opt ? UI.colors.brand : UI.colors.textPrimary,
                        }}
                      >
                        {visibilityLabel(opt)}
                      </Text>
                      <Text style={{ fontSize: 12, color: UI.colors.textMuted, marginTop: 2 }}>
                        {visibilityDescription(opt)}
                      </Text>
                    </View>
                    {draftVisibility === opt && (
                      <Ionicons name="checkmark-circle" size={20} color={UI.colors.brand} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Spacer */}
            <View style={{ height: 32 }} />

            {/* Delete ghost button */}
            <TouchableOpacity
              onPress={handleDeleteTrip}
              activeOpacity={0.7}
              style={{ alignItems: "center", paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: UI.colors.danger }}>
                Delete Trip
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: UI.colors.cardBorder,
                marginVertical: 12,
              }}
            />

            {/* Update CTA */}
            <TouchableOpacity
              onPress={handleUpdateTrip}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                backgroundColor: saving ? UI.colors.disabledBg : UI.colors.brand,
                borderRadius: 30,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                {saving ? "Saving…" : "Update Trip"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
