import SerpApiCard from "@/components/serpApiCard";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { auth } from "../../src/config/firebase";

const SERPAPI_KEY: string = process.env.EXPO_PUBLIC_serpApiKey ?? "";

type SerpLocalResult = {
  place_id?: string;
  title?: string;
  rating?: number;
  reviews?: number;
  address?: string;
};

export default function HomeScreen() {
  const user = auth.currentUser;

  const [results, setResults] = useState<SerpLocalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function runSearch() {
    try {
      setLoading(true);
      setError(undefined);

      const query = "coffee near Nashville TN";

      const url =
        `https://serpapi.com/search.json` +
        `?engine=google_maps` +
        `&q=${encodeURIComponent(query)}` +
        `&hl=en` +
        `&gl=us` +
        `&api_key=${encodeURIComponent(SERPAPI_KEY)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json();
      const localResults = Array.isArray(data.local_results) ? data.local_results : [];

      setResults(localResults);
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
          {loading ? "Searching..." : "Search Coffee Spots"}
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
        renderItem={({ item }) => (
          <SerpApiCard item={item} />
        )}
      />
    </View>
  );
}
