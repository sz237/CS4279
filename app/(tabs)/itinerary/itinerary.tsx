import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import AddActivityModal from "@/components/itinerary/AddActivityModal";
import { CommuteConnector } from "@/components/itinerary/CommuteConnector";
import { Day } from "@/components/itinerary/DayTabs";
import SheetStickyHeader from "@/components/itinerary/SheetStickyHeader";
import type { TravelMode } from "@/components/itinerary/CommuteConnector";

import {
  getBestAddress,
  getBestName,
  getBestPhotoUrl,
  searchText,
  type LatLng,
  type PlaceV1,
} from "@/src/googlePlaces";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ItineraryBlock = {
  time: string;
  duration: string;
  query: string;
  travelMinutes?: number;
  travelMode?: TravelMode;
};

type DayActivities = Record<string, Activity[]>;

// ─── Data ──────────────────────────────────────────────────────────────────────
const DAYS: Day[] = [
  { id: "sat-321", label: "Sat", dateLabel: "3/21" },
  { id: "sun-322", label: "Sun", dateLabel: "3/22" },
  { id: "mon-323", label: "Mon", dateLabel: "3/23" },
  { id: "tue-324", label: "Tue", dateLabel: "3/24" },
];

const NYC_CENTER: LatLng = { lat: 40.758, lng: -73.9855 };
const NYC_RADIUS_METERS = 15000;

const NYC_BLOCKS_BY_DAY: Record<string, ItineraryBlock[]> = {
  "sat-321": [
    { time: "9:00 AM",  duration: "1.5 hours", query: "Breakfast cafe in Lower Manhattan",   travelMinutes: 12, travelMode: "walk"    },
    { time: "11:00 AM", duration: "2 hours",   query: "Chinatown Manhattan food and sights", travelMinutes: 20, travelMode: "drive"   },
    { time: "1:30 PM",  duration: "2 hours",   query: "Brooklyn Bridge walk entrance",       travelMinutes: 15, travelMode: "transit" },
    { time: "4:00 PM",  duration: "2 hours",   query: "DUMBO Brooklyn best viewpoint",       travelMinutes: 25, travelMode: "drive"   },
    { time: "7:30 PM",  duration: "2 hours",   query: "Dinner in West Village NYC" },
  ],
  "sun-322": [
    { time: "9:00 AM",  duration: "2 hours",   query: "Central Park Bethesda Terrace",    travelMinutes: 18, travelMode: "walk"    },
    { time: "11:30 AM", duration: "2.5 hours", query: "Art museum in NYC",                travelMinutes: 22, travelMode: "transit" },
    { time: "3:00 PM",  duration: "1.5 hours", query: "Bakery Upper West Side NYC",       travelMinutes: 10, travelMode: "walk"    },
    { time: "5:30 PM",  duration: "1.5 hours", query: "Observation deck NYC skyline",     travelMinutes: 30, travelMode: "drive"   },
    { time: "8:00 PM",  duration: "2 hours",   query: "Korean dinner Koreatown Manhattan" },
  ],
  "mon-323": [
    { time: "10:00 AM", duration: "1.5 hours", query: "High Line NYC entry",                    travelMinutes: 8,  travelMode: "walk"    },
    { time: "12:00 PM", duration: "1.5 hours", query: "Lunch Chelsea Market",                   travelMinutes: 20, travelMode: "transit" },
    { time: "2:30 PM",  duration: "2 hours",   query: "SoHo shopping NYC",                      travelMinutes: 15, travelMode: "walk"    },
    { time: "5:30 PM",  duration: "1.5 hours", query: "Rockefeller Center Top of the Rock",     travelMinutes: 12, travelMode: "walk"    },
    { time: "7:30 PM",  duration: "2 hours",   query: "Dinner Hell's Kitchen NYC" },
  ],
  "tue-324": [
    { time: "9:00 AM",  duration: "1.5 hours", query: "9/11 Memorial",                              travelMinutes: 10, travelMode: "walk"    },
    { time: "11:00 AM", duration: "1 hour",    query: "Wall Street NYC",                            travelMinutes: 14, travelMode: "walk"    },
    { time: "12:30 PM", duration: "1.5 hours", query: "Lunch near World Trade Center",              travelMinutes: 35, travelMode: "transit" },
    { time: "3:30 PM",  duration: "2.5 hours", query: "Williamsburg Brooklyn coffee and shops",     travelMinutes: 20, travelMode: "drive"   },
    { time: "7:00 PM",  duration: "2 hours",   query: "Dinner Williamsburg Brooklyn" },
  ],
};

const INITIAL_ACTIVITIES: DayActivities = {
  "sat-321": [],
  "sun-322": [],
  "mon-323": [],
  "tue-324": [],
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function pickFirstUnused(results: PlaceV1[], used: Set<string>): PlaceV1 | null {
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
  block: ItineraryBlock;
}): Activity {
  const { apiKey, place, block } = params;
  return {
    id: place.id,
    title: getBestName(place),
    description: getBestAddress(place),
    time: block.time,
    duration: block.duration,
    imageUrl: getBestPhotoUrl({ apiKey, place, maxWidthPx: 1200 }),
    travelMinutes: block.travelMinutes,
    travelMode: block.travelMode,
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function EmptyState({ onGenerate, isGenerating, onAdd }: {
  onGenerate: () => void;
  isGenerating: boolean;
  onAdd: () => void;
}) {
  return (
    <View className="items-center justify-center py-20 px-6 gap-4">
      <Ionicons name="map-outline" size={48} color="#E5E7EB" />
      <Text className="text-gray-400 text-base font-medium mt-2">No activities yet</Text>
      <TouchableOpacity
        onPress={onGenerate}
        disabled={isGenerating}
        activeOpacity={0.85}
        className={`flex-row items-center gap-2 px-6 py-3 rounded-2xl ${isGenerating ? "bg-gray-300" : "bg-zinc-900"}`}
      >
        <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
        <Text className="text-white font-bold text-sm">
          {isGenerating ? "Generating…" : "Generate NYC Itinerary"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onAdd}
        activeOpacity={0.85}
        className="flex-row items-center gap-2 px-6 py-3 rounded-2xl border border-dashed border-gray-300"
      >
        <Ionicons name="add" size={16} color="#6B7280" />
        <Text className="text-gray-500 font-semibold text-sm">Add Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

function AddActivityFooter({ onPress }: { onPress: () => void }) {
  return (
    <View className="px-4 pt-2 pb-6">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="flex-row items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-4"
      >
        <Ionicons name="add" size={18} color="#6B7280" />
        <Text className="text-gray-500 font-semibold">Add Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ItineraryTab() {
  const [selectedDayId, setSelectedDayId] = useState(DAYS[0].id);
  const [activitiesByDay, setActivitiesByDay] = useState<DayActivities>(INITIAL_ACTIVITIES);
  const [modalVisible, setModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey as string | undefined;

  const currentActivities = activitiesByDay[selectedDayId] ?? [];
  const blocksForSelectedDay = useMemo(
    () => NYC_BLOCKS_BY_DAY[selectedDayId] ?? [],
    [selectedDayId]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Activity[] }) =>
      setActivitiesByDay((prev) => ({ ...prev, [selectedDayId]: data })),
    [selectedDayId]
  );

  const handleAddActivity = useCallback(
    (activity: Omit<Activity, "id">) =>
      setActivitiesByDay((prev) => ({
        ...prev,
        [selectedDayId]: [...(prev[selectedDayId] ?? []), { ...activity, id: Date.now().toString() }],
      })),
    [selectedDayId]
  );

  const handleRemoveActivity = useCallback(
    (id: string) =>
      setActivitiesByDay((prev) => ({
        ...prev,
        [selectedDayId]: (prev[selectedDayId] ?? []).filter((a) => a.id !== id),
      })),
    [selectedDayId]
  );

  const generateActivitiesForSelectedDay = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert("Missing API Key", "Set EXPO_PUBLIC_googlePlacesApiKey in your .env file.");
      return;
    }
    if (!blocksForSelectedDay.length) {
      Alert.alert("No presets", "No time blocks configured for this day.");
      return;
    }

    setIsGenerating(true);
    try {
      const usedPlaceIds = new Set<string>();
      const generated: Activity[] = [];

      for (const block of blocksForSelectedDay) {
        const resp = await searchText({
          apiKey: GOOGLE_PLACES_API_KEY,
          textQuery: block.query,
          locationBias: { center: NYC_CENTER, radiusMeters: NYC_RADIUS_METERS },
          maxResultCount: 10,
        });

        const chosen = pickFirstUnused(resp.places ?? [], usedPlaceIds);
        generated.push(
          chosen
            ? mapPlaceToActivity({ apiKey: GOOGLE_PLACES_API_KEY, place: chosen, block })
            : {
                id: `${Date.now()}-${Math.random()}`,
                title: block.query,
                description: "No results found",
                time: block.time,
                duration: block.duration,
                travelMinutes: block.travelMinutes,
                travelMode: block.travelMode,
              }
        );
      }

      setActivitiesByDay((prev) => ({ ...prev, [selectedDayId]: generated }));
    } catch (e: any) {
      Alert.alert("Couldn't generate itinerary", e?.message ?? "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [GOOGLE_PLACES_API_KEY, blocksForSelectedDay, selectedDayId]);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Activity>) => {
      const index = getIndex?.() ?? 0;
      const isLast = index === currentActivities.length - 1;

      return (
        <ScaleDecorator>
          <ActivityCard
            activity={item}
            drag={drag}
            isActive={isActive}
            onRemove={handleRemoveActivity}
          />
          {!isLast && item.travelMinutes != null && (
            <CommuteConnector
              minutes={item.travelMinutes}
              mode={item.travelMode ?? "walk"}
            />
          )}
        </ScaleDecorator>
      );
    },
    [handleRemoveActivity, currentActivities.length]
  );

  return (
    <View className="flex-1">
      {/* Sticky day-tab header — white, reports its height to the layout */}
      <SheetStickyHeader
        days={DAYS}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      {/* Gray activities container with its own rounded top corners */}
      <View className="flex-1 bg-gray-100 rounded-t-[40px] overflow-hidden">
        {/* Edit row */}
        <View className="flex-row justify-end items-center px-6 pt-5 pb-1">
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-bold text-zinc-900">edit</Text>
            <Ionicons name="pencil-outline" size={14} color="#525252" />
          </TouchableOpacity>
        </View>

        <DraggableFlatList
          data={currentActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
          ListEmptyComponent={
            <EmptyState
              onGenerate={generateActivitiesForSelectedDay}
              isGenerating={isGenerating}
              onAdd={() => setModalVisible(true)}
            />
          }
          ListFooterComponent={
            currentActivities.length > 0
              ? <AddActivityFooter onPress={() => setModalVisible(true)} />
              : null
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
