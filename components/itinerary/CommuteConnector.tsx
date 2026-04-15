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
  mode?: TravelMode | null;
};

function VerticalLine() {
  return <View className="w-[1.5px] h-6 bg-violet-400/50 self-center" />;
}

export function CommuteConnector({ minutes, mode }: Props) {
  const cfg = mode
    ? MODE_CONFIG[mode]
    : { icon: "ellipsis-horizontal" as const, label: "" };

  const timeText =
    minutes != null
      ? `${minutes} min${cfg.label ? ` ${cfg.label}` : ""}`
      : `-- min${cfg.label ? ` ${cfg.label}` : ""}`;

  return (
    <View className="items-center my-0.5">
      <VerticalLine />
      <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 rounded-full border border-slate-200/50">
        <Ionicons name={cfg.icon} size={12} color="#6B7280" />
        <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          {timeText}
        </Text>
      </View>
      <VerticalLine />
    </View>
  );
}
