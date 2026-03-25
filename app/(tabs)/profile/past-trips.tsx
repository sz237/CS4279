import { auth } from "@/src/config/firebase";
import {
    getBestPhotoUrl,
    searchText,
    type PlaceV1,
} from "@/src/googlePlaces";
import {
    deleteOwnedItineraries,
    deleteTripMetaMany,
    generateTripShareLink,
    getOwnedItineraries,
    getTripMetaMap,
    setTripMeta,
    type ItineraryDoc,
    type LocalTripMeta,
} from "@/src/services/profile";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    ImageBackground,
    Pressable,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} className="mr-1">
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={22}
            color={n <= value ? "#F59E0B" : "#E5E7EB"}
          />
        </Pressable>
      ))}
    </View>
  );
}

function TripCard({
  trip,
  selecting,
  selected,
  onToggleSelect,
  meta,
  onChangeRating,
  onShareTrip,
}: {
  trip: ItineraryDoc;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  meta: LocalTripMeta;
  onChangeRating: (value: number) => void;
  onShareTrip: () => void;
}) {
  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey as
    | string
    | undefined;

  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCityImage() {
      if (!GOOGLE_PLACES_API_KEY || !trip.cityOrArea?.trim()) {
        setBackgroundImageUrl(null);
        return;
      }

      try {
        const resp = await searchText({
          apiKey: GOOGLE_PLACES_API_KEY,
          textQuery: trip.cityOrArea,
          maxResultCount: 5,
        });

        const firstWithPhoto = (resp.places ?? []).find(
          (p: PlaceV1) => p.photos && p.photos.length > 0
        );

        if (!cancelled && firstWithPhoto) {
          const photoUrl = getBestPhotoUrl({
            apiKey: GOOGLE_PLACES_API_KEY,
            place: firstWithPhoto,
            maxWidthPx: 1200,
          });
          setBackgroundImageUrl(photoUrl ?? null);
        } else if (!cancelled) {
          setBackgroundImageUrl(null);
        }
      } catch {
        if (!cancelled) setBackgroundImageUrl(null);
      }
    }

    loadCityImage();

    return () => {
      cancelled = true;
    };
  }, [GOOGLE_PLACES_API_KEY, trip.cityOrArea]);

  return (
    <Pressable
      onPress={selecting ? onToggleSelect : undefined}
      className={`mb-4 overflow-hidden rounded-2xl bg-white ${
        selecting && selected ? "border-2 border-red-400" : "border border-gray-200"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <ImageBackground
        source={backgroundImageUrl ? { uri: backgroundImageUrl } : undefined}
        resizeMode="cover"
        imageStyle={{ opacity: 0.95 }}
      >
        <View
          style={{
            backgroundColor: backgroundImageUrl
              ? "rgba(0,0,0,0.38)"
              : "#FFFFFF",
            padding: 16,
          }}
        >
          <View className="mb-3 flex-row items-start">
            <View className="flex-1">
              <Text
                className="text-xl font-semibold"
                style={{ color: backgroundImageUrl ? "#FFFFFF" : "#111827" }}
              >
                {trip.title}
              </Text>
              <Text
                className="mt-1 text-sm"
                style={{ color: backgroundImageUrl ? "#F1F5F9" : "#64748B" }}
              >
                {trip.cityOrArea} • {trip.startDate} to {trip.endDate}
              </Text>
              <Text
                className="mt-1 text-sm"
                style={{ color: backgroundImageUrl ? "#F1F5F9" : "#64748B" }}
              >
                {trip.stopCount ?? trip.stops?.length ?? 0} stops
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text
              className="text-sm font-medium"
              style={{ color: backgroundImageUrl ? "#FFFFFF" : "#111827" }}
            >
              Rate this trip
            </Text>

            <TouchableOpacity
              onPress={onShareTrip}
              activeOpacity={0.85}
              className="rounded-full bg-white/80 p-2"
            >
              <Ionicons name="share-social-outline" size={18} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <View className="mt-2">
            <StarRating value={meta.rating} onChange={onChangeRating} />
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export default function PastTripsScreen() {
  const insets = useSafeAreaInsets();

  const [trips, setTrips] = useState<ItineraryDoc[]>([]);
  const [tripMeta, setTripMetaState] = useState<Record<string, LocalTripMeta>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selecting, setSelecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setTrips([]);
        return;
      }

      const [itins, metaMap] = await Promise.all([
        getOwnedItineraries(uid),
        getTripMetaMap(),
      ]);

      const sortedItins = [...itins].sort((a, b) =>
        (a.startDate ?? "").localeCompare(b.startDate ?? "")
      );

      const mergedMeta: Record<string, LocalTripMeta> = { ...metaMap };
      for (const trip of sortedItins) {
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

      setTrips(sortedItins);
      setTripMetaState(mergedMeta);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message ?? "Could not load trips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selectedTripIds = useMemo(
    () => Object.keys(selectedIds).filter((id) => selectedIds[id]),
    [selectedIds]
  );

  const allSelected =
    trips.length > 0 && selectedTripIds.length === trips.length;

  const toggleSelect = (id: string) => {
    if (!selecting) return;
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const trip of trips) next[trip.id] = true;
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

  const deleteSelected = async () => {
    if (selectedTripIds.length === 0) return;

    Alert.alert(
      "Delete trips",
      `Delete ${selectedTripIds.length} selected trip(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteOwnedItineraries(selectedTripIds);
              await deleteTripMetaMany(selectedTripIds);
              setSelectedIds({});
              setSelecting(false);
              await load();
            } catch (error: any) {
              Alert.alert("Delete failed", error?.message ?? "Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const shareTrip = async (trip: ItineraryDoc) => {
    try {
      const link =
        tripMeta[trip.id]?.shareUrl || generateTripShareLink(trip.id);

      await Share.share({
        message: `Check out my Nomad trip "${trip.title}"! ${link}`,
        url: link,
        title: trip.title,
      });
    } catch (error: any) {
      Alert.alert("Share failed", error?.message ?? "Could not open share sheet.");
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: selecting ? 84 : 20,
        }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Past Trips</Text>
            <Text className="mt-1 text-sm text-slate-500">{trips.length} total</Text>
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

        {trips.map((trip) => {
          const meta = tripMeta[trip.id] ?? {
            rating: 0,
            shareUrl: generateTripShareLink(trip.id),
          };

          return (
            <TripCard
              key={trip.id}
              trip={trip}
              selecting={selecting}
              selected={!!selectedIds[trip.id]}
              onToggleSelect={() => toggleSelect(trip.id)}
              meta={meta}
              onChangeRating={(value) =>
                updateTripMeta(trip.id, { ...meta, rating: value })
              }
              onShareTrip={() => shareTrip(trip)}
            />
          );
        })}

        {loading ? (
          <Text className="mt-4 text-sm text-slate-400">Loading trips…</Text>
        ) : trips.length === 0 ? (
          <Text className="mt-4 text-sm text-slate-500">
            No past trips found.
          </Text>
        ) : null}
      </ScrollView>

      {selecting ? (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 6),
          }}
          className="border-t border-gray-200 bg-white px-4 pt-2"
        >
          <View className="flex-row gap-12">
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
              disabled={selectedTripIds.length === 0 || deleting}
              activeOpacity={0.85}
              className={`flex-1 flex-row items-center justify-center rounded-2xl py-3 ${
                selectedTripIds.length === 0 || deleting ? "bg-gray-200" : "bg-red-50"
              }`}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={
                  selectedTripIds.length === 0 || deleting ? "#94A3B8" : "#DC2626"
                }
              />
              <Text
                className={`ml-2 font-medium ${
                  selectedTripIds.length === 0 || deleting
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