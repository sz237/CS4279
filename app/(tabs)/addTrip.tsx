import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { saveTrip, TripStop } from "../../lib/trips";

// Uses Places API (New) text search (you already have Places usage in the repo per the doc)
async function placesTextSearch(query: string) {
  const key = process.env.EXPO_PUBLIC_googlePlacesApiKey;
  if (!key) throw new Error("Missing EXPO_PUBLIC_googlePlacesApiKey in .env");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Places search failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return (data.places || []) as any[];
}

// Simple Haversine distance (free, no routing API needed)
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
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
      const d = haversineKm({ lat: curr.lat, lng: curr.lng }, { lat: remaining[i].lat, lng: remaining[i].lng });
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

export default function AddTripScreen() {
  // Inputs required by spec
  const [cityOrArea, setCityOrArea] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("5");
  const [startDate, setStartDate] = useState(""); // keep as YYYY-MM-DD for MVP
  const [endDate, setEndDate] = useState("");
  const [interestsRaw, setInterestsRaw] = useState("");
  const [mode, setMode] = useState<"list" | "itineraries">("list");

  // Data state
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [finalStops, setFinalStops] = useState<TripStop[] | null>(null);

  const interests = useMemo(() => parseInterests(interestsRaw), [interestsRaw]);

  async function generate() {
    if (!cityOrArea.trim()) return Alert.alert("Missing city/area", "Enter a city or area.");
    if (!startDate.trim() || !endDate.trim())
      return Alert.alert("Missing dates", "Enter start and end dates (YYYY-MM-DD).");
    if (!interests.length)
      return Alert.alert("Missing interests", "Enter interests separated by commas.");

    setBusy(true);
    setFinalStops(null);
    try {
      // Query strategy: combine city + interests for Places Text Search
      const q = `${interests.join(", ")} in ${cityOrArea}`;
      const results = await placesTextSearch(q);

      // Convert to “place boxes” (name, address, short description -> MVP uses types/rating)
      const mapped = results
        .map((p) => ({
          id: p.id,
          name: p.displayName?.text || "(no name)",
          address: p.formattedAddress || "",
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          rating: p.rating,
          userRatingCount: p.userRatingCount,
          types: (p.types || []).slice(0, 3).join(", "),
        }))
        .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
        .slice(0, 15);

      setPlaces(mapped);

      // Default-select top 6
      const defaults: Record<string, boolean> = {};
      mapped.slice(0, 6).forEach((p) => (defaults[p.id] = true));
      setSelectedIds(defaults);

      if (mode === "itineraries") {
        // MVP: auto-build an itinerary immediately from top selections
        const stops = mapped.slice(0, 6).map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
        }));
        const ordered = nearestNeighborRoute(stops);
        setFinalStops(ordered);
      }
    } catch (e: any) {
      Alert.alert("Generate failed", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function buildFromSelected() {
    const selected = places
      .filter((p) => selectedIds[p.id])
      .map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
      })) as TripStop[];

    if (selected.length < 2) {
      return Alert.alert("Select at least 2 places", "Pick a few places to build your itinerary.");
    }

    // Route optimization (free heuristic)
    const ordered = nearestNeighborRoute(selected);
    setFinalStops(ordered);
  }

  async function saveFinalTrip() {
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

    Alert.alert("Saved!", "Trip saved locally. (Existing Trip tab can read from storage next.)");
  }

  async function openInMaps() {
    if (!finalStops || finalStops.length < 2) return;

    // Google Maps multi-stop directions URL
    const waypoints = finalStops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
    const destination = finalStops[finalStops.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${destination.lat},${destination.lng}`
    )}&waypoints=${encodeURIComponent(waypoints)}`;

    await Linking.openURL(url);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Add Trip</Text>

      <Text style={{ fontWeight: "700" }}>City or area</Text>
      <TextInput
        value={cityOrArea}
        onChangeText={setCityOrArea}
        placeholder="e.g., Austin, TX"
        style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10 }}
      />

      <Text style={{ fontWeight: "700" }}>Radius (miles)</Text>
      <TextInput
        value={radiusMiles}
        onChangeText={setRadiusMiles}
        keyboardType="numeric"
        placeholder="e.g., 5"
        style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10 }}
      />

      <Text style={{ fontWeight: "700" }}>Dates (YYYY-MM-DD)</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="Start date"
          style={{ flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10 }}
        />
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          placeholder="End date"
          style={{ flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10 }}
        />
      </View>

      <Text style={{ fontWeight: "700" }}>Interests (comma-separated)</Text>
      <TextInput
        value={interestsRaw}
        onChangeText={setInterestsRaw}
        placeholder="museums, coffee, nature, nightlife"
        style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10 }}
      />

      <Text style={{ fontWeight: "700" }}>Recommendation mode</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => setMode("list")}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: mode === "list" ? "#111827" : "#E5E7EB",
          }}
        >
          <Text style={{ color: mode === "list" ? "white" : "black", fontWeight: "700" }}>
            List of places
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("itineraries")}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: mode === "itineraries" ? "#111827" : "#E5E7EB",
          }}
        >
          <Text style={{ color: mode === "itineraries" ? "white" : "black", fontWeight: "700" }}>
            Itinerary options
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={generate}
        disabled={busy}
        style={{
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: busy ? "#9CA3AF" : "#2563EB",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>{busy ? "Generating..." : "Generate"}</Text>
      </Pressable>

      {/* Place boxes list */}
      {places.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>
            Places (tap to select)
          </Text>

          {places.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => toggle(p.id)}
              style={{
                borderWidth: 2,
                borderColor: selectedIds[p.id] ? "#22C55E" : "#E5E7EB",
                borderRadius: 14,
                padding: 12,
                backgroundColor: selectedIds[p.id] ? "#ECFDF5" : "white",
              }}
            >
              <Text style={{ fontWeight: "800" }}>{p.name}</Text>
              <Text style={{ color: "#6B7280" }}>{p.address}</Text>
              <Text style={{ marginTop: 6 }}>
                {p.types || "Place"} • Rating {p.rating ?? "—"} ({p.userRatingCount ?? 0})
              </Text>
            </Pressable>
          ))}

          {mode === "list" && (
            <Pressable
              onPress={buildFromSelected}
              style={{
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: "#111827",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Build itinerary from selected</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Flow map */}
      {finalStops && finalStops.length > 0 && (
        <View style={{ gap: 10, marginTop: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>Flow Map</Text>
          {finalStops.map((s, idx) => (
            <View key={s.id} style={{ gap: 8 }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: "white",
                }}
              >
                <Text style={{ fontWeight: "900" }}>
                  Stop {idx + 1}: {s.name}
                </Text>
                {s.address ? <Text style={{ color: "#6B7280" }}>{s.address}</Text> : null}
              </View>

              {idx < finalStops.length - 1 ? (
                <Text style={{ textAlign: "center", color: "#6B7280" }}>↓</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Treasure map */}
      {finalStops && finalStops.length > 0 && (
        <View style={{ gap: 10, marginTop: 10, marginBottom: 30 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>Treasure Map</Text>

          {finalStops.map((s, idx) => (
            <View key={`t-${s.id}`} style={{ gap: 10 }}>
              <View
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: "#D97706",
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: "#FFFBEB",
                }}
              >
                <Text style={{ fontWeight: "900" }}>
                  {idx + 1}. {s.name}
                </Text>
                {s.address ? <Text style={{ color: "#92400E" }}>{s.address}</Text> : null}
              </View>

              {idx < finalStops.length - 1 ? (
                <Text style={{ textAlign: "center", color: "#D97706" }}>················</Text>
              ) : (
                <Text style={{ textAlign: "center", fontSize: 22, fontWeight: "900", color: "#DC2626" }}>
                  X
                </Text>
              )}
            </View>
          ))}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={saveFinalTrip}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#16A34A", alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Save Trip</Text>
            </Pressable>

            <Pressable
              onPress={openInMaps}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Open in Maps</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}