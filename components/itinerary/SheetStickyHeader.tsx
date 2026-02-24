import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DayTabs, { Day } from "./DayTabs";
import { useItinerarySheet } from "@/lib/ItinerarySheetContext";

interface SheetStickyHeaderProps {
  days: Day[];
  selectedDayId: string;
  onSelectDay: (id: string) => void;
}

/**
 * Sticky header section of the itinerary sheet.
 * Contains the day-tab selector and the drag-reorder hint.
 * Reports its rendered height to the parent layout via ItinerarySheetContext
 * so the layout can constrain how far the map may expand.
 */
export default function SheetStickyHeader({
  days,
  selectedDayId,
  onSelectDay,
}: SheetStickyHeaderProps) {
  const { reportStickyHeaderHeight } = useItinerarySheet();

  return (
    <View
      style={{ backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}
      onLayout={(e) => reportStickyHeaderHeight(e.nativeEvent.layout.height)}
    >
      {/* Day tabs — 8px vertical padding on each side */}
      <View style={{ paddingVertical: 8 }}>
        <DayTabs
          days={days}
          selectedDayId={selectedDayId}
          onSelectDay={onSelectDay}
        />
      </View>

      {/* Drag-reorder hint — 8px bottom padding */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
      
      </View>
    </View>
  );
}
