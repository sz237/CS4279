import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type TravelMode = "walk" | "transit" | "drive";

const MODE_CONFIG: Record<TravelMode, {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}> = {
  walk:    { icon: "walk-outline",   label: "walk"    },
  transit: { icon: "subway-outline", label: "commute" },
  drive:   { icon: "car-outline",    label: "commute" },
};

type Props = {
  minutes?: number | null;
  mode: TravelMode;
};

function VerticalLine() {
  return <View className="w-[1.5px] h-6 bg-violet-400/50 self-center" />;
}

export function CommuteConnector({ minutes, mode }: Props) {
  const { icon, label } = MODE_CONFIG[mode];

  return (
    <View className="items-center my-0.5">
      <VerticalLine />
      <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 rounded-full border border-slate-200/50">
        <Ionicons name={icon} size={12} color="#6B7280" />
        <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          {minutes != null ? `${minutes} min ${label}` : `-- min ${label}`}
        </Text>
      </View>
      <VerticalLine />
    </View>
  );
}
