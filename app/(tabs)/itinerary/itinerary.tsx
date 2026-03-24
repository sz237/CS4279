import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import AddActivityModal, { ManualStopInput } from "@/components/itinerary/AddActivityModal";
import { CommuteConnector } from "@/components/itinerary/CommuteConnector";
import { EditableItineraryList } from "@/components/itinerary/EditableItineraryList";
import { Day } from "@/components/itinerary/DayTabs";
import SheetStickyHeader from "@/components/itinerary/SheetStickyHeader";
import { useItinerarySheet } from "@/lib/ItinerarySheetContext";
import { useTrips } from "@/context/TripsContext";
import { useStops } from "@/hooks/useStops";
import type { StopModel } from "@/src/models";
import { saveStop } from "@/src/services/trips";
import { collection, doc } from "firebase/firestore";
import { db } from "@/src/config/firebase";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateDayTabs(startDate: string, endDate: string): Day[] {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days: Day[] = [];
  const end = new Date(endDate + "T00:00:00");
  let cur = new Date(startDate + "T00:00:00");
  while (cur <= end) {
    const iso = cur.toISOString().split("T")[0];
    days.push({
      id: iso,
      label: DAY_NAMES[cur.getDay()],
      dateLabel: `${cur.getMonth() + 1}/${cur.getDate()}`,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function stopToActivity(stop: StopModel): Activity {
  return {
    id: stop.id,
    title: stop.name,
    description: stop.address,
    time: stop.timeLabel ?? "",
    duration: stop.duration ?? "",
    imageUrl: stop.photoUrl ?? undefined,
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View className="items-center justify-center py-20 px-6 gap-4">
      <Ionicons name="map-outline" size={48} color="#E5E7EB" />
      <Text className="text-gray-400 text-base font-medium mt-2">
        No activities for this day
      </Text>
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
  const { setMapDay } = useItinerarySheet();
  const { trips, selectedTripId } = useTrips();
  const trip = trips.find((t) => t.id === selectedTripId) ?? null;
  const { stops } = useStops(selectedTripId);

  const days: Day[] = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    return generateDayTabs(trip.startDate, trip.endDate);
  }, [trip?.startDate, trip?.endDate]);

  const [selectedDayId, setSelectedDayId] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const handleAddActivity = useCallback(async (input: ManualStopInput) => {
    if (!selectedTripId) return;
    const id = doc(collection(db, "itineraries", selectedTripId, "stops")).id;
    const stop: StopModel = {
      id,
      orderIndex: stops.length,
      day: selectedDayId,
      timeLabel: input.timeLabel || null,
      duration: input.duration || null,
      placeId: "",
      name: input.name,
      address: input.address,
      photoUrl: null,
      lat: 0,
      lng: 0,
      rating: null,
      userRatingCount: null,
      types: [],
      briefSummary: null,
      travelMode: null,
      travelMinutes: null,
      category: null,
    };
    await saveStop(selectedTripId, stop);
    setAddModalVisible(false);
  }, [selectedTripId, selectedDayId, stops.length]);

  // Default to first day once days are available, and reset if the selected day
  // is no longer in range (e.g. after a date edit that shortened the trip).
  useEffect(() => {
    if (days.length > 0 && !days.find((d) => d.id === selectedDayId)) {
      setSelectedDayId(days[0].id);
    }
  }, [days]);

  // Keep the map in sync with the selected day
  useEffect(() => {
    if (selectedDayId) setMapDay(selectedDayId);
  }, [selectedDayId, setMapDay]);

  const stopsForDay = useMemo(
    () => stops.filter((s) => s.day === selectedDayId),
    [stops, selectedDayId]
  );

  const activities: Activity[] = useMemo(
    () => stopsForDay.map(stopToActivity),
    [stopsForDay]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Activity>) => {
      const index = getIndex?.() ?? 0;
      const isLast = index === activities.length - 1;
      const currentStop = stopsForDay[index];

      return (
        <ScaleDecorator>
          <ActivityCard
            activity={item}
            drag={drag}
            isActive={isActive}
            onRemove={() => {}}
          />
          {!isLast && currentStop?.travelMode && (
            <CommuteConnector
              minutes={currentStop.travelMinutes}
              mode={(currentStop.travelMode as any) ?? "walk"}
            />
          )}
        </ScaleDecorator>
      );
    },
    [activities.length, stopsForDay]
  );

  return (
    <View className="flex-1">
      <SheetStickyHeader
        days={days}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      <View className="flex-1 bg-gray-100 rounded-t-[40px] overflow-hidden">
        {isEditMode ? (
          <>
            {/* Edit mode header */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-2 bg-gray-100">
              <TouchableOpacity
                onPress={() => setIsEditMode(false)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-sm font-semibold text-zinc-500">Cancel</Text>
              </TouchableOpacity>

              <Text className="text-base font-bold text-zinc-900">Edit Mode</Text>

              <TouchableOpacity
                onPress={() => setIsEditMode(false)}
                activeOpacity={0.8}
                className="bg-violet-600 rounded-full px-4 py-1.5"
              >
                <Text className="text-sm font-bold text-white">Done</Text>
              </TouchableOpacity>
            </View>

            <EditableItineraryList
              activities={activities}
              stopsForDay={stopsForDay}
              onAddActivity={() => setAddModalVisible(true)}
              onRemove={() => {}}
            />

          </>
        ) : (
          <>
            <View className="flex-row justify-end items-center px-6 pt-5 pb-1">
              <TouchableOpacity
                className="flex-row items-center gap-1.5"
                activeOpacity={0.7}
                onPress={() => setIsEditMode(true)}
              >
                <Text className="text-sm font-bold text-zinc-900">Edit</Text>
                <Ionicons name="pencil-outline" size={14} color="#525252" />
              </TouchableOpacity>
            </View>

            <DraggableFlatList
              data={activities}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              onDragEnd={() => {}}
              containerStyle={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
              ListEmptyComponent={<EmptyState />}
              ListFooterComponent={
                activities.length > 0 ? <AddActivityFooter onPress={() => {}} /> : null
              }
            />
          </>
        )}
      </View>

      <AddActivityModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={handleAddActivity}
      />
    </View>
  );
}
