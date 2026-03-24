import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import ActivityCard from "@/components/itinerary/ActivityCard";
import { CommuteConnector } from "@/components/itinerary/CommuteConnector";
import DayTabs from "@/components/itinerary/DayTabs";
import { CollapsedTripHeader } from "@/components/addTrip/CollapsedTripHeader";
import { TripDatePicker } from "@/components/TripDatePicker";
import { openStopInGoogleMaps } from "@/lib/trips";
import { estimateTravelMinutes } from "@/services/routeService";
import type { AIActivityStop } from "@/services/types";
import { useAddTripContext } from "@/context/AddTripContext";
import { saveAiItinerary } from "@/src/services/trips";

export default function AddTripScreen() {
  const insets = useSafeAreaInsets();

  const {
    cityOrArea, setCityOrArea,
    radiusMiles, setRadiusMiles,
    startDate, endDate,
    datePickerVisible, setDatePickerVisible,
    handleDateConfirm,
    interestsRaw, setInterestsRaw,
    mode, setMode,
    busy, places, selectedIds,
    toggle, generate,
    finalStops,
    buildFromSelected,
    aiItinBusy, aiResolveProgress,
    aiDays, setAiDays,
    aiExtraStops,
    selectedAiDayIdx, setSelectedAiDayIdx,
    aiDayTabs,
    generateAiItinerary,
    addExtraToDay,
    exportAiRoute,
    saveFinalTrip,
    exportItineraryToGoogleMaps,
    formatDateRange,
    stopToActivity,
    GOOGLE_PLACES_API_KEY,
    placeToStop,
    interests,
  } = useAddTripContext();

  const currentAiDay = aiDays ? (aiDays[selectedAiDayIdx] ?? aiDays[0]) : null;
  const currentAiActivities = currentAiDay?.activities ?? [];
  const selectedAiTabId = aiDayTabs[selectedAiDayIdx]?.id ?? aiDayTabs[0]?.id ?? "";

  // ── AI results: drag-to-reorder ────────────────────────────────────────────
  const handleDragEnd = useCallback(
    ({ data }: { data: AIActivityStop[] }) => {
      setAiDays((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[selectedAiDayIdx] = { ...updated[selectedAiDayIdx], activities: data };
        return updated;
      });
    },
    [selectedAiDayIdx, setAiDays]
  );

  const handleRemoveFromDay = useCallback(
    (id: string) => {
      setAiDays((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[selectedAiDayIdx] = {
          ...updated[selectedAiDayIdx],
          activities: updated[selectedAiDayIdx].activities.filter((a) => a.id !== id),
        };
        return updated;
      });
    },
    [selectedAiDayIdx, setAiDays]
  );

  const handleSaveToFirebase = useCallback(async () => {
    if (!aiDays) return;
    try {
      const id = await saveAiItinerary(
        {
          cityOrArea,
          radiusMiles: Number(radiusMiles) || undefined,
          startDate,
          endDate,
          interests,
        },
        aiDays
      );
      Alert.alert("Saved!", `Itinerary saved (ID: ${id}).`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }, [aiDays, cityOrArea, radiusMiles, startDate, endDate, interests]);

  // ── AI results: render one activity row ───────────────────────────────────
  const renderAiItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<AIActivityStop>) => {
      const idx = getIndex?.() ?? 0;
      const isLast = idx === currentAiActivities.length - 1;
      const next = currentAiActivities[idx + 1];
      const travelMin = next
        ? estimateTravelMinutes(item, next, item.aiTravelMode)
        : null;
      const activity = stopToActivity(item, { labelRight: item.aiTime });

      return (
        <ScaleDecorator>
          <Pressable onLongPress={() => openStopInGoogleMaps(item)}>
            <ActivityCard
              activity={activity}
              drag={drag}
              isActive={isActive}
              onRemove={handleRemoveFromDay}
            />
          </Pressable>
          {!isLast && travelMin !== null && (
            <CommuteConnector minutes={travelMin} mode={item.aiTravelMode} />
          )}
        </ScaleDecorator>
      );
    },
    [currentAiActivities, stopToActivity, handleRemoveFromDay]
  );

  return (
    <View className="flex-1 bg-gray-50">
      {aiDays && aiDays.length > 0 ? (
        // ── AI Itinerary Results View ──────────────────────────────────────────
        <View className="flex-1">
          {/* Collapsed trip summary */}
          <View style={{ paddingTop: insets.top }}>
            <CollapsedTripHeader
              destination={cityOrArea}
              dateRange={formatDateRange(startDate, endDate)}
              onEdit={() => setAiDays(null)}
            />
          </View>

          {/* Day tabs — mirrors SheetStickyHeader style */}
          <View
            style={{
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              paddingVertical: 8,
            }}
          >
            <DayTabs
              days={aiDayTabs}
              selectedDayId={selectedAiTabId}
              onSelectDay={(id) => {
                const idx = aiDayTabs.findIndex((d) => d.id === id);
                if (idx >= 0) setSelectedAiDayIdx(idx);
              }}
            />
          </View>

          {/* Gray area with rounded top — mirrors itinerary.tsx */}
          <View className="flex-1 bg-gray-100 rounded-t-[40px] overflow-hidden">
            <DraggableFlatList
              data={currentAiActivities}
              keyExtractor={(item) => item.id}
              renderItem={renderAiItem}
              onDragEnd={handleDragEnd}
              containerStyle={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
            />
          </View>

          {/* Sticky bottom save bar */}
          <View
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-between px-6"
            style={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <TouchableOpacity onPress={exportAiRoute} activeOpacity={0.7}>
              <Text className="text-sm font-semibold text-gray-500">Export Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveToFirebase}
              activeOpacity={0.88}
              className="bg-violet-600 rounded-full px-5 py-2.5"
            >
              <Text className="text-sm font-bold text-white">Save Itinerary</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // ── Form + Place List View ─────────────────────────────────────────────
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Form card */}
          <View
            className="bg-white px-6 pb-7"
            style={{
              paddingTop: insets.top + 16,
              shadowColor: "#191C1D",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.06,
              shadowRadius: 40,
              elevation: 8,
            }}
          >
            <Text className="text-2xl font-semibold text-zinc-900 mb-6">
              Create Itinerary
            </Text>

            {/* DESTINATION */}
            <View className="mb-4">
              <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                Destination
              </Text>
              <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5 gap-2">
                <Ionicons name="location-outline" size={16} color="#6D28D9" />
                <TextInput
                  value={cityOrArea}
                  onChangeText={setCityOrArea}
                  placeholder="City, State, or Area"
                  placeholderTextColor="#A1A1AA"
                  className="flex-1 text-sm font-medium text-zinc-900"
                />
              </View>
            </View>

            {/* DATES */}
            <View className="mb-4">
              <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                Dates
              </Text>
              <Pressable
                className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5 gap-2"
                onPress={() => setDatePickerVisible(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#6D28D9" />
                <Text className={`flex-1 text-sm font-medium ${startDate ? "text-zinc-900" : "text-zinc-400"}`}>
                  {startDate ? formatDateRange(startDate, endDate) : "Select dates"}
                </Text>
              </Pressable>
            </View>

            {/* RADIUS */}
            <View className="mb-4">
              <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                Radius
              </Text>
              <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5">
                <TextInput
                  value={radiusMiles}
                  onChangeText={setRadiusMiles}
                  placeholder="mi"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="numeric"
                  className="flex-1 text-sm font-medium text-zinc-900"
                />
              </View>
            </View>

            {/* INTERESTS */}
            <View className="mb-6">
              <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                Interests
              </Text>
              <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5">
                <TextInput
                  value={interestsRaw}
                  onChangeText={setInterestsRaw}
                  placeholder="Matcha, Coffee, Run…"
                  placeholderTextColor="#A1A1AA"
                  className="flex-1 text-sm font-medium text-zinc-900"
                />
              </View>
            </View>

            {/* Action buttons */}
            <View className="border-t border-gray-200 pt-5 flex-row gap-2.5">
              <Pressable
                onPress={() => { setMode("list"); generate(); }}
                disabled={busy}
                className={`flex-1 border border-gray-400 rounded-xl py-2.5 items-center justify-center ${busy ? "opacity-50" : ""}`}
              >
                <Text className="text-sm font-bold text-neutral-600">
                  {busy ? "Loading…" : "List of places"}
                </Text>
              </Pressable>

              <Pressable
                onPress={generateAiItinerary}
                disabled={aiItinBusy}
                className={`flex-1 border border-violet-700 bg-violet-700 rounded-xl py-2.5 items-center justify-center ${aiItinBusy ? "opacity-50" : ""}`}
              >
                <Text className="text-sm font-bold text-white">
                  {aiItinBusy
                    ? aiResolveProgress
                      ? `${aiResolveProgress.done}/${aiResolveProgress.total}…`
                      : "Planning…"
                    : "Create Itinerary"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Empty state */}
          {places.length === 0 && !aiDays && (
            <View className="items-center pt-[72px] px-8">
              <Text className="text-[36px] font-extrabold text-zinc-900 text-center leading-[44px]">
                Your Journey{"\n"}Awaits
              </Text>
              <Text className="mt-4 text-lg font-medium text-neutral-600 text-center leading-7">
                Enter your preferences and we'll curate the best spots just for you.
              </Text>
            </View>
          )}

          {/* "You might also like" extras */}
          {aiExtraStops.length > 0 && aiDays && (
            <View className="mt-4">
              <View className="px-4 pb-1.5">
                <Text className="text-base font-extrabold">You might also like</Text>
                <Text className="text-gray-500 text-[13px] mt-0.5">Tap + to add to Day 1</Text>
              </View>
              {aiExtraStops.map((stop) => (
                <View key={stop.id} className="relative">
                  <Pressable
                    onPress={() => addExtraToDay(stop, 0)}
                    className="absolute right-3.5 top-2.5 z-20"
                  >
                    <Ionicons name="add-circle" size={28} color="#7C3AED" />
                  </Pressable>
                  <ActivityCard activity={stopToActivity(stop, {})} />
                </View>
              ))}
            </View>
          )}

          {/* Places list */}
          {places.length > 0 && GOOGLE_PLACES_API_KEY && (
            <View className="mt-3.5">
              <View className="px-4 pb-1.5">
                <Text className="text-lg font-extrabold">Places (tap to select)</Text>
              </View>

              {places.map((p) => {
                const stop = placeToStop(GOOGLE_PLACES_API_KEY, p);
                const activity = stopToActivity(stop, {});

                return (
                  <View key={p.id} className="relative">
                    <View
                      className={`absolute left-3.5 top-2.5 z-20 w-[22px] h-[22px] rounded-full items-center justify-center ${
                        selectedIds[p.id] ? "bg-green-600" : "bg-black/[0.08]"
                      }`}
                    >
                      <Ionicons
                        name={selectedIds[p.id] ? "checkmark" : "ellipse-outline"}
                        size={14}
                        color={selectedIds[p.id] ? "white" : "#6B7280"}
                      />
                    </View>
                    <Pressable onPress={() => toggle(p.id)}>
                      <ActivityCard activity={activity} />
                    </Pressable>
                  </View>
                );
              })}

              {mode === "list" && (
                <View className="px-4 pt-2">
                  <TouchableOpacity
                    onPress={buildFromSelected}
                    activeOpacity={0.85}
                    className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl py-4 bg-white"
                  >
                    <Ionicons name="shuffle" size={18} color="#6B7280" />
                    <Text className="text-gray-500 font-bold ml-1.5">
                      Build itinerary from selected
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Optimized itinerary */}
          {finalStops && finalStops.length > 0 && (
            <View className="mt-4">
              <View className="px-4 pb-1.5">
                <Text className="text-lg font-extrabold">Itinerary</Text>
              </View>

              {finalStops.map((s, idx) => {
                const activity = stopToActivity(s, { labelRight: `Stop ${idx + 1}` });
                return (
                  <View key={`flow-${s.id}`}>
                    <Pressable onPress={() => openStopInGoogleMaps(s)}>
                      <ActivityCard activity={activity} />
                    </Pressable>
                    {idx < finalStops.length - 1 ? (
                      <Text className="text-center text-gray-400 mb-1.5">↓</Text>
                    ) : null}
                  </View>
                );
              })}

              <View className="px-4 pt-2.5 flex-row gap-2.5">
                <TouchableOpacity
                  onPress={saveFinalTrip}
                  activeOpacity={0.85}
                  className="flex-1 bg-gray-900 rounded-2xl py-3.5 flex-row items-center justify-center"
                >
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text className="text-white font-extrabold ml-1.5">Save Trip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={exportItineraryToGoogleMaps}
                  activeOpacity={0.85}
                  className="flex-1 bg-blue-600 rounded-2xl py-3.5 flex-row items-center justify-center"
                >
                  <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
                  <Text className="text-white font-extrabold ml-1.5">Export Route</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TripDatePicker
            visible={datePickerVisible}
            initialDeparture={startDate ? new Date(startDate + "T00:00:00") : undefined}
            initialReturn={endDate ? new Date(endDate + "T00:00:00") : undefined}
            onCancel={() => setDatePickerVisible(false)}
            onConfirm={handleDateConfirm}
          />
        </ScrollView>
      )}
    </View>
  );
}
