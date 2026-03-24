import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  onPress: () => void;
}

export function AddActivityButton({ onPress }: Props) {
  return (
    <View className="items-center py-3">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        className="flex-row items-center gap-2 px-4 py-2 rounded-full border-2 border-slate-300"
      >
        <Ionicons name="add" size={12} color="#94A3B8" />
        <Text className="text-slate-400 text-xs font-bold">Add Activity</Text>
      </TouchableOpacity>
    </View>
  );
}
