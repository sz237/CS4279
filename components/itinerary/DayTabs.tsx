import React from "react";
import { ScrollView, TouchableOpacity, Text } from "react-native";

export interface Day {
  id: string;
  label: string;
  dateLabel: string;
}

interface DayTabsProps {
  days: Day[];
  selectedDayId: string;
  onSelectDay: (id: string) => void;
}

export default function DayTabs({ days, selectedDayId, onSelectDay }: DayTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-3"
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {days.map((day) => {
        const isSelected = day.id === selectedDayId;
        return (
          <TouchableOpacity
            key={day.id}
            onPress={() => onSelectDay(day.id)}
            activeOpacity={0.8}
            className={`px-5 py-2.5 rounded-full border ${
              isSelected
                ? "bg-violet-600 border-violet-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                isSelected ? "text-white" : "text-gray-500"
              }`}
            >
              {day.label}, {day.dateLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}