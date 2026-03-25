import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import ActivityCard, { Activity } from "./ActivityCard";
import { AddActivityButton } from "./AddActivityButton";

interface Props {
  activities: Activity[];
  onAddActivity?: (timeSlot: string) => void;
  onRemove?: (id: string) => void;
  onReorder?: (newOrder: Activity[]) => void;
  onTimeChange?: (id: string, newTime: string) => void;
}

type FlatItem =
  | { kind: "header"; slot: string; label: string; prevSlot: string | null }
  | { kind: "activity"; activity: Activity };

const SLOTS = [
  { slot: "morning",   label: "Morning",   icon: "sunny-outline" },
  { slot: "noon",      label: "Noon",      icon: "partly-sunny-outline" },
  { slot: "afternoon", label: "Afternoon", icon: "cloud-outline" },
  { slot: "evening",   label: "Evening",   icon: "moon-outline" },
] as const;

export function EditableItineraryList({
  activities,
  onAddActivity,
  onRemove,
  onReorder,
  onTimeChange,
}: Props) {
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  const flatData = useMemo<FlatItem[]>(() => {
    const knownSlots = new Set<string>(SLOTS.map((s) => s.slot));
    const items: FlatItem[] = [];

    SLOTS.forEach(({ slot, label }, i) => {
      items.push({ kind: "header", slot, label, prevSlot: i > 0 ? SLOTS[i - 1].slot : null });
      for (const activity of activities) {
        if ((activity.time?.toLowerCase() ?? "") === slot) {
          items.push({ kind: "activity", activity });
        }
      }
    });

    // Activities with unrecognised time fall at the bottom
    for (const activity of activities) {
      if (!knownSlots.has(activity.time?.toLowerCase() ?? "")) {
        items.push({ kind: "activity", activity });
      }
    }
    return items;
  }, [activities]);

  const handleDragEnd = useCallback(
    ({ data }: { data: FlatItem[] }) => {
      let currentSlot: string = SLOTS[0].slot;
      const newOrder: Activity[] = [];
      for (const item of data) {
        if (item.kind === "header") {
          currentSlot = item.slot;
        } else {
          newOrder.push({ ...item.activity, time: currentSlot });
        }
      }
      onReorder?.(newOrder);
    },
    [onReorder]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<FlatItem>) => {
      if (item.kind === "header") {
        return (
          <View>
            {/* Add button for the previous section sits just above this header */}
            {item.prevSlot && (
              <AddActivityButton onPress={() => onAddActivity?.(item.prevSlot!)} />
            )}
            <View className="px-5 pt-3 pb-1 flex-row items-center gap-3">
              <Text className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {item.label}
              </Text>
              <View className="flex-1 h-px bg-zinc-200" />
            </View>
          </View>
        );
      }

      return (
        <ScaleDecorator>
          <View className="mb-2">
            <ActivityCard
              activity={item.activity}
              drag={drag}
              isActive={isActive}
              onRemove={onRemove}
              onEditTime={onTimeChange ? (id) => setPendingEditId(id) : undefined}
            />
          </View>
        </ScaleDecorator>
      );
    },
    [onRemove, onTimeChange, onAddActivity]
  );

  return (
    <>
      <DraggableFlatList
        data={flatData}
        keyExtractor={(item) =>
          item.kind === "header" ? `header-${item.slot}` : item.activity.id
        }
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
        ListFooterComponent={
          // Add button for the last section (Evening)
          <AddActivityButton
            onPress={() => onAddActivity?.(SLOTS[SLOTS.length - 1].slot)}
          />
        }
      />

      {/* Edit time modal */}
      <Modal
        visible={pendingEditId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingEditId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setPendingEditId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
              <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />
              <Text className="text-lg font-bold text-zinc-900 mb-5">When is this activity?</Text>

              {SLOTS.map(({ slot, label, icon }) => (
                <TouchableOpacity
                  key={slot}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (pendingEditId) {
                      onTimeChange?.(pendingEditId, slot);
                      setPendingEditId(null);
                    }
                  }}
                  className="flex-row items-center gap-4 py-3.5 border-b border-gray-100"
                >
                  <View className="w-9 h-9 rounded-full bg-violet-50 items-center justify-center">
                    <Ionicons name={icon as any} size={18} color="#7C3AED" />
                  </View>
                  <Text className="flex-1 text-base font-semibold text-zinc-900">{label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setPendingEditId(null)}
                activeOpacity={0.7}
                className="mt-4 py-3 items-center"
              >
                <Text className="text-sm font-semibold text-gray-400">Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
