import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  progress?: { done: number; total: number } | null;
};

export function PlanningOverlay({ progress }: Props) {
  return (
    <View className="absolute inset-0 bg-black/45 items-center justify-center">
      <View className="bg-white rounded-[28px] py-9 px-12 items-center gap-4 shadow-xl">
        <ActivityIndicator size="large" color="#6D28D9" />
        <Text className="text-[17px] font-bold text-zinc-900">
          Planning your trip…
        </Text>
        {progress && (
          <Text className="text-sm text-zinc-400">
            {progress.done} of {progress.total} stops
          </Text>
        )}
      </View>
    </View>
  );
}
