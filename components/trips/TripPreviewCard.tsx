import type { ItineraryModel } from "@/src/models";
import {
  changeTripCoverPhoto,
  getTripPreviewImageUri,
} from "@/src/services/trips";
import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
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
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange?.(n)}
          style={{ marginRight: 4 }}
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
  currentUid?: string;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onPress?: () => void;
  onMenuPress?: () => void;

  showFooter?: boolean;
  rating?: number;
  canRate?: boolean;
  onChangeRating?: (value: number) => void;
  onShareTrip?: () => void;
};

export function TripPreviewCard({
  trip,
  currentUid,
  selecting = false,
  selected = false,
  onToggleSelect,
  onPress,
  onMenuPress,
  showFooter = false,
  rating = 0,
  canRate = true,
  onChangeRating,
  onShareTrip,
}: Props) {
  const myPrivacy = currentUid ? (trip.memberPrivacy?.[currentUid] ?? "friends") : null;
  const [coverUrl, setCoverUrl] = useState<string | null>(
    trip.imageUrl ?? trip.coverImageUrl ?? null
  );
  const [changingPhoto, setChangingPhoto] = useState(false);

  const loadPreviewImage = useCallback(async () => {
    const uri = await getTripPreviewImageUri({
      id: trip.id,
      cityOrArea: trip.cityOrArea,
      imageUrl: trip.imageUrl ?? null,
      coverImageUrl: trip.coverImageUrl ?? null,
    });
    setCoverUrl(uri);
  }, [trip.id, trip.cityOrArea, trip.imageUrl, trip.coverImageUrl]);

  useEffect(() => {
    loadPreviewImage();
  }, [loadPreviewImage]);

  useFocusEffect(
    useCallback(() => {
      loadPreviewImage();
    }, [loadPreviewImage])
  );

  const handleChangePhoto = async () => {
    try {
      setChangingPhoto(true);

      const next = await changeTripCoverPhoto({
        id: trip.id,
        cityOrArea: trip.cityOrArea,
        imageUrl: trip.imageUrl ?? null,
        imagePath: trip.imagePath ?? null,
        coverImageUrl: trip.coverImageUrl ?? null,
      });

      if (next) {
        setCoverUrl(next);
      } else {
        await loadPreviewImage();
      }
    } catch (error: any) {
      Alert.alert(
        "Change Photo Failed",
        error?.message ?? "Could not update cover photo."
      );
    } finally {
      setChangingPhoto(false);
    }
  };

  const shouldShowRatingFooter = showFooter && canRate;

  return (
    <Pressable
      onPress={selecting ? onToggleSelect : onPress}
      style={{
        borderColor: selecting && selected ? "#F87171" : UI.colors.cardBorder,
        borderWidth: selecting && selected ? 2 : 1,
        borderRadius: UI.radius.card,
        overflow: "hidden",
        backgroundColor: UI.colors.cardBg,
        marginBottom: 16,
        ...UI.shadow.card,
      }}
    >
      <ImageBackground
        source={coverUrl ? { uri: coverUrl } : undefined}
        resizeMode="cover"
        imageStyle={{ opacity: 0.95 }}
      >
        <View
          style={{
            backgroundColor: coverUrl ? UI.colors.overlayDark : UI.colors.cardBg,
            padding: UI.spacing.cardPadding,
          }}
        >
          <View
            style={{
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  borderRadius: UI.radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: coverUrl ? "rgba(255,255,255,0.18)" : UI.colors.brandSoft,
                }}
              >
                <Text
                  style={{
                    fontSize: UI.type.overline,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    color: coverUrl ? "#FFFFFF" : UI.colors.brand,
                  }}
                >
                  {statusLabel(trip.status)}
                </Text>
              </View>

              <Text
                style={{
                  marginTop: 12,
                  fontSize: UI.type.cardTitle,
                  fontWeight: "600",
                  color: coverUrl ? "#FFFFFF" : UI.colors.textPrimary,
                }}
              >
                {trip.title}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontSize: UI.type.body,
                  color: coverUrl ? "#F1F5F9" : UI.colors.textSecondary,
                }}
              >
                {trip.cityOrArea} • {trip.startDate} to {trip.endDate}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontSize: UI.type.body,
                  color: coverUrl ? "#F1F5F9" : UI.colors.textSecondary,
                }}
              >
                {trip.stopCount ?? trip.stops?.length ?? 0} stops
              </Text>

              {(myPrivacy === "private" || myPrivacy === "friends") && (
                <View style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: coverUrl ? "rgba(0,0,0,0.35)" : "#F3F4F6",
                }}>
                  <Ionicons
                    name={myPrivacy === "private" ? "lock-closed" : "people-outline"}
                    size={10}
                    color={coverUrl ? "#FFFFFF" : "#6B7280"}
                  />
                  <Text style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: coverUrl ? "#FFFFFF" : "#6B7280",
                  }}>
                    {myPrivacy === "private" ? "Only you" : "Friends only"}
                  </Text>
                </View>
              )}
            </View>

            {onMenuPress ? (
              <TouchableOpacity
                onPress={(e: any) => { e?.stopPropagation?.(); onMenuPress(); }}
                activeOpacity={0.7}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: coverUrl ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.06)",
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={coverUrl ? "#FFFFFF" : UI.colors.textPrimary}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  handleChangePhoto();
                }}
                activeOpacity={0.85}
                style={{
                  backgroundColor: UI.colors.overlayLight,
                  borderRadius: UI.radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: UI.type.body, fontWeight: "500", color: UI.colors.brand }}>
                  {changingPhoto ? "Updating..." : "Change Photo"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {shouldShowRatingFooter ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: UI.type.body,
                    fontWeight: "500",
                    color: coverUrl ? "#FFFFFF" : UI.colors.textPrimary,
                  }}
                >
                  Your rating
                </Text>

                {onShareTrip ? (
                  <TouchableOpacity
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      onShareTrip();
                    }}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.80)",
                      borderRadius: UI.radius.pill,
                      padding: 8,
                    }}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color={UI.colors.brand}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={{ marginTop: 8 }}>
                <StarRating value={rating} onChange={onChangeRating} />
              </View>
            </>
          ) : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}