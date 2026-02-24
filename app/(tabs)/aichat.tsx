import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { chat } from "../../lib/api";

type Msg = { id: string; role: "user" | "assistant"; content: string };

export default function AiChatScreen() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi — tell me where you’re traveling and what you want to do (food, museums, nature, nightlife, budget).",
    },
  ]);

  const apiMessages = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: Msg = { id: String(Date.now()), role: "user", content: text };
    setMessages((prev) => [userMsg, ...prev]);
    setInput("");
    setBusy(true);

    try {
      const res = await chat(apiMessages.concat([{ role: "user", content: text }]), {
        product: "Nomad",
        goal: "travel planning",
      });

      const botMsg: Msg = { id: String(Date.now() + 1), role: "assistant", content: res.reply };
      setMessages((prev) => [botMsg, ...prev]);
    } catch (e: any) {
      const botMsg: Msg = {
        id: String(Date.now() + 2),
        role: "assistant",
        content: `Error contacting backend: ${e?.message || String(e)}`,
      };
      setMessages((prev) => [botMsg, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>AI Chat (Mistral via Ollama)</Text>

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: item.role === "user" ? "#DCFCE7" : "#E5E7EB",
                padding: 12,
                borderRadius: 12,
                marginBottom: 10,
                maxWidth: "90%",
              }}
            >
              <Text style={{ fontSize: 15 }}>{item.content}</Text>
            </View>
          )}
        />

        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask for an itinerary, food spots, etc."
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
            onPress={send}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              backgroundColor: busy ? "#9CA3AF" : "#111827",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>{busy ? "..." : "Send"}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}