import { ScrollView, View } from "react-native";

import ActivityCard, { Activity } from "./ActivityCard";
import { AddActivityButton } from "./AddActivityButton";
import { CommuteConnector } from "./CommuteConnector";
import type { StopModel } from "@/src/models";

interface Props {
  activities: Activity[];
  stopsForDay: StopModel[];
  /** Called with the index to insert after (-1 = prepend, 0 = after first, …) */
  onAddActivity?: (afterIndex: number) => void;
  onRemove?: (id: string) => void;
}

/**
 * Reusable edit-mode activity list.
 * Renders "Add Activity" buttons before every card and after the last one,
 * with commute connectors between cards.
 * Does NOT include the Cancel / title / Done header — callers own that.
 */
export function EditableItineraryList({
  activities,
  stopsForDay,
  onAddActivity,
  onRemove,
}: Props) {
  if (activities.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}>
        <AddActivityButton onPress={() => onAddActivity?.(-1)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}>
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;

        return (
          <View key={activity.id}>
            {/* Insert button above this card (before index 0 = prepend) */}
            <AddActivityButton onPress={() => onAddActivity?.(index - 1)} />

            <ActivityCard
              activity={activity}
              onRemove={onRemove}
            />

            {/* Commute connector between cards */}
            {!isLast && stopsForDay[index]?.travelMode && (
              <CommuteConnector
                minutes={stopsForDay[index].travelMinutes}
                mode={stopsForDay[index].travelMode as any}
              />
            )}
          </View>
        );
      })}

      {/* Insert button after the last card */}
      <AddActivityButton onPress={() => onAddActivity?.(activities.length - 1)} />
    </ScrollView>
  );
}
