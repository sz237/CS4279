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
import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function isEndedTrip(endDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return endDate < today;
}

export default function MyTripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, selectTrip } = useTrips();

  const [tripMeta, setTripMetaState] = useState<Record<string, LocalTripMeta>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selecting, setSelecting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? "")),
    [trips]
  );

  const loadMeta = useCallback(async () => {
    try {
      setLoadingMeta(true);

      const metaMap = await getTripMetaMap();
      const mergedMeta: Record<string, LocalTripMeta> = { ...metaMap };

      for (const trip of sortedTrips) {
        if (!mergedMeta[trip.id]) {
          mergedMeta[trip.id] = {
            rating: 0,
            shareUrl: generateTripShareLink(trip.id),
          };
        } else if (!mergedMeta[trip.id].shareUrl) {
          mergedMeta[trip.id] = {
            ...mergedMeta[trip.id],
            shareUrl: generateTripShareLink(trip.id),
          };
        }
      }

      setTripMetaState(mergedMeta);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message ?? "Could not load trips.");
    } finally {
      setLoadingMeta(false);
    }
  }, [sortedTrips]);

  useFocusEffect(
    useCallback(() => {
      loadMeta();
    }, [loadMeta])
  );

  const selectedTripIds = useMemo(
    () => Object.keys(selectedIds).filter((id) => selectedIds[id]),
    [selectedIds]
  );

  const allSelected =
    sortedTrips.length > 0 && selectedTripIds.length === sortedTrips.length;

  const toggleSelect = (id: string) => {
    if (!selecting) return;
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const trip of sortedTrips) next[trip.id] = true;
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds({});

  const updateTripMeta = async (tripId: string, next: LocalTripMeta) => {
    setTripMetaState((prev) => ({ ...prev, [tripId]: next }));
    await setTripMeta(tripId, next);
  };

  const startSelecting = () => {
    setSelecting(true);
    setSelectedIds({});
  };

  const cancelSelecting = () => {
    setSelecting(false);
    setSelectedIds({});
  };

  const openTrip = (tripId: string) => {
    selectTrip(tripId);
    router.push({
      pathname: "/(tabs)/itinerary/overview",
      params: { from: "my-trips" },
    });
  };

  const currentUid = auth.currentUser?.uid ?? null;

  const ownedSelectedTripIds = useMemo(
    () =>
      sortedTrips
        .filter((trip) => selectedIds[trip.id] && trip.ownerUid === currentUid)
        .map((trip) => trip.id),
    [sortedTrips, selectedIds, currentUid]
  );

  const nonOwnedSelectedCount = selectedTripIds.length - ownedSelectedTripIds.length;

  const deleteSelected = async () => {
    if (ownedSelectedTripIds.length === 0) return;

    const message =
      nonOwnedSelectedCount > 0
        ? `Delete ${ownedSelectedTripIds.length} owned selected trip(s)? ${nonOwnedSelectedCount} selected trip(s) are not owned by you and will not be deleted.`
        : `Delete ${ownedSelectedTripIds.length} selected trip(s)?`;

    Alert.alert("Delete trips", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteOwnedItineraries(ownedSelectedTripIds);
            await deleteTripMetaMany(ownedSelectedTripIds);
            setSelectedIds({});
            setSelecting(false);
          } catch (error: any) {
            Alert.alert("Delete failed", error?.message ?? "Please try again.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: UI.colors.pageBg }}>
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text
              style={{
                fontSize: UI.type.pageTitle,
                fontWeight: "800",
                color: UI.colors.textPrimary,
              }}
            >
              My Trips
            </Text>
            <Text style={{ marginTop: 4, fontSize: UI.type.body, color: UI.colors.textSecondary }}>
              {sortedTrips.length} total
            </Text>
          </View>

          <TouchableOpacity
            onPress={selecting ? cancelSelecting : startSelecting}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: UI.colors.cardBg,
              borderRadius: UI.radius.button,
              paddingHorizontal: 16,
              paddingVertical: UI.spacing.buttonPaddingY,
              borderWidth: 1,
              borderColor: UI.colors.cardBorder,
            }}
          >
            <Ionicons
              name={selecting ? "close-circle-outline" : "checkmark-done-outline"}
              size={18}
              color={UI.colors.textPrimary}
            />
            <Text
              style={{
                marginLeft: 8,
                fontSize: UI.type.body,
                fontWeight: "500",
                color: UI.colors.textPrimary,
              }}
            >
              {selecting ? "Cancel" : "Select Trips"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: UI.colors.pageBg }}
        contentContainerStyle={{
          paddingHorizontal: UI.spacing.pageX,
          paddingTop: 16,
          paddingBottom: selecting ? 84 : UI.spacing.pageBottom,
        }}
      >
        {sortedTrips.map((trip) => {
          const meta = tripMeta[trip.id] ?? {
            rating: 0,
            shareUrl: generateTripShareLink(trip.id),
          };

          return (
            <TripPreviewCard
              key={trip.id}
              trip={trip}
              selecting={selecting}
              selected={!!selectedIds[trip.id]}
              onToggleSelect={() => toggleSelect(trip.id)}
              onPress={() => openTrip(trip.id)}
              showFooter
              rating={meta.rating}
              canRate={isEndedTrip(trip.endDate)}
              onChangeRating={(value) =>
                updateTripMeta(trip.id, { ...meta, rating: value })
              }
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

      {selecting ? (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 6),
            backgroundColor: UI.colors.cardBg,
            borderTopWidth: 1,
            borderTopColor: UI.colors.cardBorder,
            paddingHorizontal: 16,
            paddingTop: 8,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={allSelected ? clearSelection : selectAll}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: UI.radius.button,
                backgroundColor: UI.colors.cardBg,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: UI.colors.cardBorder,
              }}
            >
              <Ionicons
                name={allSelected ? "remove-circle-outline" : "checkbox-outline"}
                size={18}
                color={UI.colors.textPrimary}
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: UI.type.body,
                  fontWeight: "500",
                  color: UI.colors.textPrimary,
                }}
              >
                {allSelected ? "Clear Selection" : "Select All"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={deleteSelected}
              disabled={ownedSelectedTripIds.length === 0 || deleting}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: UI.radius.button,
                paddingVertical: 12,
                backgroundColor:
                  ownedSelectedTripIds.length === 0 || deleting
                    ? UI.colors.disabledBg
                    : UI.colors.dangerSoft,
              }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={
                  ownedSelectedTripIds.length === 0 || deleting
                    ? UI.colors.disabledText
                    : UI.colors.danger
                }
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: UI.type.body,
                  fontWeight: "500",
                  color:
                    ownedSelectedTripIds.length === 0 || deleting
                      ? UI.colors.disabledText
                      : UI.colors.danger,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}