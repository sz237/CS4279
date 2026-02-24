import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  imageUrl?: string;
}

interface ActivityCardProps {
  activity: Activity;
  drag?: () => void;
  isActive?: boolean;
}

export default function ActivityCard({ activity, drag, isActive }: ActivityCardProps) {
  return (
    <View
      className={`flex-row items-center bg-white rounded-2xl mx-4 mb-3 overflow-hidden ${
        isActive ? "opacity-80" : ""
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isActive ? 0.2 : 0.06,
        shadowRadius: isActive ? 8 : 4,
        elevation: isActive ? 8 : 2,
      }}
    >
      {/* Drag Handle */}
      <TouchableOpacity
        onLongPress={drag}
        className="px-3 py-4 justify-center"
        activeOpacity={0.6}
      >
        <Ionicons name="reorder-three" size={22} color="#C4C4C4" />
      </TouchableOpacity>

      {/* Content */}
      <View className="flex-1 py-3 pr-2">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2">
            {activity.title}
          </Text>
          <Text className="text-xs text-gray-400 font-medium">{activity.time}</Text>
        </View>
        <Text className="text-sm text-gray-500 mb-1">{activity.description}</Text>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <Text className="text-xs text-gray-400 ml-1">{activity.duration}</Text>
        </View>
      </View>

      {/* Image */}
      {activity.imageUrl ? (
        <Image
          source={{ uri: activity.imageUrl }}
          className="w-16 h-16 rounded-xl mr-3"
          resizeMode="cover"
        />
      ) : (
        <View className="w-16 h-16 rounded-xl mr-3 bg-gray-100 items-center justify-center">
          <Ionicons name="image-outline" size={24} color="#D1D5DB" />
        </View>
      )}
    </View>
  );
}