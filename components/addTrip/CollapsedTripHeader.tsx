import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  destination: string;
  dateRange: string;
  onEdit: () => void;
}

function SummaryField({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
}) {
  return (
    <View className="gap-0.5">
      <Text className="text-[10px] font-bold uppercase tracking-widest text-[#494454]">
        {label}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon} size={12} color="#6B38D4" />
        <Text className="text-sm font-bold text-[#191C1D]">{value}</Text>
      </View>
    </View>
  );
}

export function CollapsedTripHeader({ destination, dateRange, onEdit }: Props) {
  return (
    <View
      style={{
        backgroundColor: "white",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E1E3E4",
        gap: 20,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "600", color: "#18181B" }}>
        Create Itinerary
      </Text>

      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-6">
          <SummaryField
            label="Destination"
            icon="location-outline"
            value={destination}
          />
          <SummaryField
            label="Dates"
            icon="calendar-outline"
            value={dateRange}
          />
        </View>

        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.8}
          className="w-10 h-10 rounded-full bg-[#E7E8E9] items-center justify-center"
        >
          <Ionicons name="pencil-outline" size={16} color="#494454" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
