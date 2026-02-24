import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import AddActivityModal from "@/components/itinerary/AddActivityModal";
import { Day } from "@/components/itinerary/DayTabs";
import SheetStickyHeader from "@/components/itinerary/SheetStickyHeader";

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

export default function ItineraryTab() {
  const [selectedDayId, setSelectedDayId] = useState(DAYS[0].id);
  const [activitiesByDay, setActivitiesByDay] =
    useState<DayActivities>(INITIAL_ACTIVITIES);
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
    <View style={{ flex: 1 }}>

      {/* ── Section 1: Sticky day-tab header (bg-white, border #E5E7EB) ── */}
      <SheetStickyHeader
        days={DAYS}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      {/* ── Section 2: Scrollable activity cards (bg-gray-50 / #F9FAFB) ── */}
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <DraggableFlatList
          data={currentActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 8 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
              <Ionicons name="map-outline" size={48} color="#E5E7EB" />
              <Text style={{ color: "#9CA3AF", marginTop: 12, fontSize: 16, fontWeight: "500" }}>
                No activities yet
              </Text>
              <Text style={{ color: "#D1D5DB", fontSize: 14, marginTop: 4 }}>
                Tap "+ Add Activity" to get started
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: "#D1D5DB",
                  borderRadius: 16,
                  paddingVertical: 16,
                }}
              >
                <Ionicons name="add" size={20} color="#6B7280" />
                <Text style={{ color: "#6B7280", fontWeight: "600", marginLeft: 4 }}>
                  Add Activity
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      <AddActivityModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddActivity}
      />
    </View>
  );
}
