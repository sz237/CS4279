import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-base font-bold text-gray-900 mb-2">{title}</Text>
  );
}

function InfoChip({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Ionicons name={icon} size={18} color="#7C3AED" />
      <Text className="text-sm font-semibold text-gray-900 mt-1">{value}</Text>
      <Text className="text-xs text-gray-400">{label}</Text>
    </View>
  );
}

const GROUP_MEMBERS = [
  { initial: "J", bg: "bg-violet-100", text: "text-violet-700" },
  { initial: "S", bg: "bg-blue-100",   text: "text-blue-700"   },
  { initial: "C", bg: "bg-green-100",  text: "text-green-700"  },
];

export default function OverviewScreen() {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Trip Info Row */}
      <View
        className="bg-white rounded-2xl p-4 mb-5"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row">
          <InfoChip icon="calendar-outline" value="Mar 21–25" label="Dates" />
          <View className="w-px bg-gray-100" />
          <InfoChip icon="time-outline" value="5 days" label="Duration" />
          <View className="w-px bg-gray-100" />
          <InfoChip icon="car-outline" value="~420 mi" label="Distance" />
          <View className="w-px bg-gray-100" />
          <InfoChip icon="speedometer-outline" value="~7 hrs" label="Drive Time" />
        </View>
      </View>

      {/* Group Members */}
      <View className="mb-5">
        <SectionHeader title="Group Members" />
        <View className="flex-row items-center" style={{ gap: 10 }}>
          {GROUP_MEMBERS.map(({ initial, bg, text }) => (
            <View
              key={initial}
              className={`w-10 h-10 rounded-full items-center justify-center ${bg}`}
            >
              <Text className={`text-sm font-bold ${text}`}>{initial}</Text>
            </View>
          ))}
          <TouchableOpacity
            className="border border-dashed border-violet-400 rounded-full px-3 py-1.5"
            activeOpacity={0.7}
          >
            <Text className="text-xs text-violet-500 font-semibold">+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Accommodation */}
      <View className="mb-5">
        <SectionHeader title="Accommodation" />
        <View
          className="bg-white rounded-2xl p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons name="bed-outline" size={18} color="#7C3AED" />
            <Text className="text-base font-semibold text-gray-900">
              Glen Oaks Big Sur
            </Text>
          </View>
          <Text className="text-sm text-gray-500 mt-1">
            47080 CA-1, Big Sur, CA 93920
          </Text>
        </View>
      </View>

      {/* Shared Notes */}
      <View>
        <SectionHeader title="Shared Notes" />
        <View
          className="bg-white rounded-2xl p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-sm italic text-gray-300">
            No notes yet. Tap to add…
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
