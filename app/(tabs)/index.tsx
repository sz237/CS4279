import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 text-base font-bold text-gray-900">{title}</Text>
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
      <Text className="mt-1 text-sm font-semibold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-400">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-5 text-3xl font-bold text-gray-900">
        Welcome Home
      </Text>

      <View className="mb-5">
        <SectionHeader title="Current Trip" />
        <View
          className="rounded-2xl bg-white p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row">
            <InfoChip icon="location-outline" value="SoCal" label="Trip" />
            <View className="w-px bg-gray-100" />
            <InfoChip icon="calendar-outline" value="Mar 21–25" label="Dates" />
            <View className="w-px bg-gray-100" />
            <InfoChip icon="people-outline" value="4" label="Travelers" />
            <View className="w-px bg-gray-100" />
            <InfoChip icon="time-outline" value="5 days" label="Duration" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
