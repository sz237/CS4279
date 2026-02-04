import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { auth } from "../../src/config/firebase";

const GEMINI_API_KEY: string = process.env.EXPO_PUBLIC_geminiApiKey ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

export default function ChatScreen() {
  const user = auth.currentUser;

  const [query, setQuery] = useState("restaurants near Nashville");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function runSearch() {
    if (!GEMINI_API_KEY) {
      setError("Gemini API key missing. Add EXPO_PUBLIC_geminiApiKey to .env");
      return;
    }

    try {
      setLoading(true);
      setError(undefined);
      setAnswer("");

      const body = {
        contents: [
          {
            parts: [
              {
                text: `Give a concise answer (max 80 words) to: ${query}`,
              },
            ],
          },
        ],
      };

      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Request failed: ${res.status} ${msg}`);
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("\n")
          .trim() ?? "";

      setAnswer(text || "No answer returned.");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white px-5 pt-10"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold">Gemini Search</Text>
      <Text className="mt-1 text-sm text-neutral-600">
        Logged in as: {user?.email ?? "Unknown"}
      </Text>

      <Text className="mt-6 text-sm font-medium text-neutral-800">
        What do you want to ask?
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Ask Gemini anything..."
        className="mt-2 rounded-2xl border border-neutral-200 px-4 py-3 text-base"
        editable={!loading}
      />

      <Pressable
        onPress={runSearch}
        disabled={loading}
        className={`mt-4 rounded-2xl px-4 py-3 ${
          loading ? "bg-neutral-400" : "bg-black"
        }`}
      >
        <Text className="text-center text-base font-semibold text-white">
          {loading ? "Searching..." : "Ask Gemini"}
        </Text>
      </Pressable>

      {error ? (
        <Text className="mt-3 text-sm text-red-600">Error: {error}</Text>
      ) : null}

      {answer ? (
        <View className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <Text className="text-sm text-neutral-800">{answer}</Text>
        </View>
      ) : null}

      {!answer && !error && !loading ? (
        <Text className="mt-4 text-sm text-neutral-600">
          No response yet. Enter a question and tap the button above.
        </Text>
      ) : null}
    </ScrollView>
  );
}
