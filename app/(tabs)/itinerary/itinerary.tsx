import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import AddActivityModal, { ManualStopInput, ActivityPrefill } from "@/components/itinerary/AddActivityModal";
import { CommuteConnector, TravelMode } from "@/components/itinerary/CommuteConnector";
import {
  EditableItineraryList,
  FlatItem,
  SLOTS,
  TimeSlotSectionHeader,
} from "@/components/itinerary/EditableItineraryList";
import { Day } from "@/components/itinerary/DayTabs";
import SheetStickyHeader from "@/components/itinerary/SheetStickyHeader";
import { useItinerarySheet } from "@/lib/ItinerarySheetContext";
import { useTrips } from "@/context/TripsContext";
import { useStops } from "@/hooks/useStops";
import type { StopModel } from "@/src/models";
import {
  saveStop,
  deleteStop,
  updateStop,
  persistTravelForDay,
} from "@/src/services/trips";
import { searchText } from "@/src/googlePlaces";
import { haversineKm } from "@/services/routeService";
import { collection, doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/src/config/firebase";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey as string;
const KNOWN_SLOTS = new Set<string>(SLOTS.map((s) => s.slot));

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

/**
 * Convert stops to Activities. When Firestore hasn't stored travel data yet,
 * estimate it client-side using Haversine so connectors always render.
 */
function enrichActivities(stops: StopModel[]): Activity[] {
  return stops.map((stop, i) => {
    // Always recompute travel from coordinates so display-order connectors are accurate.
    // Firestore-stored travelMode/travelMinutes may have been written for a different
    // stop ordering and would show wrong values.
    let travelMode: TravelMode | undefined;
    let travelMinutes: number | undefined;

    if (i < stops.length - 1) {
      const next = stops[i + 1];
      if (stop.lat !== 0 && stop.lng !== 0 && next.lat !== 0 && next.lng !== 0) {
        const dist = haversineKm(
          { lat: stop.lat, lng: stop.lng },
          { lat: next.lat, lng: next.lng }
        );
        // < 1.5 km → walk (~18 min max); anything further → drive.
        // Road distance is ~25% longer than straight-line, so we inflate slightly.
        travelMode = dist < 1.5 ? "walk" : "drive";
        const speed = travelMode === "walk" ? 5 : 40;
        const roadDist = dist * (travelMode === "drive" ? 1.25 : 1.0);
        travelMinutes = Math.max(1, Math.round((roadDist / speed) * 60));
      }
    }

    return {
      id: stop.id,
      title: stop.name,
      description: stop.address,
      time: stop.timeLabel ?? "",
      duration: stop.duration ?? "",
      imageUrl: stop.photoUrl ?? undefined,
      travelMode,
      travelMinutes,
    };
  });
}

async function geocode(name: string, address: string): Promise<{ lat: number; lng: number }> {
  // Try name+address first; fall back to address-only so custom names like
  // "MyPlace" don't poison the query and prevent geocoding a real address.
  const candidates = [
    `${name} ${address}`.trim(),
    address.trim(),
  ].filter(Boolean);

  for (const query of candidates) {
    try {
      const result = await searchText({ apiKey: GOOGLE_API_KEY, textQuery: query, maxResultCount: 1 });
      const loc = result.places?.[0]?.location;
      if (loc) return { lat: loc.latitude, lng: loc.longitude };
    } catch {
      // try next candidate
    }
  }
  return { lat: 0, lng: 0 };
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

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ItineraryTab() {
  const { setMapDay, setPreviewStops } = useItinerarySheet();
  const { trips, selectedTripId } = useTrips();
  const trip = trips.find((t) => t.id === selectedTripId) ?? null;
  const { stops } = useStops(selectedTripId);

  // Navigation params from search tab "Add to Itinerary" flow
  const searchParams = useLocalSearchParams<{
    _t?: string;
    day?: string;
    prefillName?: string;
    prefillAddress?: string;
    prefillPlaceId?: string;
    prefillLat?: string;
    prefillLng?: string;
    prefillRating?: string;
    prefillUserRatingCount?: string;
    prefillPhotoUrl?: string;
    prefillTypes?: string;
  }>();

  const days: Day[] = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    return generateDayTabs(trip.startDate, trip.endDate);
  }, [trip?.startDate, trip?.endDate]);

  const [selectedDayId, setSelectedDayId] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pendingAddSlot, setPendingAddSlot] = useState<string | undefined>(undefined);

  // Prefill data for direct-add modal triggered by search tab navigation
  const [directAddPrefill, setDirectAddPrefill] = useState<(ActivityPrefill & {
    day: string;
    photoUrl?: string;
    types?: string[];
  }) | null>(null);

  // Local edit state — populated on entering edit mode, null when in view mode.
  // All mutations during edit session update this state only; nothing is written
  // to Firestore until the user taps Done.
  const [editActivities, setEditActivities] = useState<Activity[] | null>(null);
  // Full StopModel data for activities added during the edit session (not yet persisted).
  const [pendingNewStops, setPendingNewStops] = useState<StopModel[]>([]);

  useEffect(() => {
    if (days.length > 0 && !days.find((d) => d.id === selectedDayId)) {
      setSelectedDayId(days[0].id);
    }
  }, [days]);

  // Handle incoming prefill params from search tab "Add to Itinerary" → day picker flow.
  // Use _t (timestamp) as a unique key so each new navigation fires the effect exactly once.
  const lastPrefillTimestampRef = useRef<string | null>(null);
  useEffect(() => {
    const { _t, day, prefillName, prefillAddress, prefillPlaceId, prefillLat, prefillLng,
            prefillRating, prefillUserRatingCount, prefillPhotoUrl, prefillTypes } = searchParams;
    if (!_t || !prefillName || !day || _t === lastPrefillTimestampRef.current) return;
    lastPrefillTimestampRef.current = _t;

    setSelectedDayId(day);
    setDirectAddPrefill({
      name: prefillName,
      address: prefillAddress || "",
      placeId: prefillPlaceId || undefined,
      lat: prefillLat ? parseFloat(prefillLat) : undefined,
      lng: prefillLng ? parseFloat(prefillLng) : undefined,
      rating: prefillRating ? parseFloat(prefillRating) : undefined,
      userRatingCount: prefillUserRatingCount ? parseInt(prefillUserRatingCount, 10) : undefined,
      photoUrl: prefillPhotoUrl || undefined,
      types: prefillTypes ? prefillTypes.split(",").filter(Boolean) : undefined,
      day,
    });
    setAddModalVisible(true);
  }, [searchParams._t, searchParams.prefillName, searchParams.day]);

  useEffect(() => {
    if (selectedDayId) setMapDay(selectedDayId);
  }, [selectedDayId, setMapDay]);

  // Backfill geocoding for stops that were saved without coordinates.
  // Runs whenever the visible stops change; skips stops that already have coords.
  useEffect(() => {
    if (!selectedTripId) return;
    const needsGeocode = stops.filter(
      (s) => s.lat === 0 && s.lng === 0 && (s.name || s.address)
    );
    if (needsGeocode.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const stop of needsGeocode) {
        if (cancelled) break;
        const { lat, lng } = await geocode(stop.name, stop.address);
        if (!cancelled && (lat !== 0 || lng !== 0)) {
          await updateStop(selectedTripId, stop.id, { lat, lng });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTripId, stops]);

  const stopsForDay = useMemo(
    () =>
      stops
        .filter((s) => s.day === selectedDayId)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [stops, selectedDayId]
  );

  // Committed (Firestore-backed) activities with estimated travel filled in.
  const activities: Activity[] = useMemo(
    () => enrichActivities(stopsForDay),
    [stopsForDay]
  );

  // Center of the current day's stops — used to bias Places search in the modal.
  const routeCenter = useMemo(() => {
    const located = stopsForDay.filter((s) => s.lat !== 0 && s.lng !== 0);
    if (located.length === 0) return undefined;
    return {
      lat: located.reduce((sum, s) => sum + s.lat, 0) / located.length,
      lng: located.reduce((sum, s) => sum + s.lng, 0) / located.length,
    };
  }, [stopsForDay]);

  // Push a live-reordered stop list to the map whenever editActivities changes.
  // This lets the map reflect drag reorders in real time without Firestore writes.
  useEffect(() => {
    if (!editActivities) {
      setPreviewStops(null);
      return;
    }
    const stopById = new Map(stopsForDay.map((s) => [s.id, s]));
    const preview: StopModel[] = editActivities
      .map((a, idx) => {
        const orig = stopById.get(a.id);
        if (orig) return { ...orig, orderIndex: idx };
        // Newly added stop — find it in pendingNewStops
        const pending = pendingNewStops.find((s) => s.id === a.id);
        return pending ? { ...pending, orderIndex: idx } : null;
      })
      .filter((s): s is StopModel => s !== null);
    setPreviewStops(preview);
  }, [editActivities, stopsForDay, pendingNewStops]);

  // ─── Edit mode entry / exit ──────────────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    setEditActivities([...activities]);
    setPendingNewStops([]);
    setIsEditMode(true);
  }, [activities]);

  const cancelEditMode = useCallback(() => {
    setEditActivities(null);
    setPendingNewStops([]);
    setPreviewStops(null);
    setIsEditMode(false);
  }, [setPreviewStops]);

  // Commit all buffered changes to Firestore when the user taps Done.
  const handleDone = useCallback(async () => {
    if (!selectedTripId || !editActivities) return;

    const originalById = new Map(stopsForDay.map((s) => [s.id, s]));
    const editIds = new Set(editActivities.map((a) => a.id));

    // 1. Delete stops that were removed during editing
    await Promise.all(
      stopsForDay
        .filter((s) => !editIds.has(s.id))
        .map((s) => deleteStop(selectedTripId, s.id))
    );

    // 2. Save new stops that were added during editing (with final orderIndex)
    await Promise.all(
      pendingNewStops
        .filter((s) => editIds.has(s.id))
        .map((s) => {
          const idx = editActivities.findIndex((a) => a.id === s.id);
          return saveStop(selectedTripId, {
            ...s,
            orderIndex: idx,
            timeLabel: editActivities[idx]?.time || null,
          });
        })
    );

    // 3. Update orderIndex and timeLabel for all existing stops
    await Promise.all(
      editActivities
        .filter((a) => originalById.has(a.id))
        .map((a, _) => {
          const idx = editActivities.findIndex((ea) => ea.id === a.id);
          return updateStop(selectedTripId, a.id, {
            orderIndex: idx,
            timeLabel: a.time || null,
          });
        })
    );

    // 4. Recompute and persist travel for the final ordered stops
    const finalStops: StopModel[] = editActivities
      .map((a, idx) => {
        const orig = originalById.get(a.id);
        if (orig) return { ...orig, orderIndex: idx, timeLabel: a.time || null };
        const pending = pendingNewStops.find((s) => s.id === a.id);
        if (pending) return { ...pending, orderIndex: idx, timeLabel: a.time || null };
        return null;
      })
      .filter((s): s is StopModel => s !== null);

    await persistTravelForDay(selectedTripId, finalStops);

    setEditActivities(null);
    setPendingNewStops([]);
    setPreviewStops(null);
    setIsEditMode(false);
  }, [selectedTripId, editActivities, stopsForDay, pendingNewStops, setPreviewStops]);

  // ─── Edit-mode local mutation handlers (no Firestore writes) ─────────────────

  const handleEditReorder = useCallback((newOrder: Activity[]) => {
    setEditActivities(newOrder);
  }, []);

  const handleEditRemove = useCallback((id: string) => {
    setEditActivities((prev) => prev?.filter((a) => a.id !== id) ?? null);
    setPendingNewStops((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleEditTimeChange = useCallback((id: string, newTime: string) => {
    setEditActivities((prev) =>
      prev?.map((a) => (a.id === id ? { ...a, time: newTime } : a)) ?? null
    );
  }, []);

  const handleEditAddActivity = useCallback(
    async (input: ManualStopInput) => {
      if (!selectedTripId) return;

      let lat = input.lat ?? 0;
      let lng = input.lng ?? 0;
      if (!input.lat || !input.lng) {
        const coords = await geocode(input.name, input.address);
        lat = coords.lat;
        lng = coords.lng;
      }

      const id = doc(collection(db, "itineraries", selectedTripId, "stops")).id;

      const newStop: StopModel = {
        id,
        orderIndex: (editActivities?.length ?? 0),
        day: selectedDayId,
        timeLabel: (input.timeLabel || "").toLowerCase() || null,
        duration: input.duration || null,
        placeId: input.placeId ?? "",
        name: input.name,
        address: input.address,
        photoUrl: null,
        lat,
        lng,
        rating: input.rating ?? null,
        userRatingCount: input.userRatingCount ?? null,
        types: [],
        briefSummary: null,
        travelMode: null,
        travelMinutes: null,
        category: null,
      };

      const newActivity: Activity = {
        id,
        title: input.name,
        description: input.address,
        time: input.timeLabel || "",
        duration: input.duration || "",
        travelMode: undefined,
        travelMinutes: undefined,
      };

      setPendingNewStops((prev) => [...prev, newStop]);
      setEditActivities((prev) => {
        if (!prev) return [newActivity];
        const slotKey = (input.timeLabel || "").toLowerCase();
        const SLOT_ORDER = SLOTS.map((s) => s.slot);

        if (!slotKey || !KNOWN_SLOTS.has(slotKey)) {
          return [...prev, newActivity];
        }

        // Insert after the last existing activity in the same slot
        let insertAt = -1;
        for (let i = 0; i < prev.length; i++) {
          if ((prev[i].time?.toLowerCase() ?? "") === slotKey) insertAt = i;
        }
        if (insertAt !== -1) {
          const updated = [...prev];
          updated.splice(insertAt + 1, 0, newActivity);
          return updated;
        }

        // Slot is empty — insert after the last activity in any earlier slot
        const targetOrder = SLOT_ORDER.indexOf(slotKey as typeof SLOT_ORDER[number]);
        for (let i = prev.length - 1; i >= 0; i--) {
          const actSlot = prev[i].time?.toLowerCase() ?? "";
          const actOrder = SLOT_ORDER.indexOf(actSlot as typeof SLOT_ORDER[number]);
          if (actOrder !== -1 && actOrder < targetOrder) {
            const updated = [...prev];
            updated.splice(i + 1, 0, newActivity);
            return updated;
          }
        }

        // No earlier slot found — prepend
        return [newActivity, ...prev];
      });
      setAddModalVisible(false);
    },
    [selectedTripId, selectedDayId, editActivities]
  );

  // ─── Direct-add handler (from search tab navigation) ─────────────────────────

  const handleDirectAdd = useCallback(
    async (input: ManualStopInput) => {
      if (!selectedTripId || !directAddPrefill) return;

      let lat = input.lat ?? directAddPrefill.lat ?? 0;
      let lng = input.lng ?? directAddPrefill.lng ?? 0;
      if (lat === 0 && lng === 0) {
        const coords = await geocode(input.name, input.address);
        lat = coords.lat;
        lng = coords.lng;
      }

      const id = doc(collection(db, "itineraries", selectedTripId, "stops")).id;
      const dayStops = stops
        .filter((s) => s.day === directAddPrefill.day)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const newStop: StopModel = {
        id,
        orderIndex: dayStops.length,
        day: directAddPrefill.day,
        timeLabel: (input.timeLabel || "").toLowerCase() || null,
        duration: input.duration || null,
        placeId: input.placeId ?? directAddPrefill.placeId ?? "",
        name: input.name,
        address: input.address,
        photoUrl: directAddPrefill.photoUrl ?? null,
        lat,
        lng,
        rating: input.rating ?? directAddPrefill.rating ?? null,
        userRatingCount: input.userRatingCount ?? directAddPrefill.userRatingCount ?? null,
        types: directAddPrefill.types ?? [],
        briefSummary: null,
        travelMode: null,
        travelMinutes: null,
        category: null,
      };

      await saveStop(selectedTripId, newStop);

      // Increment stopCount on the itinerary
      await updateDoc(doc(db, "itineraries", selectedTripId), {
        stopCount: increment(1),
        updatedAt: new Date().toISOString(),
      });

      // Recompute travel for the day
      await persistTravelForDay(selectedTripId, [...dayStops, newStop]);

      setAddModalVisible(false);
      setDirectAddPrefill(null);
    },
    [selectedTripId, directAddPrefill, stops]
  );

  // ─── View-mode flat data ─────────────────────────────────────────────────────

  const viewFlatData: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];

    for (const { slot, label } of SLOTS) {
      const slotActivities = activities.filter(
        (a) => (a.time?.toLowerCase() ?? "") === slot
      );
      if (slotActivities.length === 0) continue;
      items.push({ kind: "header", slot, label, prevSlot: null });
      for (const activity of slotActivities) {
        items.push({ kind: "activity", activity });
      }
    }

    for (const activity of activities) {
      if (!KNOWN_SLOTS.has(activity.time?.toLowerCase() ?? "")) {
        items.push({ kind: "activity", activity });
      }
    }

    return items;
  }, [activities]);

  const renderViewItem = useCallback(
    ({ item, index }: { item: FlatItem; index: number }) => {
      if (item.kind === "header") {
        return <TimeSlotSectionHeader label={item.label} />;
      }

      const { activity } = item;
      const isLastActivity = viewFlatData.slice(index + 1).every((i) => i.kind !== "activity");

      return (
        <View className="mb-2">
          <ActivityCard activity={activity} />
          {!isLastActivity && (
            <CommuteConnector
              minutes={activity.travelMinutes}
              mode={activity.travelMode as TravelMode | undefined}
            />
          )}
        </View>
      );
    },
    [viewFlatData]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

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
            <View className="flex-row items-center justify-between px-5 pt-4 pb-2 bg-gray-100">
              <TouchableOpacity
                onPress={cancelEditMode}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-sm font-semibold text-zinc-500">Cancel</Text>
              </TouchableOpacity>

              <Text className="text-base font-bold text-zinc-900">Edit Mode</Text>

              <TouchableOpacity
                onPress={handleDone}
                activeOpacity={0.8}
                className="bg-violet-600 rounded-full px-4 py-1.5"
              >
                <Text className="text-sm font-bold text-white">Done</Text>
              </TouchableOpacity>
            </View>

            <EditableItineraryList
              activities={editActivities ?? activities}
              onAddActivity={(slot) => {
                setPendingAddSlot(slot);
                setAddModalVisible(true);
              }}
              onRemove={handleEditRemove}
              onReorder={handleEditReorder}
              onTimeChange={handleEditTimeChange}
            />
          </>
        ) : (
          <>
            <View className="flex-row justify-end items-center px-6 pt-5 pb-1">
              <TouchableOpacity
                className="flex-row items-center gap-1.5"
                activeOpacity={0.7}
                onPress={enterEditMode}
              >
                <Text className="text-sm font-bold text-zinc-900">Edit</Text>
                <Ionicons name="pencil-outline" size={14} color="#525252" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={viewFlatData}
              keyExtractor={(item, index) =>
                item.kind === "header"
                  ? `header-${item.slot}`
                  : item.activity.id ?? String(index)
              }
              renderItem={renderViewItem}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
              ListEmptyComponent={<EmptyState />}
            />
          </>
        )}
      </View>

      <AddActivityModal
        visible={addModalVisible}
        onClose={() => {
          setAddModalVisible(false);
          setPendingAddSlot(undefined);
          setDirectAddPrefill(null);
        }}
        onAdd={directAddPrefill ? handleDirectAdd : handleEditAddActivity}
        defaultTimeLabel={pendingAddSlot}
        locationBias={routeCenter}
        prefill={directAddPrefill ?? undefined}
      />
    </View>
  );
}
