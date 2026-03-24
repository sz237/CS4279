import { Image, ImageSourcePropType, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  imageSource: ImageSourcePropType;
  tripName: string;
  dates: string;
  travelers: number;
  days: number;
  onPress?: () => void;
};

export function CurrentTripCard({ imageSource, tripName, dates, travelers, days, onPress }: Props) {
  return (
    <Pressable onPress={onPress}
      className="w-full rounded-[32px] overflow-hidden"
      style={{
        height: 288,
        shadowColor: "#191C1D",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 8,
      }}
    >
      <Image source={imageSource} className="absolute inset-0 w-full h-full" resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <View className="absolute left-8 bottom-8 gap-2">
        {/* Badge */}
        <View
          className="self-start px-3 py-1 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <Text className="text-white text-xs font-bold uppercase tracking-widest">
            Current Trip
          </Text>
        </View>
        {/* Trip name */}
        <Text className="text-white text-4xl font-extrabold leading-10">{tripName}</Text>
        {/* Meta */}
        <Text style={{ color: "rgba(255,255,255,0.8)" }} className="text-base font-medium">
          {dates} • {travelers} Travelers • {days} Days
        </Text>
      </View>
    </Pressable>
  );
}
