import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Image, Text, TouchableOpacity, View } from "react-native";
import type { TravelMode } from "./CommuteConnector";

export interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  imageUrl?: string;
  travelMinutes?: number;
  travelMode?: TravelMode;
}

interface ActivityCardProps {
  activity: Activity;
  drag?: () => void;
  isActive?: boolean;
  onRemove?: (id: string) => void;
}

function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function ActivityThumbnail({ uri }: { uri?: string }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        className="w-16 h-16 rounded-xl mr-3"
        resizeMode="cover"
      />
    );
  }
  return (
    <View className="w-16 h-16 rounded-xl mr-3 bg-gray-100 items-center justify-center">
      <Ionicons name="image-outline" size={24} color="#D1D5DB" />
    </View>
  );
}

export default function ActivityCard({
  activity,
  drag,
  isActive,
  onRemove,
}: ActivityCardProps) {
  const hasDescription = !!activity.description?.trim();

  const handleOpenAddress = async () => {
    if (!hasDescription) return;
    const q = `${activity.description} ${activity.title}`.trim();
    const url = googleMapsSearchUrl(q);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  return (
    <View
      className={`flex-row items-center bg-white rounded-2xl mx-4 border border-slate-100 overflow-hidden ${isActive ? "opacity-80" : ""}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isActive ? 0.15 : 0.05,
        shadowRadius: isActive ? 6 : 2,
        elevation: isActive ? 6 : 1,
      }}
    >
      {/* Remove button */}
      {onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(activity.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/5 items-center justify-center z-10"
        >
          <Ionicons name="close" size={14} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Drag handle */}
      <TouchableOpacity
        onLongPress={drag}
        className="px-3 py-4 justify-center"
        activeOpacity={0.6}
      >
        <Ionicons name="reorder-three" size={22} color="#CBD5E1" />
      </TouchableOpacity>

      {/* Content */}
      <View className="flex-1 py-3 pr-2 gap-1">
        {/* Title + time */}
        <View className="flex-row justify-between items-baseline">
          <Text className="text-base font-bold text-zinc-900 flex-1 mr-2" numberOfLines={1}>
            {activity.title}
          </Text>
          <Text className="text-xs font-semibold text-violet-500">
            {activity.time}
          </Text>
        </View>

        {/* Address */}
        {hasDescription ? (
          <TouchableOpacity activeOpacity={0.7} onPress={handleOpenAddress}>
            <Text
              className="text-xs text-blue-600"
              style={{ textDecorationLine: "underline" }}
              numberOfLines={1}
            >
              {activity.description}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-xs text-gray-400" numberOfLines={1}>—</Text>
        )}

        {/* Duration */}
        <View className="flex-row items-center gap-1.5 pt-1">
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text className="text-[10px] font-bold text-gray-500">
            {activity.duration}
          </Text>
        </View>
      </View>

      <ActivityThumbnail uri={activity.imageUrl} />
    </View>
  );
}
