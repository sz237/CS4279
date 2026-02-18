import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import DayTabs, { Day } from "@/components/itinerary/DayTabs";
import AddActivityModal from "@/components/itinerary/AddActivityModal";

const DAYS: Day[] = [
  { id: "sat-321", label: "Sat", dateLabel: "3/21" },
  { id: "sun-322", label: "Sun", dateLabel: "3/22" },
  { id: "mon-323", label: "Mon", dateLabel: "3/23" },
  { id: "tue-324", label: "Tue", dateLabel: "3/24" },
];

type DayActivities = Record<string, Activity[]>;

const INITIAL_ACTIVITIES: DayActivities = {
  "sat-321": [
    {
      id: "1",
      title: "Big Sur",
      description: "Get photo of bridge!",
      time: "9:00 AM",
      duration: "2 hours",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Bixby_Creek_Bridge%2C_taken_by_HeyItsAlex%2C_March_2014.jpg/1280px-Bixby_Creek_Bridge%2C_taken_by_HeyItsAlex%2C_March_2014.jpg",
    },
    {
      id: "2",
      title: "McWay Falls",
      description: "Beautiful waterfall view",
      time: "11:30 AM",
      duration: "1 hour",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/McWay_Falls_2013.jpg/1280px-McWay_Falls_2013.jpg",
    },
    {
      id: "3",
      title: "Nepenthe Restaurant",
      description: "Lunch with ocean views",
      time: "12:30 PM",
      duration: "1.5 hours",
    },
    {
      id: "4",
      title: "Pfeiffer Beach",
      description: "Purple sand beach at sunset",
      time: "4:00 PM",
      duration: "2.5 hours",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pfeiffer_Beach_Purple_Sand.jpg/1280px-Pfeiffer_Beach_Purple_Sand.jpg",
    },
  ],
  "sun-322": [
    {
      id: "5",
      title: "Point Lobos",
      description: "Scenic coastal state reserve",
      time: "9:30 AM",
      duration: "2 hours",
    },
    {
      id: "6",
      title: "Carmel-by-the-Sea",
      description: "Explore charming downtown",
      time: "12:00 PM",
      duration: "3 hours",
    },
  ],
  "mon-323": [
    {
      id: "7",
      title: "17-Mile Drive",
      description: "Iconic scenic coastal road",
      time: "10:00 AM",
      duration: "2 hours",
    },
  ],
  "tue-324": [],
};

export default function ItineraryScreen() {
  const [selectedDayId, setSelectedDayId] = useState(DAYS[0].id);
  const [activitiesByDay, setActivitiesByDay] = useState<DayActivities>(INITIAL_ACTIVITIES);
  const [modalVisible, setModalVisible] = useState(false);

  const currentActivities = activitiesByDay[selectedDayId] ?? [];

  const handleDragEnd = useCallback(
    ({ data }: { data: Activity[] }) => {
      setActivitiesByDay((prev) => ({ ...prev, [selectedDayId]: data }));
    },
    [selectedDayId]
  );

  const handleAddActivity = useCallback(
    (activity: Omit<Activity, "id">) => {
      const newActivity: Activity = { ...activity, id: Date.now().toString() };
      setActivitiesByDay((prev) => ({
        ...prev,
        [selectedDayId]: [...(prev[selectedDayId] ?? []), newActivity],
      }));
    },
    [selectedDayId]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Activity>) => (
      <ScaleDecorator>
        <ActivityCard activity={item} drag={drag} isActive={isActive} />
      </ScaleDecorator>
    ),
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-2 pb-1">
        <Text className="text-2xl font-bold text-gray-900">SoCal Road Trip 🌴</Text>
        <Text className="text-sm text-gray-400 mt-0.5">March 21–25, 2025</Text>
      </View>

      {/* Day Tabs */}
      <DayTabs
        days={DAYS}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      {/* Drag hint */}
      <View className="flex-row items-center px-5 mb-3">
        <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
        <Text className="text-xs text-gray-400 ml-1">
          Long press and drag to reorder activities
        </Text>
      </View>

      {/* Activity List */}
      <DraggableFlatList
        data={currentActivities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        containerStyle={{ flex: 1 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="map-outline" size={48} color="#E5E7EB" />
            <Text className="text-gray-400 mt-3 text-base font-medium">
              No activities yet
            </Text>
            <Text className="text-gray-300 text-sm mt-1">
              Tap "+ Add Activity" to get started
            </Text>
          </View>
        }
        ListFooterComponent={<View className="h-4" />}
      />

      {/* Add Activity Button */}
      <View className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl py-4"
        >
          <Ionicons name="add" size={20} color="#6B7280" />
          <Text className="text-gray-500 font-semibold ml-1">Add Activity</Text>
        </TouchableOpacity>
      </View>

      <AddActivityModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddActivity}
      />
    </SafeAreaView>
  );
}