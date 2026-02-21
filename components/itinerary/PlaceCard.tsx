import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PlaceCardProps {
  name: string;
  description: string;
  distance: string;
  rating: number;
  onAdd?: () => void;
}

export default function PlaceCard({
  name,
  description,
  distance,
  rating,
  onAdd,
}: PlaceCardProps) {
  return (
    <View
      className="bg-white rounded-2xl mx-4 mb-3 p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-gray-900">{name}</Text>
          <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
        </View>
        <TouchableOpacity onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={26} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
        <View className="bg-gray-100 rounded-full px-2.5 py-0.5">
          <Text className="text-xs text-gray-600 font-medium">{distance}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 3 }}>
          <Ionicons name="star" size={12} color="#FBBF24" />
          <Text className="text-xs text-gray-600">{rating.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
}
