import * as Linking from "expo-linking";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { buildItinerary, summarizeReviews } from "../../lib/api";
import { placeDetails, placesTextSearch } from "../../lib/googleplaces";

type PlaceRow = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
};

export default function GooglePlacesScreen() {
  const [query, setQuery] = useState("Things to do in New York City, NYC");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PlaceRow[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  async function doSearch() {
    setBusy(true);
    setSelected(null);
    setSummary(null);
    try {
      const places = await placesTextSearch(query);
      const mapped: PlaceRow[] = places.map((p) => ({
        id: p.id,
        name: p.displayName?.text || "(no name)",
        address: p.formattedAddress,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        rating: p.rating,
        userRatingCount: p.userRatingCount,
      }));
      setResults(mapped);
    } catch (e: any) {
      setResults([]);
      setSelected({ error: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function openPlace(placeId: string) {
    setBusy(true);
    setSelected(null);
    setSummary(null);
    try {
      const d = await placeDetails(placeId);
      setSelected(d);

      const reviews =
        (d.reviews || [])
          .slice(0, 8)
          .map((r) => ({
            author: r.authorAttribution?.displayName,
            rating: r.rating,
            text: r.text?.text || "",
          }))
          .filter((r) => r.text.trim().length > 0) || [];

      if (reviews.length > 0) {
        const s = await summarizeReviews(d.displayName?.text || "Place", reviews);
        setSummary(s);
      } else {
        setSummary({ what_people_say: ["No reviews returned by API for this place."] });
      }
    } catch (e: any) {
      setSelected({ error: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function optimizeTop5Route() {
    // crude: use first 5 results with lat/lng; start at first
    const candidates = results.filter(r => typeof r.lat === "number" && typeof r.lng === "number").slice(0, 5);
    if (candidates.length < 2) return;

    setBusy(true);
    try {
      const start = candidates[0];
      const res = await buildItinerary({
        start_lat: start.lat!,
        start_lng: start.lng!,
        candidates: candidates.map(c => ({
          id: c.id,
          name: c.name,
          lat: c.lat!,
          lng: c.lng!,
          rating: c.rating,
          userRatingCount: c.userRatingCount,
        })),
        max_stops: candidates.length,
        dwell_minutes: 60,
        start_time: "09:00",
      });

      // Open in Apple Maps using a simple "dirflg" link with waypoints
      // Apple Maps supports a destination; for multiple waypoints, simplest is Google Maps URL
      const waypoints = res.ordered.map(s => `${s.lat},${s.lng}`).join("|");
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${res.ordered[res.ordered.length - 1].lat},${res.ordered[res.ordered.length - 1].lng}`
      )}&waypoints=${encodeURIComponent(waypoints)}`;

      await Linking.openURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>Places + Reviews + AI Summary</Text>

      <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#D1D5DB",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <Pressable
          onPress={doSearch}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: busy ? "#9CA3AF" : "#111827",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>{busy ? "..." : "Search"}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={optimizeTop5Route}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 10,
          backgroundColor: results.length >= 2 ? "#2563EB" : "#9CA3AF",
          marginBottom: 10,
          alignSelf: "flex-start",
        }}
        disabled={results.length < 2 || busy}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Optimize Top-5 Route (Heuristic)</Text>
      </Pressable>

      <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Results</Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openPlace(item.id)}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                {item.address ? <Text style={{ color: "#6B7280" }}>{item.address}</Text> : null}
                <Text style={{ marginTop: 4, color: "#374151" }}>
                  Rating: {item.rating ?? "—"} ({item.userRatingCount ?? 0})
                </Text>
              </Pressable>
            )}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Details</Text>
          <ScrollView
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 12,
              flex: 1,
            }}
          >
            {!selected ? (
              <Text style={{ color: "#6B7280" }}>Tap a place to fetch reviews + AI summary.</Text>
            ) : selected.error ? (
              <Text style={{ color: "#B91C1C" }}>{selected.error}</Text>
            ) : (
              <>
                <Text style={{ fontSize: 18, fontWeight: "800" }}>{selected.displayName?.text}</Text>
                <Text style={{ color: "#6B7280", marginBottom: 8 }}>{selected.formattedAddress}</Text>

                <Text style={{ fontWeight: "700", marginTop: 10 }}>What people say</Text>
                {summary?.what_people_say?.map((b: string, i: number) => (
                  <Text key={`wps-${i}`}>• {b}</Text>
                ))}

                {summary?.pros?.length ? (
                  <>
                    <Text style={{ fontWeight: "700", marginTop: 10 }}>Pros</Text>
                    {summary.pros.map((b: string, i: number) => (
                      <Text key={`pro-${i}`}>• {b}</Text>
                    ))}
                  </>
                ) : null}

                {summary?.cons?.length ? (
                  <>
                    <Text style={{ fontWeight: "700", marginTop: 10 }}>Cons</Text>
                    {summary.cons.map((b: string, i: number) => (
                      <Text key={`con-${i}`}>• {b}</Text>
                    ))}
                  </>
                ) : null}

                {summary?.best_for?.length ? (
                  <>
                    <Text style={{ fontWeight: "700", marginTop: 10 }}>Best for</Text>
                    {summary.best_for.map((b: string, i: number) => (
                      <Text key={`bf-${i}`}>• {b}</Text>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}