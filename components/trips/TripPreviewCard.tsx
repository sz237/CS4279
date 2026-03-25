import type { ItineraryModel } from "@/src/models";
import {
    changeTripCoverPhoto,
    getTripPreviewImageUri,
} from "@/src/services/trips";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Alert,
    ImageBackground,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange?.(n)}
          className="mr-1"
          disabled={!onChange}
        >
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

function statusLabel(status: ItineraryModel["status"]) {
  if (status === "current") return "Current Trip";
  if (status === "upcoming") return "Upcoming Trip";
  return "Past Trip";
}

type Props = {
  trip: ItineraryModel;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onPress?: () => void;

  showFooter?: boolean;
  rating?: number;
  canRate?: boolean;
  onChangeRating?: (value: number) => void;
  onShareTrip?: () => void;
};

export function TripPreviewCard({
  trip,
  selecting = false,
  selected = false,
  onToggleSelect,
  onPress,
  showFooter = false,
  rating = 0,
  canRate = true,
  onChangeRating,
  onShareTrip,
}: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(trip.coverImageUrl ?? null);
  const [changingPhoto, setChangingPhoto] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreviewImage() {
      const uri = await getTripPreviewImageUri({
        id: trip.id,
        cityOrArea: trip.cityOrArea,
        coverImageUrl: trip.coverImageUrl ?? null,
      });

      if (!cancelled) {
        setCoverUrl(uri);
      }
    }

    loadPreviewImage();

    return () => {
      cancelled = true;
    };
  }, [trip.id, trip.cityOrArea, trip.coverImageUrl]);

  const handleChangePhoto = async () => {
    try {
      setChangingPhoto(true);
      const next = await changeTripCoverPhoto({
        id: trip.id,
        cityOrArea: trip.cityOrArea,
        coverImageUrl: coverUrl,
      });
      if (next) setCoverUrl(next);
    } catch (error: any) {
      Alert.alert("Change Photo Failed", error?.message ?? "Could not update cover photo.");
    } finally {
      setChangingPhoto(false);
    }
  };

  return (
    <Pressable
      onPress={selecting ? onToggleSelect : onPress}
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
        source={coverUrl ? { uri: coverUrl } : undefined}
        resizeMode="cover"
        imageStyle={{ opacity: 0.95 }}
      >
        <View
          style={{
            backgroundColor: coverUrl ? "rgba(0,0,0,0.38)" : "#FFFFFF",
            padding: 16,
          }}
        >
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <View
                className="self-start rounded-full px-3 py-1"
                style={{ backgroundColor: coverUrl ? "rgba(255,255,255,0.18)" : "#EEF2FF" }}
              >
                <Text
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: coverUrl ? "#FFFFFF" : "#4F46E5" }}
                >
                  {statusLabel(trip.status)}
                </Text>
              </View>

              <Text
                className="mt-3 text-xl font-semibold"
                style={{ color: coverUrl ? "#FFFFFF" : "#111827" }}
              >
                {trip.title}
              </Text>

              <Text
                className="mt-1 text-sm"
                style={{ color: coverUrl ? "#F1F5F9" : "#64748B" }}
              >
                {trip.cityOrArea} • {trip.startDate} to {trip.endDate}
              </Text>

              <Text
                className="mt-1 text-sm"
                style={{ color: coverUrl ? "#F1F5F9" : "#64748B" }}
              >
                {trip.stopCount ?? trip.stops?.length ?? 0} stops
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleChangePhoto}
              activeOpacity={0.85}
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: "rgba(255,255,255,0.82)" }}
            >
              <Text className="text-sm font-medium text-indigo-600">
                {changingPhoto ? "Updating..." : "Change Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {showFooter ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm font-medium"
                  style={{ color: coverUrl ? "#FFFFFF" : "#111827" }}
                >
                  {canRate ? "Rate this trip" : "Rating available after the trip ends"}
                </Text>

                {onShareTrip ? (
                  <TouchableOpacity
                    onPress={onShareTrip}
                    activeOpacity={0.85}
                    className="rounded-full bg-white/80 p-2"
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color="#4F46E5"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View className="mt-2">
                <StarRating
                  value={rating}
                  onChange={canRate ? onChangeRating : undefined}
                />
              </View>
            </>
          ) : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}