import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  cityOrArea: string;
  setCityOrArea: (v: string) => void;
  radiusMiles: string;
  setRadiusMiles: (v: string) => void;
  startDate: string;
  endDate: string;
  onOpenDatePicker: () => void;
  interestsRaw: string;
  setInterestsRaw: (v: string) => void;
  formatDateRange: (s: string, e: string) => string;
  onListPress: () => void;
  onAiPress: () => void;
  listBusy: boolean;
  aiBusy: boolean;
  showTitle?: boolean;
};

export function TripForm({
  cityOrArea, setCityOrArea,
  radiusMiles, setRadiusMiles,
  startDate, endDate, onOpenDatePicker,
  interestsRaw, setInterestsRaw,
  formatDateRange,
  onListPress, onAiPress,
  listBusy, aiBusy,
  showTitle = false,
}: Props) {
  return (
    <View className={`bg-white px-6 pb-7 ${showTitle ? "" : "pt-6"}`}>
      {showTitle && (
        <Text className="text-2xl font-semibold text-zinc-900 mb-6 mt-6">
          Create Itinerary
        </Text>
      )}

      {/* DESTINATION */}
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

      {/* DATES */}
      <View className="mb-4">
        <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
          Dates
        </Text>
        <Pressable
          className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5 gap-2"
          onPress={onOpenDatePicker}
        >
          <Ionicons name="calendar-outline" size={16} color="#6D28D9" />
          <Text className={`flex-1 text-sm font-medium ${startDate ? "text-zinc-900" : "text-zinc-400"}`}>
            {startDate ? formatDateRange(startDate, endDate) : "Select dates"}
          </Text>
        </Pressable>
      </View>

      {/* RADIUS */}
      <View className="mb-4">
        <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
          Radius
        </Text>
        <View className="flex-row items-center bg-zinc-100 rounded-[10px] border border-zinc-300/30 px-3 py-2.5">
          <TextInput
            value={radiusMiles}
            onChangeText={setRadiusMiles}
            placeholder="mi"
            placeholderTextColor="#A1A1AA"
            keyboardType="numeric"
            className="flex-1 text-sm font-medium text-zinc-900"
          />
        </View>
      </View>

      {/* INTERESTS */}
      <View className="mb-6">
        <Text className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.8px] mb-1.5 ml-1">
          Interests
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

      {/* Action buttons */}
      <View className="border-t border-gray-200 pt-5 flex-row gap-2.5">
        <Pressable
          onPress={onListPress}
          disabled={listBusy}
          className={`flex-1 border border-gray-400 rounded-xl py-2.5 items-center justify-center ${listBusy ? "opacity-50" : ""}`}
        >
          <Text className="text-sm font-bold text-neutral-600">List of places</Text>
        </Pressable>

        <Pressable
          onPress={onAiPress}
          disabled={aiBusy}
          className={`flex-1 border border-violet-700 bg-violet-700 rounded-xl py-2.5 items-center justify-center ${aiBusy ? "opacity-50" : ""}`}
        >
          <Text className="text-sm font-bold text-white">Create Itinerary</Text>
        </Pressable>
      </View>
    </View>
  );
}
