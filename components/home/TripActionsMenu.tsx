import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Separator } from "@/components/ui/separator";

type Props = {
  onJoinTrip?: () => void;
  onCreateTrip?: () => void;
};

export function TripActionsMenu({ onJoinTrip, onCreateTrip }: Props) {
  return (
    <View className="mt-8 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Join a Trip */}
      <Pressable
        onPress={onJoinTrip}
        className="flex-row items-center justify-between px-5 py-4 active:bg-gray-50"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="person-add-outline" size={20} color="#18181B" />
          <Text className="text-zinc-900 text-base font-medium">Join a Trip</Text>
        </View>
        <Text className="text-violet-700 text-xs font-bold tracking-widest uppercase">
          Enter Code
        </Text>
      </Pressable>

      <Separator className="mx-5" />

      {/* Create a Trip */}
      <Pressable
        onPress={onCreateTrip}
        className="flex-row items-center justify-between px-5 py-4 active:bg-gray-50"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="add" size={20} color="#18181B" />
          <Text className="text-zinc-900 text-base font-medium">Create a Trip</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
      </Pressable>
    </View>
  );
}
