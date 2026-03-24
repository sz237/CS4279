import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import type { PlaceV1 } from "@/src/googlePlaces";
import { getBestName, getBestPhotoUrl } from "@/src/googlePlaces";

type Props = {
  place: PlaceV1;
  apiKey: string;
  selected: boolean;
  onToggle: () => void;
};

function extractArea(formattedAddress?: string): string {
  if (!formattedAddress) return "";
  const parts = formattedAddress.split(", ");
  return parts.length > 1 ? parts[1] : parts[0];
}

function formatRatingCount(count?: number): string {
  if (count == null) return "";
  if (count >= 1000) return `(${(count / 1000).toFixed(1)}k)`;
  return `(${count})`;
}

export function PlaceListCard({ place, apiKey, selected, onToggle }: Props) {
  const name = getBestName(place);
  const imageUrl = getBestPhotoUrl({ apiKey, place, maxWidthPx: 400 });
  const area = extractArea(place.formattedAddress);
  const type = (place.primaryType ?? place.types?.[0] ?? "").replaceAll("_", " ");
  const rating = place.rating;
  const ratingCount = place.userRatingCount;

  return (
    <Pressable
      onPress={onToggle}
      className="self-stretch bg-white rounded-3xl mb-3 flex-row overflow-hidden"
      style={{
        shadowColor: "#191C1D",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 4,
      }}
    >
      {/* Left: content */}
      <View className="flex-1 p-6 justify-between">
        <View className="gap-2">
          {/* Selection dot */}
          <View className={`w-5 h-5 rounded-full items-center justify-center ${selected ? "bg-green-500" : "bg-zinc-300"}`}>
            {selected && <Ionicons name="checkmark" size={11} color="white" />}
          </View>

          {/* Name */}
          <Text className="text-xl font-bold text-zinc-900 leading-7" numberOfLines={2}>
            {name}
          </Text>

          {/* Area · Type */}
          {(area || type) && (
            <Text className="text-xs font-medium text-neutral-600" numberOfLines={1}>
              {[area, type].filter(Boolean).join(" • ")}
            </Text>
          )}
        </View>

        {/* Rating */}
        {rating != null && (
          <View className="flex-row items-center gap-1.5 pt-4">
            <Ionicons name="star" size={12} color="#92400E" />
            <Text className="text-sm font-bold text-zinc-900">{rating.toFixed(1)}</Text>
            {ratingCount != null && (
              <Text className="text-xs text-neutral-600 opacity-60">
                {formatRatingCount(ratingCount)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Right: image */}
      <View className="w-32 self-stretch overflow-hidden">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="flex-1" resizeMode="cover" />
        ) : (
          <View className="flex-1 bg-gray-100 items-center justify-center">
            <Ionicons name="image-outline" size={24} color="#D1D5DB" />
          </View>
        )}
      </View>
    </Pressable>
  );
}
