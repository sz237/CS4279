import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import AddActivityModal from "@/components/itinerary/AddActivityModal";
import { Day } from "@/components/itinerary/DayTabs";
import SheetStickyHeader from "@/components/itinerary/SheetStickyHeader";

// ✅ Places API (New) helpers (v1)
import {
  getBestAddress,
  getBestName,
  getBestPhotoUrl,
  searchText,
  type LatLng,
  type PlaceV1,
} from "@/src/googlePlaces";

const DAYS: Day[] = [
  { id: "sat-321", label: "Sat", dateLabel: "3/21" },
  { id: "sun-322", label: "Sun", dateLabel: "3/22" },
  { id: "mon-323", label: "Mon", dateLabel: "3/23" },
  { id: "tue-324", label: "Tue", dateLabel: "3/24" },
];

type DayActivities = Record<string, Activity[]>;

type ItineraryBlock = {
  time: string;
  duration: string;
  query: string;
};

const NYC_CENTER: LatLng = { lat: 40.758, lng: -73.9855 };
const NYC_RADIUS_METERS = 15000;

const NYC_BLOCKS_BY_DAY: Record<string, ItineraryBlock[]> = {
  "sat-321": [
    { time: "9:00 AM", duration: "1.5 hours", query: "Breakfast cafe in Lower Manhattan" },
    { time: "11:00 AM", duration: "2 hours", query: "Chinatown Manhattan food and sights" },
    { time: "1:30 PM", duration: "2 hours", query: "Brooklyn Bridge walk entrance" },
    { time: "4:00 PM", duration: "2 hours", query: "DUMBO Brooklyn best viewpoint" },
    { time: "7:30 PM", duration: "2 hours", query: "Dinner in West Village NYC" },
  ],
  "sun-322": [
    { time: "9:00 AM", duration: "2 hours", query: "Central Park Bethesda Terrace" },
    { time: "11:30 AM", duration: "2.5 hours", query: "Art museum in NYC" },
    { time: "3:00 PM", duration: "1.5 hours", query: "Bakery Upper West Side NYC" },
    { time: "5:30 PM", duration: "1.5 hours", query: "Observation deck NYC skyline" },
    { time: "8:00 PM", duration: "2 hours", query: "Korean dinner Koreatown Manhattan" },
  ],
  "mon-323": [
    { time: "10:00 AM", duration: "1.5 hours", query: "High Line NYC entry" },
    { time: "12:00 PM", duration: "1.5 hours", query: "Lunch Chelsea Market" },
    { time: "2:30 PM", duration: "2 hours", query: "SoHo shopping NYC" },
    { time: "5:30 PM", duration: "1.5 hours", query: "Rockefeller Center Top of the Rock" },
    { time: "7:30 PM", duration: "2 hours", query: "Dinner Hell's Kitchen NYC" },
  ],
  "tue-324": [
    { time: "9:00 AM", duration: "1.5 hours", query: "9/11 Memorial" },
    { time: "11:00 AM", duration: "1 hour", query: "Wall Street NYC" },
    { time: "12:30 PM", duration: "1.5 hours", query: "Lunch near World Trade Center" },
    { time: "3:30 PM", duration: "2.5 hours", query: "Williamsburg Brooklyn coffee and shops" },
    { time: "7:00 PM", duration: "2 hours", query: "Dinner Williamsburg Brooklyn" },
  ],
};

const INITIAL_ACTIVITIES: DayActivities = {
  "sat-321": [],
  "sun-322": [],
  "mon-323": [],
  "tue-324": [],
};

function pickFirstUnused(results: PlaceV1[], used: Set<string>) {
  for (const r of results) {
    if (!used.has(r.id)) {
      used.add(r.id);
      return r;
    }
  }
  return null;
}

function mapPlaceToActivity(params: {
  apiKey: string;
  place: PlaceV1;
  time: string;
  duration: string;
}): Activity {
  const { apiKey, place, time, duration } = params;

  return {
    id: place.id,
    title: getBestName(place),
    description: getBestAddress(place),
    time,
    duration,
    imageUrl: getBestPhotoUrl({ apiKey, place, maxWidthPx: 1200 }),
  };
}

export default function ItineraryTab() {
  const [selectedDayId, setSelectedDayId] = useState(DAYS[0].id);
  const [activitiesByDay, setActivitiesByDay] =
    useState<DayActivities>(INITIAL_ACTIVITIES);
  const [modalVisible, setModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentActivities = activitiesByDay[selectedDayId] ?? [];

  // ✅ FIX: use the standard Expo public env var name
  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey as
    | string
    | undefined;

  const blocksForSelectedDay = useMemo(
    () => NYC_BLOCKS_BY_DAY[selectedDayId] ?? [],
    [selectedDayId]
  );

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

  // ✅ Remove from the currently selected day
  const handleRemoveActivity = useCallback(
    (id: string) => {
      setActivitiesByDay((prev) => ({
        ...prev,
        [selectedDayId]: (prev[selectedDayId] ?? []).filter((a) => a.id !== id),
      }));
    },
    [selectedDayId]
  );

  const generateActivitiesForSelectedDay = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert(
        "Missing API Key",
        "Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in your .env file."
      );
      return;
    }

    if (!blocksForSelectedDay.length) {
      Alert.alert("No presets", "No time blocks configured for this day.");
      return;
    }

    try {
      setIsGenerating(true);

      const usedPlaceIds = new Set<string>();
      const generated: Activity[] = [];

      for (const block of blocksForSelectedDay) {
        const resp = await searchText({
          apiKey: GOOGLE_PLACES_API_KEY,
          textQuery: block.query,
          locationBias: { center: NYC_CENTER, radiusMeters: NYC_RADIUS_METERS },
          maxResultCount: 10,
        });

        const results = resp.places ?? [];
        const chosen = pickFirstUnused(results, usedPlaceIds);

        if (!chosen) {
          generated.push({
            id: `${Date.now()}-${Math.random()}`,
            title: block.query,
            description: "No results found",
            time: block.time,
            duration: block.duration,
          });
          continue;
        }

        generated.push(
          mapPlaceToActivity({
            apiKey: GOOGLE_PLACES_API_KEY,
            place: chosen,
            time: block.time,
            duration: block.duration,
          })
        );
      }

      setActivitiesByDay((prev) => ({ ...prev, [selectedDayId]: generated }));
    } catch (e: any) {
      Alert.alert("Couldn’t generate itinerary", e?.message ?? "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [GOOGLE_PLACES_API_KEY, blocksForSelectedDay, selectedDayId]);

  // ✅ FIX: pass onRemove into ActivityCard
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Activity>) => (
      <ScaleDecorator>
        <ActivityCard
          activity={item}
          drag={drag}
          isActive={isActive}
          onRemove={handleRemoveActivity}
        />
      </ScaleDecorator>
    ),
    [handleRemoveActivity]
  );

  return (
    <View style={{ flex: 1 }}>
      <SheetStickyHeader
        days={DAYS}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#F9FAFB" }}>
        <TouchableOpacity
          onPress={generateActivitiesForSelectedDay}
          disabled={isGenerating}
          activeOpacity={0.85}
          style={{
            backgroundColor: isGenerating ? "#9CA3AF" : "#111827",
            borderRadius: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 8 }}>
            {isGenerating ? "Generating…" : "Generate NYC itinerary"}
          </Text>
        </TouchableOpacity>
      </View>

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
                Tap “Generate NYC itinerary” or “Add Activity”
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