import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import ActivityCard, { Activity } from "@/components/itinerary/ActivityCard";
import {
    getBestAddress,
    getBestName,
    getBestPhotoUrl,
    searchText,
    type PlaceV1,
} from "@/src/googlePlaces";

import { openStopInGoogleMaps, saveTrip, TripStop } from "@/lib/trips";

// ---------- Routing helpers (free) ----------
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nearestNeighborRoute(stops: TripStop[]) {
  if (stops.length <= 2) return stops;

  const remaining = stops.slice(1);
  const route: TripStop[] = [stops[0]];
  let curr = stops[0];

  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(
        { lat: curr.lat, lng: curr.lng },
        { lat: remaining[i].lat, lng: remaining[i].lng }
      );
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    curr = next;
  }
  return route;
}

function parseInterests(raw: string) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toMeters(milesStr: string) {
  const miles = Number(milesStr);
  if (!Number.isFinite(miles) || miles <= 0) return undefined;
  return Math.round(miles * 1609.34);
}

// Converts a PlaceV1 into a TripStop for saving / routing
function placeToStop(apiKey: string, p: PlaceV1): TripStop {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Place missing coordinates");
  }

  return {
    id: p.id,
    name: getBestName(p),
    address: getBestAddress(p),
    lat,
    lng,
    imageUrl: getBestPhotoUrl({ apiKey, place: p, maxWidthPx: 1200 }),
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    types: p.types,
  };
}

// Convert TripStop to ActivityCard-compatible data
function stopToActivity(stop: TripStop, opts: { labelRight?: string }): Activity {
  const ratingStr =
    stop.rating != null ? `${stop.rating.toFixed(1)}★ (${stop.userRatingCount ?? 0})` : "";

  return {
    id: stop.id,
    title: stop.name,
    description: stop.address ?? "",
    time: opts.labelRight ?? ratingStr,
    duration: (stop.types?.[0] ?? "").replaceAll("_", " "),
    imageUrl: stop.imageUrl,
  };
}

export default function AddTripScreen() {
  // Inputs
  const [cityOrArea, setCityOrArea] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("5");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [interestsRaw, setInterestsRaw] = useState("");
  const [mode, setMode] = useState<"list" | "itineraries">("list");

  // Data state
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<PlaceV1[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [finalStops, setFinalStops] = useState<TripStop[] | null>(null);

  const interests = useMemo(() => parseInterests(interestsRaw), [interestsRaw]);

  // Matches your itinerary file pattern
  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey as
    | string
    | undefined;

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
      const q = `${interests.join(", ")} in ${cityOrArea}`;
      const radiusMeters = toMeters(radiusMiles);
      void radiusMeters; // kept for future upgrade (geocode + locationBias)

      const resp = await searchText({
        apiKey: GOOGLE_PLACES_API_KEY,
        textQuery: q,
        maxResultCount: 20,
      });

      const results = (resp.places ?? []).filter(
        (p) =>
          typeof p.location?.latitude === "number" &&
          typeof p.location?.longitude === "number"
      );

      setPlaces(results.slice(0, 15));

      // Default-select top 6
      const defaults: Record<string, boolean> = {};
      results.slice(0, 6).forEach((p) => (defaults[p.id] = true));
      setSelectedIds(defaults);

      if (mode === "itineraries") {
        const stops = results.slice(0, 6).map((p) =>
          placeToStop(GOOGLE_PLACES_API_KEY, p)
        );
        const ordered = nearestNeighborRoute(stops);
        setFinalStops(ordered);
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
    const ordered = nearestNeighborRoute(stops);
    setFinalStops(ordered);
  }, [GOOGLE_PLACES_API_KEY, places, selectedIds]);

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

  const exportItineraryToGoogleMaps = useCallback(async () => {
    if (!finalStops || finalStops.length < 2) {
      Alert.alert("Not enough stops", "Build an itinerary with at least 2 stops first.");
      return;
    }

    // Google Maps multi-stop directions URL
    const waypoints = finalStops
      .slice(0, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join("|");
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: "800" }}>Add Trip</Text>
        <Text style={{ color: "#6B7280", marginTop: 4 }}>
          Generate places, select your favorites, then build a route.
        </Text>
      </View>

      {/* Inputs */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Text style={{ fontWeight: "700" }}>City or area</Text>
        <TextInput
          value={cityOrArea}
          onChangeText={setCityOrArea}
          placeholder="e.g., Austin, TX"
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 16,
            padding: 12,
            backgroundColor: "white",
          }}
        />

        <Text style={{ fontWeight: "700" }}>Radius (miles)</Text>
        <TextInput
          value={radiusMiles}
          onChangeText={setRadiusMiles}
          keyboardType="numeric"
          placeholder="e.g., 5"
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 16,
            padding: 12,
            backgroundColor: "white",
          }}
        />

        <Text style={{ fontWeight: "700" }}>Dates (YYYY-MM-DD)</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="Start date"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              padding: 12,
              backgroundColor: "white",
            }}
          />
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="End date"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              padding: 12,
              backgroundColor: "white",
            }}
          />
        </View>

        <Text style={{ fontWeight: "700" }}>Interests (comma-separated)</Text>
        <TextInput
          value={interestsRaw}
          onChangeText={setInterestsRaw}
          placeholder="museums, coffee, nature, nightlife"
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 16,
            padding: 12,
            backgroundColor: "white",
          }}
        />

        <Text style={{ fontWeight: "700" }}>Recommendation mode</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setMode("list")}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: mode === "list" ? "#111827" : "#E5E7EB",
            }}
          >
            <Text
              style={{
                color: mode === "list" ? "white" : "#111827",
                fontWeight: "700",
              }}
            >
              List of places
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("itineraries")}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: mode === "itineraries" ? "#111827" : "#E5E7EB",
            }}
          >
            <Text
              style={{
                color: mode === "itineraries" ? "white" : "#111827",
                fontWeight: "700",
              }}
            >
              Itinerary options
            </Text>
          </Pressable>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          onPress={generate}
          disabled={busy}
          activeOpacity={0.85}
          style={{
            backgroundColor: busy ? "#9CA3AF" : "#111827",
            borderRadius: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 6,
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 8 }}>
            {busy ? "Generating…" : "Generate places"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Places list using ActivityCard UI */}
      {places.length > 0 && GOOGLE_PLACES_API_KEY && (
        <View style={{ marginTop: 14 }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Places (tap to select)</Text>
          </View>

          {places.map((p) => {
            const stop = placeToStop(GOOGLE_PLACES_API_KEY, p);
            const activity = stopToActivity(stop, {});

            return (
              <View key={p.id} style={{ position: "relative" }}>
                {/* Selection badge */}
                <View
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 10,
                    zIndex: 20,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selectedIds[p.id] ? "#16A34A" : "rgba(0,0,0,0.08)",
                  }}
                >
                  <Ionicons
                    name={selectedIds[p.id] ? "checkmark" : "ellipse-outline"}
                    size={14}
                    color={selectedIds[p.id] ? "white" : "#6B7280"}
                  />
                </View>

                {/* Tap card to select/unselect.
                    Address hyperlink inside ActivityCard opens Maps (handled in ActivityCard.tsx). */}
                <Pressable onPress={() => toggle(p.id)}>
                  <ActivityCard activity={activity} />
                </Pressable>
              </View>
            );
          })}

          {/* Build itinerary button */}
          {mode === "list" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <TouchableOpacity
                onPress={buildFromSelected}
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
                  backgroundColor: "white",
                }}
              >
                <Ionicons name="shuffle" size={18} color="#6B7280" />
                <Text style={{ color: "#6B7280", fontWeight: "700", marginLeft: 6 }}>
                  Build itinerary from selected
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Itinerary using ActivityCard style */}
      {finalStops && finalStops.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Itinerary</Text>
          </View>

          {finalStops.map((s, idx) => {
            const activity = stopToActivity(s, { labelRight: `Stop ${idx + 1}` });

            return (
              <View key={`flow-${s.id}`}>
                {/* Tap card to open stop in Maps.
                    Address hyperlink inside ActivityCard also opens Maps. */}
                <Pressable onPress={() => openStopInGoogleMaps(s)}>
                  <ActivityCard activity={activity} />
                </Pressable>

                {idx < finalStops.length - 1 ? (
                  <Text style={{ textAlign: "center", color: "#9CA3AF", marginBottom: 6 }}>↓</Text>
                ) : null}
              </View>
            );
          })}

          <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={saveFinalTrip}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: "#111827",
                borderRadius: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: "white", fontWeight: "800", marginLeft: 6 }}>Save Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={exportItineraryToGoogleMaps}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: "#2563EB",
                borderRadius: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: "white", fontWeight: "800", marginLeft: 6 }}>Export Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}