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
    <View className="flex-1 bg-gray-50">
      {/* Sticky header */}
      <View
        style={{
          paddingTop: insets.top - 48,
          paddingHorizontal: 20,
          paddingBottom: 12,
        }}
        className="border-b border-gray-200 bg-gray-50"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Trips</Text>
            <Text className="mt-1 text-sm text-slate-500">{sortedTrips.length} total</Text>
          </View>

          <TouchableOpacity
            onPress={selecting ? cancelSelecting : startSelecting}
            activeOpacity={0.85}
            className="flex-row items-center justify-center rounded-2xl bg-white px-4 py-3"
          >
            <Ionicons
              name={selecting ? "close-circle-outline" : "checkmark-done-outline"}
              size={18}
              color="#111827"
            />
            <Text className="ml-2 font-medium text-gray-900">
              {selecting ? "Cancel" : "Select Trips"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: selecting ? 84 : 20,
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
          <Text className="mt-4 text-sm text-slate-400">Loading trips…</Text>
        ) : sortedTrips.length === 0 ? (
          <Text className="mt-4 text-sm text-slate-500">No trips found.</Text>
        ) : null}
      </ScrollView>

      {selecting ? (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 6),
          }}
          className="border-t border-gray-200 bg-white px-4 pt-2"
        >
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={allSelected ? clearSelection : selectAll}
              activeOpacity={0.85}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-white py-3"
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Ionicons
                name={allSelected ? "remove-circle-outline" : "checkbox-outline"}
                size={18}
                color="#111827"
              />
              <Text className="ml-2 font-medium text-gray-900">
                {allSelected ? "Clear Selection" : "Select All"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={deleteSelected}
              disabled={ownedSelectedTripIds.length === 0 || deleting}
              activeOpacity={0.85}
              className={`flex-1 flex-row items-center justify-center rounded-2xl py-3 ${
                ownedSelectedTripIds.length === 0 || deleting
                  ? "bg-gray-200"
                  : "bg-red-50"
              }`}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={
                  ownedSelectedTripIds.length === 0 || deleting
                    ? "#94A3B8"
                    : "#DC2626"
                }
              />
              <Text
                className={`ml-2 font-medium ${
                  ownedSelectedTripIds.length === 0 || deleting
                    ? "text-slate-400"
                    : "text-red-600"
                }`}
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