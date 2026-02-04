import SerpApiCard from "@/components/serpApiCard";
import React, { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { auth } from "../../src/config/firebase";

const API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey;

export type PlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
};

async function textSearchNYC(query: string): Promise<PlaceResult[]> {
  if (!API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_GOOGLE_PLACES_KEY");
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      // REQUIRED
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 10,
      locationBias: {
        circle: {
          center: { latitude: 40.7128, longitude: -74.006 },
          radius: 20000,
        },
      },
      includedType: "tourist_attraction",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.places ?? []) as PlaceResult[];
}

type SerpLocalResult = {
  place_id?: string;
  title?: string;
  rating?: number;
  reviews?: number;
  address?: string;
};

function placeToSerpLocalResult(p: PlaceResult): SerpLocalResult {
  return {
    place_id: p.id,
    title: p.displayName?.text,
    rating: p.rating,
    reviews: p.userRatingCount,
    address: p.formattedAddress,
  };
}

export default function HomeScreen() {
  const user = auth.currentUser;

  const [results, setResults] = useState<SerpLocalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function runSearch() {
    try {
      setLoading(true);
      setError(undefined);

      const query = "Things to do in New York City, NYC";
      const places = await textSearchNYC(query);

      setResults(places.map(placeToSerpLocalResult));
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-5 pt-10">
      <Text className="text-2xl font-bold">Welcome Home</Text>
      <Text className="mt-1 text-sm text-neutral-600">
        Logged in as: {user?.email ?? "Unknown"}
      </Text>

      <Pressable
        onPress={runSearch}
        disabled={loading}
        className={`mt-6 rounded-2xl px-4 py-3 ${
          loading ? "bg-neutral-400" : "bg-black"
        }`}
      >
        <Text className="text-center text-base font-semibold text-white">
          {loading ? "Searching..." : "Search NYC Things To Do"}
        </Text>
      </Pressable>

      {error ? (
        <Text className="mt-3 text-sm text-red-600">Error: {error}</Text>
      ) : null}

      <FlatList
        className="mt-5"
        data={results}
        keyExtractor={(item, idx) => item.place_id ?? String(idx)}
        ListEmptyComponent={
          !loading ? (
            <Text className="text-sm text-neutral-600">
              No results yet. Tap the button above.
            </Text>
          ) : null
        }
        renderItem={({ item }) => <SerpApiCard item={item} />}
      />
    </View>
  );
}