import { TripDatePicker } from "@/components/TripDatePicker";
import { updateItinerary } from "@/src/services/trips";
import type { ItineraryModel } from "@/src/models";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

type Props = {
  visible: boolean;
  trip: ItineraryModel;
  onClose: () => void;
};

export function EditTripModal({ visible, trip, onClose }: Props) {
  const [title, setTitle] = useState(trip.title);
  const [cityOrArea, setCityOrArea] = useState(trip.cityOrArea);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(trip.title);
    setCityOrArea(trip.cityOrArea);
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
  }, [trip.id]);

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await updateItinerary(trip.id, {
        title: title.trim(),
        cityOrArea: cityOrArea.trim(),
        startDate,
        endDate,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-end bg-black/40">
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <ScrollView
                className="bg-white rounded-t-3xl"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Handle */}
                <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />

                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-bold text-zinc-900">Edit Trip</Text>
                  <Pressable onPress={onClose}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </Pressable>
                </View>

                {/* Trip Name */}
                <View className="mb-4">
                  <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                    Trip Name
                  </Text>
                  <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5 gap-2">
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. NYC Spring Break"
                      placeholderTextColor="#A1A1AA"
                      className="flex-1 text-sm font-medium text-zinc-900"
                    />
                  </View>
                </View>

                {/* Destination */}
                <View className="mb-4">
                  <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                    Destination
                  </Text>
                  <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5 gap-2">
                    <Ionicons name="location-outline" size={16} color="#6D28D9" />
                    <TextInput
                      value={cityOrArea}
                      onChangeText={setCityOrArea}
                      placeholder="City, State, or Area"
                      placeholderTextColor="#A1A1AA"
                      className="flex-1 text-sm font-medium text-zinc-900"
                    />
                  </View>
                </View>

                {/* Dates */}
                <View className="mb-6">
                  <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
                    Dates
                  </Text>
                  <Pressable
                    className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5 gap-2"
                    onPress={() => setDatePickerVisible(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#6D28D9" />
                    <Text className="flex-1 text-sm font-medium text-zinc-900">
                      {formatDateRange(startDate, endDate)}
                    </Text>
                  </Pressable>
                </View>

                {/* Save */}
                <Pressable
                  onPress={handleSave}
                  disabled={!title.trim() || saving}
                  className={`rounded-2xl py-4 items-center ${title.trim() ? "bg-violet-600" : "bg-violet-300"}`}
                >
                  <Text className="text-white font-semibold text-base">
                    {saving ? "Saving…" : "Save Changes"}
                  </Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TripDatePicker
        visible={datePickerVisible}
        initialDeparture={new Date(startDate + "T00:00:00")}
        initialReturn={new Date(endDate + "T00:00:00")}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(departure, returnDate) => {
          setStartDate(departure.toISOString().slice(0, 10));
          setEndDate((returnDate ?? departure).toISOString().slice(0, 10));
          setDatePickerVisible(false);
        }}
      />
    </>
  );
}
