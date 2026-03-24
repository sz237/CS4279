import { Ionicons } from "@expo/vector-icons";
import { Image, ImageSourcePropType, Pressable, Text, View } from "react-native";

type Props = {
  imageSource: ImageSourcePropType;
  city: string;
  dateRange: string;
  onPress?: () => void;
};

export function UpcomingTripCard({ imageSource, city, dateRange, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="w-full bg-white rounded-3xl overflow-hidden mb-4"
      style={{
        shadowColor: "#191C1D",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 6,
      }}
    >
      <Image source={imageSource} className="w-full" style={{ height: 192 }} resizeMode="cover" />
      <View className="px-6 py-5 flex-row justify-between items-center">
        <View>
          <Text className="text-zinc-900 text-xl font-bold">{city}</Text>
          <Text className="text-neutral-600 text-sm mt-0.5">{dateRange}</Text>
        </View>
        <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color="#18181B" />
        </View>
      </View>
    </Pressable>
  );
}
