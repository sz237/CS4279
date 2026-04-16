import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { saveTrip, type TripStop } from "@/lib/trips";
import {
  fetchExtras,
  generateAiItinerary as generateAiItineraryService,
} from "@/services/aiItineraryService";
import {
  placeToStop,
  searchPlaces,
  stopToActivity,
} from "@/services/placesService";
import { nearestNeighborRoute } from "@/services/routeService";
import type { AIDayResult, TravelMode } from "@/services/types";
import type { Day } from "@/components/itinerary/DayTabs";
import type { PlaceV1 } from "@/src/googlePlaces";

// ─── Utility helpers (hook-only, not exported) ───────────────────────────────

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateRange(start: string, end: string): string {
  if (!start) return "";
  const SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const s = new Date(start + "T00:00:00");
  if (!end || end === start) return `${SHORT[s.getMonth()]} ${s.getDate()}`;
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth()) {
    return `${SHORT[s.getMonth()]} ${s.getDate()}-${e.getDate()}`;
  }
  return `${SHORT[s.getMonth()]} ${s.getDate()} – ${SHORT[e.getMonth()]} ${e.getDate()}`;
}

function parseInterests(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAddTrip() {
  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey as
    | string
    | undefined;

  // ── Form state ───────────────────────────────────────────────────────────
  const [cityOrArea, setCityOrArea] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("5");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [interestsRaw, setInterestsRaw] = useState("");
  const [mode, setMode] = useState<"list" | "itineraries">("list");

  const interests = useMemo(() => parseInterests(interestsRaw), [interestsRaw]);

  const handleDateConfirm = useCallback((departure: Date, returnD?: Date) => {
    const start = toISODate(departure);
    setStartDate(start);
    setEndDate(returnD ? toISODate(returnD) : start);
    setDatePickerVisible(false);
  }, []);

  // ── Place search state ───────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<PlaceV1[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [finalStops, setFinalStops] = useState<TripStop[] | null>(null);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const generate = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert(
        "Missing API Key",
        "Set EXPO_PUBLIC_googlePlacesApiKey in your .env then restart Expo."
      );
      return;
    }
    if (!cityOrArea.trim()) return Alert.alert("Missing city/area", "Enter a city or area.");
    if (!startDate.trim() || !endDate.trim()) {
      return Alert.alert("Missing dates", "Enter start and end dates (YYYY-MM-DD).");
    }
    if (!interests.length) {
      return Alert.alert("Missing interests", "Enter interests separated by commas.");
    }

    setBusy(true);
    setFinalStops(null);

    try {
      const q = interests.length > 0
        ? `${interests.join(", ")} in ${cityOrArea}`
        : cityOrArea;

      const results = await searchPlaces(GOOGLE_PLACES_API_KEY, q, 20);
      setPlaces(results.slice(0, 15));

      const defaults: Record<string, boolean> = {};
      results.slice(0, 6).forEach((p) => (defaults[p.id] = true));
      setSelectedIds(defaults);

      if (mode === "itineraries") {
        const stops = results.slice(0, 6).map((p) =>
          placeToStop(GOOGLE_PLACES_API_KEY, p)
        );
        setFinalStops(nearestNeighborRoute(stops));
      }
    } catch (e: any) {
      Alert.alert("Generate failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }, [GOOGLE_PLACES_API_KEY, cityOrArea, startDate, endDate, interests, radiusMiles, mode]);

  const buildFromSelected = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert(
        "Missing API Key",
        "Set EXPO_PUBLIC_googlePlacesApiKey in your .env then restart Expo."
      );
      return;
    }

    const selectedPlaces = places.filter((p) => selectedIds[p.id]);
    if (selectedPlaces.length < 2) {
      return Alert.alert("Select at least 2 places", "Pick a few places to build your itinerary.");
    }

    const stops = selectedPlaces.map((p) => placeToStop(GOOGLE_PLACES_API_KEY, p));
    setFinalStops(nearestNeighborRoute(stops));
  }, [GOOGLE_PLACES_API_KEY, places, selectedIds]);

  // ── AI itinerary state ───────────────────────────────────────────────────
  const [aiItinBusy, setAiItinBusy] = useState(false);
  const [aiResolveProgress, setAiResolveProgress] = useState<{ done: number; total: number } | null>(null);
  const [aiDays, setAiDays] = useState<AIDayResult[] | null>(null);
  const [aiExtraStops, setAiExtraStops] = useState<TripStop[]>([]);
  const [selectedAiDayIdx, setSelectedAiDayIdx] = useState(0);

  useEffect(() => { setSelectedAiDayIdx(0); }, [aiDays]);

  const aiDayTabs: Day[] = useMemo(() => {
    if (!aiDays) return [];
    return aiDays.map((d, idx) => {
      try {
        const date = new Date(d.date + "T00:00:00");
        const label = date.toLocaleDateString("en-US", { weekday: "short" });
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        return { id: d.date || String(idx), label, dateLabel };
      } catch {
        return { id: String(idx), label: `Day ${idx + 1}`, dateLabel: "" };
      }
    });
  }, [aiDays]);

  const runGenerateAiItinerary = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert("Missing API Key", "Set EXPO_PUBLIC_googlePlacesApiKey in your .env then restart Expo.");
      return;
    }
    if (!cityOrArea.trim()) return Alert.alert("Missing city/area", "Enter a city or area.");
    if (!startDate.trim() || !endDate.trim()) {
      return Alert.alert("Missing dates", "Enter start and end dates (YYYY-MM-DD).");
    }
    if (!interests.length) {
      return Alert.alert("Missing interests", "Enter interests separated by commas.");
    }

    setAiItinBusy(true);
    setAiDays(null);
    setAiExtraStops([]);
    setAiResolveProgress(null);

    try {
      const resolvedDays = await generateAiItineraryService(
        {
          city: cityOrArea.trim(),
          interests,
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          radiusMiles: Number(radiusMiles) || undefined,
        },
        GOOGLE_PLACES_API_KEY,
        (done, total) => setAiResolveProgress({ done, total })
      );

      setAiDays(resolvedDays);

      const usedIds = new Set(
        resolvedDays.flatMap((d) => d.activities.map((a) => a.id))
      );
      const extras = await fetchExtras(
        GOOGLE_PLACES_API_KEY,
        interests,
        cityOrArea.trim(),
        usedIds
      );
      setAiExtraStops(extras);
    } catch (e: any) {
      Alert.alert("AI Itinerary failed", e?.message ?? "Unknown error");
    } finally {
      setAiItinBusy(false);
      setAiResolveProgress(null);
    }
  }, [GOOGLE_PLACES_API_KEY, cityOrArea, startDate, endDate, interests, radiusMiles]);

  const addExtraToDay = useCallback((stop: TripStop, dayIndex: number, aiTime?: string) => {
    const SLOT_ORDER: Record<string, number> = { morning: 0, noon: 1, afternoon: 2, evening: 3 };
    const slotOrder = (t: string) => SLOT_ORDER[t?.toLowerCase()] ?? 4;

    setAiDays((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      const existing = updated[dayIndex].activities;
      const newActivity = {
        ...stop,
        aiTime: aiTime ?? "TBD",
        aiDurationMinutes: 60,
        aiCommuteMinutes: null,
        aiCategory: "attraction",
        aiTravelMode: "drive" as TravelMode,
      };
      const newOrder = slotOrder(aiTime ?? "");
      const insertAt = existing.findIndex((a) => slotOrder(a.aiTime) > newOrder);
      const activities =
        insertAt === -1
          ? [...existing, newActivity]
          : [...existing.slice(0, insertAt), newActivity, ...existing.slice(insertAt)];
      updated[dayIndex] = { ...updated[dayIndex], activities };
      return updated;
    });
    setAiExtraStops((prev) => prev.filter((s) => s.id !== stop.id));
  }, []);

  // ── Places-list direct export / save (no AI, no route-build step) ───────
  const exportSelectedRoute = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) return;
    const selected = places.filter((p) => selectedIds[p.id]);
    if (selected.length < 2) {
      Alert.alert("Select at least 2 places", "Tap places to select them first.");
      return;
    }
    const stops = nearestNeighborRoute(selected.map((p) => placeToStop(GOOGLE_PLACES_API_KEY, p)));
    const waypoints = stops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
    const dest = stops[stops.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${dest.lat},${dest.lng}`
    )}&waypoints=${encodeURIComponent(waypoints)}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Can't open Google Maps");
  }, [GOOGLE_PLACES_API_KEY, places, selectedIds]);

  const saveSelectedTrip = useCallback(async () => {
    if (!GOOGLE_PLACES_API_KEY) return;
    const selected = places.filter((p) => selectedIds[p.id]);
    if (!selected.length) {
      Alert.alert("No places selected", "Tap places to select them first.");
      return;
    }
    const stops = selected.map((p) => placeToStop(GOOGLE_PLACES_API_KEY, p));
    await saveTrip({
      tripId: `trip_${Date.now()}`,
      createdAt: new Date().toISOString(),
      cityOrArea,
      radiusMiles: Number(radiusMiles) || undefined,
      startDate,
      endDate,
      interests,
      stops,
    });
    Alert.alert("Saved!", "Trip saved.");
  }, [GOOGLE_PLACES_API_KEY, places, selectedIds, cityOrArea, radiusMiles, startDate, endDate, interests]);

  // ── Save / export ────────────────────────────────────────────────────────
  const saveFinalTrip = useCallback(async () => {
    if (!finalStops || finalStops.length === 0) return;
    const tripId = `trip_${Date.now()}`;
    await saveTrip({
      tripId,
      createdAt: new Date().toISOString(),
      cityOrArea,
      radiusMiles: Number(radiusMiles) || undefined,
      startDate,
      endDate,
      interests,
      stops: finalStops,
    });
    Alert.alert("Saved!", "Trip saved locally.");
  }, [finalStops, cityOrArea, radiusMiles, startDate, endDate, interests]);

  const saveAiTrip = useCallback(async () => {
    if (!aiDays || aiDays.length === 0) return;
    const tripId = `trip_ai_${Date.now()}`;
    const allStops = aiDays.flatMap((d) => d.activities);
    await saveTrip({
      tripId,
      createdAt: new Date().toISOString(),
      cityOrArea,
      radiusMiles: Number(radiusMiles) || undefined,
      startDate,
      endDate,
      interests,
      stops: allStops,
    });
    Alert.alert("Saved!", "AI Trip saved locally.");
  }, [aiDays, cityOrArea, radiusMiles, startDate, endDate, interests]);

  const exportItineraryToGoogleMaps = useCallback(async () => {
    if (!finalStops || finalStops.length < 2) {
      Alert.alert("Not enough stops", "Build an itinerary with at least 2 stops first.");
      return;
    }
    const waypoints = finalStops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
    const destination = finalStops[finalStops.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${destination.lat},${destination.lng}`
    )}&waypoints=${encodeURIComponent(waypoints)}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert("Can't open Google Maps", "Your device can't open the route URL.");
      return;
    }
    await Linking.openURL(url);
  }, [finalStops]);

  const exportAiRoute = useCallback(async () => {
    if (!aiDays || aiDays.length === 0) return;
    const allStops = aiDays.flatMap((d) => d.activities);
    if (allStops.length < 2) {
      Alert.alert("Not enough stops", "Build an itinerary with at least 2 stops first.");
      return;
    }
    const waypoints = allStops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
    const destination = allStops[allStops.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${destination.lat},${destination.lng}`
    )}&waypoints=${encodeURIComponent(waypoints)}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert("Can't open Google Maps", "Your device can't open the route URL.");
      return;
    }
    await Linking.openURL(url);
  }, [aiDays]);

  const resetForm = useCallback(() => {
    setCityOrArea("");
    setRadiusMiles("5");
    setInterestsRaw("");
    setPlaces([]);
    setSelectedIds({});
    setFinalStops(null);
    setAiDays(null);
    setAiExtraStops([]);
    setSelectedAiDayIdx(0);
  }, []);

  return {
    // form
    cityOrArea, setCityOrArea,
    radiusMiles, setRadiusMiles,
    startDate, endDate,
    datePickerVisible, setDatePickerVisible,
    handleDateConfirm,
    interestsRaw, setInterestsRaw,
    mode, setMode,
    interests,
    // place search
    busy, places, selectedIds,
    toggle, generate,
    exportSelectedRoute, saveSelectedTrip,
    // route
    finalStops,
    buildFromSelected,
    // AI itinerary
    aiItinBusy, aiResolveProgress,
    aiDays, setAiDays,
    aiExtraStops,
    selectedAiDayIdx, setSelectedAiDayIdx,
    aiDayTabs,
    generateAiItinerary: runGenerateAiItinerary,
    addExtraToDay,
    saveAiTrip,
    exportAiRoute,
    resetForm,
    // trip
    saveFinalTrip,
    exportItineraryToGoogleMaps,
    // helpers exposed for JSX use
    formatDateRange,
    stopToActivity,
    GOOGLE_PLACES_API_KEY,
    placeToStop,
  };
}
