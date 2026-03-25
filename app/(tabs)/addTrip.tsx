import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CollapsedTripHeader } from "@/components/addTrip/CollapsedTripHeader";
import { PlaceListCard } from "@/components/addTrip/PlaceListCard";
import { PlanningOverlay } from "@/components/addTrip/PlanningOverlay";
import { TripForm } from "@/components/addTrip/TripForm";
import ActivityCard from "@/components/itinerary/ActivityCard";
import { CommuteConnector } from "@/components/itinerary/CommuteConnector";
import DayTabs from "@/components/itinerary/DayTabs";
import { TripDatePicker } from "@/components/TripDatePicker";
import { useAddTripContext } from "@/context/AddTripContext";
import type { TripStop } from "@/lib/trips";
import { openStopInGoogleMaps } from "@/lib/trips";
import { estimateTravelMinutes } from "@/services/routeService";
import type { AIActivityStop } from "@/services/types";
import { saveAiItinerary } from "@/src/services/trips";

type FlatItem =
  | { kind: "header"; slot: string; label: string }
  | { kind: "activity"; stop: AIActivityStop };

const AI_SLOTS = [
  { slot: "morning",   label: "Morning"   },
  { slot: "noon",      label: "Noon"      },
  { slot: "afternoon", label: "Afternoon" },
  { slot: "evening",   label: "Evening"   },
];

export default function AddTripScreen() {
  const insets = useSafeAreaInsets();
  const [formExpanded, setFormExpanded] = useState(false);
  const [pendingExtraStop, setPendingExtraStop] = useState<TripStop | null>(null);

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
    resetForm,
    formatDateRange,
    stopToActivity,
    GOOGLE_PLACES_API_KEY,
    interests,
  } = useAddTripContext();

  const currentAiDay = aiDays ? (aiDays[selectedAiDayIdx] ?? aiDays[0]) : null;
  const currentAiActivities = currentAiDay?.activities ?? [];
  const selectedAiTabId = aiDayTabs[selectedAiDayIdx]?.id ?? aiDayTabs[0]?.id ?? "";

  // Build flat list: fixed section headers + activities grouped under their slot
  const flatData = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const { slot, label } of AI_SLOTS) {
      items.push({ kind: "header", slot, label });
      for (const stop of currentAiActivities) {
        if ((stop.aiTime?.toLowerCase() ?? "") === slot) {
          items.push({ kind: "activity", stop });
        }
      }
    }
    // Activities with an unrecognised time fall under the last section
    const knownSlots = new Set(AI_SLOTS.map((s) => s.slot));
    for (const stop of currentAiActivities) {
      if (!knownSlots.has(stop.aiTime?.toLowerCase() ?? "")) {
        items.push({ kind: "activity", stop });
      }
    }
    return items;
  }, [currentAiActivities]);

  const handleDragEnd = useCallback(
    ({ data }: { data: FlatItem[] }) => {
      // Walk the reordered flat list; each activity inherits the slot of the
      // last header seen above it
      let currentSlot = AI_SLOTS[0].slot;
      const newActivities: AIActivityStop[] = [];
      for (const item of data) {
        if (item.kind === "header") {
          currentSlot = item.slot;
        } else {
          newActivities.push({ ...item.stop, aiTime: currentSlot });
        }
      }
      setAiDays((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[selectedAiDayIdx] = { ...updated[selectedAiDayIdx], activities: newActivities };
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
      await saveAiItinerary(
        { cityOrArea, radiusMiles: Number(radiusMiles) || undefined, startDate, endDate, interests },
        aiDays
      );
      resetForm();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }, [aiDays, cityOrArea, radiusMiles, startDate, endDate, interests, resetForm]);

  const renderFlatItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<FlatItem>) => {
      if (item.kind === "header") {
        return (
          <View className="px-5 pt-5 pb-1 flex-row items-center gap-3">
            <Text className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              {item.label}
            </Text>
            <View className="flex-1 h-px bg-zinc-200" />
          </View>
        );
      }

      // Find the next activity item in flatData for the commute connector
      const idx = getIndex?.() ?? 0;
      const nextActivityItem = flatData.slice(idx + 1).find((i) => i.kind === "activity");
      const travelMin =
        nextActivityItem && nextActivityItem.kind === "activity"
          ? estimateTravelMinutes(item.stop, nextActivityItem.stop, item.stop.aiTravelMode)
          : null;
      const isLastActivity =
        flatData.slice(idx + 1).every((i) => i.kind === "header");

      return (
        <ScaleDecorator>
          <Pressable onLongPress={() => openStopInGoogleMaps(item.stop)}>
            <ActivityCard
              activity={stopToActivity(item.stop, {})}
              drag={drag}
              isActive={isActive}
              onRemove={handleRemoveFromDay}
            />
          </Pressable>
          {!isLastActivity && travelMin !== null && (
            <CommuteConnector minutes={travelMin} mode={item.stop.aiTravelMode} />
          )}
        </ScaleDecorator>
      );
    },
    [flatData, stopToActivity, handleRemoveFromDay]
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
              data={flatData}
              keyExtractor={(item) => item.kind === "header" ? `header-${item.slot}` : item.stop.id}
              renderItem={renderFlatItem}
              onDragEnd={handleDragEnd}
              containerStyle={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
              ListFooterComponent={
                aiExtraStops.length > 0 ? (
                  <View className="px-4 pb-2 pt-3">
                    <Text className="text-base font-extrabold mb-1">You might also like</Text>
                    <Text className="text-gray-500 text-[13px] mb-2">Tap + to add to Day</Text>
                    {aiExtraStops.map((stop) => (
                      <View key={stop.id} className="relative">
                        <Pressable onPress={() => setPendingExtraStop(stop)} className="absolute right-3.5 top-2.5 z-20">
                          <Ionicons name="add-circle" size={28} color="#7C3AED" />
                        </Pressable>
                        <ActivityCard activity={stopToActivity(stop, {})} />
                      </View>
                    ))}
                  </View>
                ) : null
              }
            />
          </View>

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
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: insets.top + 16 }}>
            <TripForm {...tripFormProps} showTitle />
          </View>

          <View className="items-center pt-[28px] px-8">
            <Text className="text-[36px] font-extrabold text-zinc-900 text-center leading-[44px]">
              Your Journey{"\n"}Awaits
            </Text>
            <Text className="mt-4 text-lg font-medium text-neutral-600 text-center leading-7">
              Enter your preferences and we'll curate the best spots just for you.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Time-of-day picker for "You might also like" ── */}
      <Modal
        visible={pendingExtraStop !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingExtraStop(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setPendingExtraStop(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
              {/* Handle */}
              <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />

              <Text className="text-lg font-bold text-zinc-900 mb-1">
                When does this fit best?
              </Text>
              <Text className="text-sm text-gray-400 mb-5">
                {pendingExtraStop?.name}
              </Text>

              {[
                { label: "Morning",   value: "morning",   icon: "sunny-outline" },
                { label: "Noon",      value: "noon",      icon: "partly-sunny-outline" },
                { label: "Afternoon", value: "afternoon", icon: "cloud-outline" },
                { label: "Evening",   value: "evening",   icon: "moon-outline" },
              ].map(({ label, value, icon }) => (
                <TouchableOpacity
                  key={value}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (pendingExtraStop) {
                      addExtraToDay(pendingExtraStop, selectedAiDayIdx, value);
                      setPendingExtraStop(null);
                    }
                  }}
                  className="flex-row items-center gap-4 py-3.5 border-b border-gray-100"
                >
                  <View className="w-9 h-9 rounded-full bg-violet-50 items-center justify-center">
                    <Ionicons name={icon as any} size={18} color="#7C3AED" />
                  </View>
                  <Text className="flex-1 text-base font-semibold text-zinc-900">{label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setPendingExtraStop(null)}
                activeOpacity={0.7}
                className="mt-4 py-3 items-center"
              >
                <Text className="text-sm font-semibold text-gray-400">Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
