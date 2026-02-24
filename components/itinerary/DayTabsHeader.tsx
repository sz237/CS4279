import React from "react";
import { View } from "react-native";
import DayTabs, { Day } from "./DayTabs";

type Props = {
  days: Day[];
  selectedDayId: string;
  onSelectDay: (id: string) => void;
};

export default function DayTabsHeader({ days, selectedDayId, onSelectDay }: Props) {
  return (
    <View className="bg-white py-4 border-b" style={{ borderBottomColor: "#E5E7EB" }}>
      <DayTabs days={days} selectedDayId={selectedDayId} onSelectDay={onSelectDay} />
    </View>
  );
}