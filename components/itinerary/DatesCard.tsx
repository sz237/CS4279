import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  dateRange: string;
  onEdit?: () => void;
};

export function DatesCard({ dateRange, onEdit }: Props) {
  return (
    <View
      style={{
        backgroundColor: "#F4F4F5",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(244,244,245,0.5)",
      }}
    >
      {/* Label row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Ionicons name="calendar-outline" size={14} color="#6D28D9" />
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: "#A1A1AA",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Dates
        </Text>
      </View>

      {/* Value + edit button */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181B" }}>{dateRange}</Text>

        {onEdit && (
          <Pressable
            onPress={onEdit}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
            accessibilityLabel="Edit dates"
          >
            <Ionicons name="pencil-outline" size={10} color="#6D28D9" />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#6D28D9",
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Edit
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
