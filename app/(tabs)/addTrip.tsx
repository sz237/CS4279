import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
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
import { TripForm } from "@/components/addTrip/TripForm";
import { PlaceListCard } from "@/components/addTrip/PlaceListCard";
import { PlanningOverlay } from "@/components/addTrip/PlanningOverlay";
import { TripDatePicker } from "@/components/TripDatePicker";
import { openStopInGoogleMaps } from "@/lib/trips";
import { estimateTravelMinutes } from "@/services/routeService";
import type { AIActivityStop } from "@/services/types";
import { useAddTripContext } from "@/context/AddTripContext";
import { saveAiItinerary } from "@/src/services/trips";

export default function AddTripScreen() {
  const insets = useSafeAreaInsets();
  const [formExpanded, setFormExpanded] = useState(false);

  const {
    cityOrArea, setCityOrArea,
    radiusMiles, setRadiusMiles,
    startDate, endDate,
    datePickerVisible, setDatePickerVisible,
    handleDateConfirm,
    interestsRaw, setInterestsRaw,
    busy, places, selectedIds,
    toggle, generate,
    exportSelectedRoute, saveSelectedTrip,
    aiItinBusy, aiResolveProgress,
    aiDays, setAiDays,
    aiExtraStops,
    selectedAiDayIdx, setSelectedAiDayIdx,
    aiDayTabs,
    generateAiItinerary,
    addExtraToDay,
    exportAiRoute,
    formatDateRange,
    stopToActivity,
    GOOGLE_PLACES_API_KEY,
    interests,
  } = useAddTripContext();

  const currentAiDay = aiDays ? (aiDays[selectedAiDayIdx] ?? aiDays[0]) : null;
  const currentAiActivities = currentAiDay?.activities ?? [];
  const selectedAiTabId = aiDayTabs[selectedAiDayIdx]?.id ?? aiDayTabs[0]?.id ?? "";

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
        { cityOrArea, radiusMiles: Number(radiusMiles) || undefined, startDate, endDate, interests },
        aiDays
      );
      Alert.alert("Saved!", `Itinerary saved (ID: ${id}).`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }, [aiDays, cityOrArea, radiusMiles, startDate, endDate, interests]);

  const renderAiItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<AIActivityStop>) => {
      const idx = getIndex?.() ?? 0;
      const isLast = idx === currentAiActivities.length - 1;
      const next = currentAiActivities[idx + 1];
      const travelMin = next ? estimateTravelMinutes(item, next, item.aiTravelMode) : null;
      const activity = stopToActivity(item, { labelRight: item.aiTime });

      return (
        <ScaleDecorator>
          <Pressable onLongPress={() => openStopInGoogleMaps(item)}>
            <ActivityCard activity={activity} drag={drag} isActive={isActive} onRemove={handleRemoveFromDay} />
          </Pressable>
          {!isLast && travelMin !== null && (
            <CommuteConnector minutes={travelMin} mode={item.aiTravelMode} />
          )}
        </ScaleDecorator>
      );
    },
    [currentAiActivities, stopToActivity, handleRemoveFromDay]
  );

  const tripFormProps = {
    cityOrArea, setCityOrArea,
    radiusMiles, setRadiusMiles,
    startDate, endDate,
    onOpenDatePicker: () => setDatePickerVisible(true),
    interestsRaw, setInterestsRaw,
    formatDateRange,
    onListPress: () => { setFormExpanded(false); generate(); },
    onAiPress: generateAiItinerary,
    listBusy: busy,
    aiBusy: aiItinBusy,
  };

  return (
    <View className="flex-1 bg-gray-50">

      {/* ── AI Itinerary Results View ──────────────────────────────────────── */}
      {aiDays && aiDays.length > 0 ? (
        <View className="flex-1">
          <View style={{ paddingTop: insets.top }}>
            <CollapsedTripHeader
              destination={cityOrArea}
              dateRange={formatDateRange(startDate, endDate)}
              onEdit={() => setAiDays(null)}
            />
          </View>

          <View style={{ backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 8 }}>
            <DayTabs
              days={aiDayTabs}
              selectedDayId={selectedAiTabId}
              onSelectDay={(id) => {
                const idx = aiDayTabs.findIndex((d) => d.id === id);
                if (idx >= 0) setSelectedAiDayIdx(idx);
              }}
            />
          </View>

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

          {aiExtraStops.length > 0 && (
            <View className="px-4 pb-2 pt-3">
              <Text className="text-base font-extrabold mb-1">You might also like</Text>
              <Text className="text-gray-500 text-[13px] mb-2">Tap + to add to Day 1</Text>
              {aiExtraStops.map((stop) => (
                <View key={stop.id} className="relative">
                  <Pressable onPress={() => addExtraToDay(stop, 0)} className="absolute right-3.5 top-2.5 z-20">
                    <Ionicons name="add-circle" size={28} color="#7C3AED" />
                  </Pressable>
                  <ActivityCard activity={stopToActivity(stop, {})} />
                </View>
              ))}
            </View>
          )}

          <View
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-between px-6"
            style={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <TouchableOpacity onPress={exportAiRoute} activeOpacity={0.7}>
              <Text className="text-sm font-semibold text-gray-500">Export Route</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveToFirebase} activeOpacity={0.88} className="bg-violet-600 rounded-full px-5 py-2.5">
              <Text className="text-sm font-bold text-white">Save Itinerary</Text>
            </TouchableOpacity>
          </View>
        </View>

      /* ── Places List View ─────────────────────────────────────────────── */
      ) : places.length > 0 ? (
        <View className="flex-1">
          <View style={{ paddingTop: insets.top }}>
            <CollapsedTripHeader
              destination={cityOrArea}
              dateRange={formatDateRange(startDate, endDate)}
              onEdit={() => setFormExpanded((v) => !v)}
            />
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {formExpanded && <TripForm {...tripFormProps} />}

            <View className="px-6 pt-5 pb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-zinc-900 uppercase tracking-widest">
                Curated Places
              </Text>
              <Text className="text-sm font-medium text-neutral-600">
                {places.length} spots found
              </Text>
            </View>

            <View className="px-6">
              {GOOGLE_PLACES_API_KEY && places.map((p) => (
                <PlaceListCard
                  key={p.id}
                  place={p}
                  apiKey={GOOGLE_PLACES_API_KEY}
                  selected={!!selectedIds[p.id]}
                  onToggle={() => toggle(p.id)}
                />
              ))}
            </View>
          </ScrollView>

          <View
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-between px-6"
            style={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <TouchableOpacity onPress={exportSelectedRoute} activeOpacity={0.7}>
              <Text className="text-sm font-semibold text-gray-500">Export Route</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveSelectedTrip} activeOpacity={0.88} className="bg-violet-600 rounded-full px-5 py-2.5">
              <Text className="text-sm font-bold text-white">Save Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

      ) : (
        /* ── Initial Form View ──────────────────────────────────────────── */
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: insets.top + 16 }}>
            <TripForm {...tripFormProps} showTitle />
          </View>

          <View className="items-center pt-[72px] px-8">
            <Text className="text-[36px] font-extrabold text-zinc-900 text-center leading-[44px]">
              Your Journey{"\n"}Awaits
            </Text>
            <Text className="mt-4 text-lg font-medium text-neutral-600 text-center leading-7">
              Enter your preferences and we'll curate the best spots just for you.
            </Text>
          </View>
        </ScrollView>
      )}

      <TripDatePicker
        visible={datePickerVisible}
        initialDeparture={startDate ? new Date(startDate + "T00:00:00") : undefined}
        initialReturn={endDate ? new Date(endDate + "T00:00:00") : undefined}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={handleDateConfirm}
      />

      {(busy || aiItinBusy) && <PlanningOverlay progress={aiResolveProgress} />}
    </View>
  );
}
