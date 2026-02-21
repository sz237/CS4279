import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import PlaceCard from "@/components/itinerary/PlaceCard";

const NEARBY_PLACES = [
  {
    id: "1",
    name: "Julia Pfeiffer Burns State Park",
    description: "Iconic McWay Falls viewpoint",
    distance: "0.3 mi",
    rating: 4.8,
  },
  {
    id: "2",
    name: "Nepenthe Restaurant",
    description: "Cliff-side dining with ocean panorama",
    distance: "1.2 mi",
    rating: 4.5,
  },
  {
    id: "3",
    name: "Henry Miller Memorial Library",
    description: "Art, books and live music events",
    distance: "2.1 mi",
    rating: 4.7,
  },
  {
    id: "4",
    name: "Pfeiffer Big Sur State Park",
    description: "Redwood forest hiking trails",
    distance: "3.8 mi",
    rating: 4.6,
  },
  {
    id: "5",
    name: "Sand Dollar Beach",
    description: "Largest sandy beach on the coast",
    distance: "7.4 mi",
    rating: 4.4,
  },
];

export default function ExploreScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">Nearby Places</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text className="text-violet-600 font-semibold text-sm">Filter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {NEARBY_PLACES.map((place) => (
          <PlaceCard
            key={place.id}
            name={place.name}
            description={place.description}
            distance={place.distance}
            rating={place.rating}
          />
        ))}
        <View className="items-center py-6">
          <Text className="text-xs text-gray-300">Powered by Google Places</Text>
        </View>
      </ScrollView>
    </View>
  );
}
