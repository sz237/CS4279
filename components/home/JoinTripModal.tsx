import { auth } from "@/src/config/firebase";
import type { ItineraryModel } from "@/src/models";
import {
  findItineraryByCode,
  joinItineraryByCode,
} from "@/src/services/trips";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoined: (tripId: string) => void;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sStr = `${MONTHS[s.getMonth()]} ${s.getDate()}`;
  const eStr = `${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  return `${sStr} - ${eStr}`;
}

const AVATAR_COLORS = [
  "bg-violet-200",
  "bg-blue-200",
  "bg-emerald-200",
  "bg-amber-200",
  "bg-rose-200",
];

export function JoinTripModal({ visible, onClose, onJoined }: Props) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "searching" | "joining" | "error" | "already-member"
  >("idle");
  const [preview, setPreview] = useState<ItineraryModel | null>(null);
  const [interestsRaw, setInterestsRaw] = useState("");

  function handleChangeText(text: string) {
    setCode(text);
    if (status === "error") setStatus("idle");
  }

  async function handleSearch() {
    const trimmed = code.trim();
    if (!trimmed || status === "searching") return;

    setStatus("searching");
    try {
      const trip = await findItineraryByCode(trimmed);
      if (!trip) {
        setStatus("error");
      } else {
        setPreview(trip);
        setStatus("idle");
      }
    } catch {
      setStatus("error");
    }
  }

  async function handleJoin() {
    if (!preview || status === "joining") return;

    const uid = auth.currentUser?.uid;
    if (uid && preview.memberUids.includes(uid)) {
      setStatus("already-member");
      return;
    }

    const selectedInterests = interestsRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setStatus("joining");

    try {
      const trip = await joinItineraryByCode(
        preview.inviteCode,
        selectedInterests
      );

      if (trip) {
        handleClose();
        onJoined(trip.id);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setCode("");
    setStatus("idle");
    setPreview(null);
    setInterestsRaw("");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full"
          >
            <View className="bg-white rounded-3xl px-6 pt-5 pb-8">
              <Pressable
                onPress={handleClose}
                className="self-end flex-row items-center gap-1 mb-3"
              >
                <Text className="text-gray-400 text-base">Cancel</Text>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>

              {preview ? (
                <View>
                  <Text className="text-violet-600 text-xs font-bold tracking-widest uppercase mb-2">
                    Trip Overview
                  </Text>

                  <Text className="text-zinc-900 text-3xl font-extrabold mb-3">
                    {preview.cityOrArea}
                  </Text>

                  <View className="flex-row items-center gap-2 mb-6">
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#52525B"
                    />
                    <Text className="text-zinc-600 text-base">
                      {formatDateRange(preview.startDate, preview.endDate)}
                    </Text>
                  </View>

                  <Text className="text-zinc-900 text-lg font-bold mb-4">
                    Group Members{" "}
                    <Text className="text-gray-400 font-normal">
                      ({preview.memberUsernames.length})
                    </Text>
                  </Text>

                  <View className="flex-row flex-wrap gap-3 mb-6">
                    {preview.memberUsernames.map((name, i) => (
                      <View
                        key={i}
                        className="flex-row items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2"
                      >
                        <View
                          className={`w-8 h-8 rounded-full items-center justify-center ${
                            AVATAR_COLORS[i % AVATAR_COLORS.length]
                          }`}
                        >
                          <Text className="text-xs font-bold text-zinc-700">
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text className="text-zinc-900 text-sm font-medium">
                          {name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="mb-6">
                    <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-0.5 ml-1">
                      Interests
                    </Text>
                    <Text className="text-xs text-zinc-400 mb-1.5 ml-1">
                      Type interests comma separated
                    </Text>
                    <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5">
                      <TextInput
                        value={interestsRaw}
                        onChangeText={setInterestsRaw}
                        placeholder="Matcha, Coffee, Run…"
                        placeholderTextColor="#A1A1AA"
                        className="flex-1 text-sm font-medium text-zinc-900"
                      />
                    </View>
                  </View>

                  {status === "already-member" && (
                    <Text className="text-amber-600 text-sm text-center mb-4">
                      You're already a member of this trip.
                    </Text>
                  )}

                  {status === "error" && (
                    <Text className="text-red-500 text-sm text-center mb-4">
                      Something went wrong. Please try again.
                    </Text>
                  )}

                  <Pressable
                    onPress={handleJoin}
                    disabled={status === "joining" || status === "already-member"}
                    className={`rounded-2xl py-4 items-center ${
                      status === "already-member" ? "bg-gray-300" : "bg-violet-600"
                    }`}
                  >
                    <Text className="text-white font-bold text-base">
                      {status === "joining" ? "Joining..." : "Join Trip"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text className="text-2xl font-extrabold text-zinc-900 text-center mt-1 mb-2">
                    Join a Trip
                  </Text>
                  <Text className="text-gray-500 text-base text-center leading-6 mb-8">
                    Enter the unique invitation code sent{"\n"}by trip members.
                  </Text>

                  <TextInput
                    value={code}
                    onChangeText={handleChangeText}
                    placeholder="e.g. NYC-4X9K"
                    placeholderTextColor="#D1D5DB"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    className="bg-gray-100 rounded-xl px-4 py-4 text-zinc-900 text-lg font-semibold tracking-widest text-center border border-gray-200 mb-4"
                  />

                  {status === "error" && (
                    <Text className="text-red-500 text-sm text-center mb-4">
                      No trip found with that code. Please check and try again.
                    </Text>
                  )}

                  <Pressable
                    onPress={handleSearch}
                    disabled={!code.trim() || status === "searching"}
                    className={`rounded-2xl py-4 items-center ${
                      code.trim() ? "bg-violet-600" : "bg-violet-300"
                    }`}
                  >
                    <Text className="text-white font-bold text-base">
                      {status === "searching" ? "Searching..." : "Find Trip"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}