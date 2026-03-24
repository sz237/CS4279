import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, Pressable, Text, View } from "react-native";

type Props = {
  imageSource: ImageSourcePropType;
  location: string;
  placeName: string;
  onExplore?: () => void;
};

export function DiscoverCard({ imageSource, location, placeName, onExplore }: Props) {
  return (
    <View
      className="w-full rounded-[32px] overflow-hidden"
      style={{
        height: 320,
        shadowColor: "#191C1D",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 8,
      }}
    >
      <Image source={imageSource} className="absolute inset-0 w-full h-full" resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <View className="absolute left-8 bottom-10 gap-2">
        <Text
          className="text-xs font-bold uppercase tracking-[2.4px]"
          style={{ color: "#E9D5FF" }}
        >
          {location}
        </Text>
        <Text className="text-white text-3xl font-extrabold leading-9 pb-2">{placeName}</Text>
        <Pressable
          onPress={onExplore}
          className="self-start bg-white px-6 py-2 rounded-full"
        >
          <Text className="text-zinc-900 text-sm font-bold">Explore Itineraries</Text>
        </Pressable>
      </View>
    </View>
  );
}
