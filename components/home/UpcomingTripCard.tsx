import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Image, ImageSourcePropType, Pressable, Text, View } from "react-native";

type Props = {
  imageSource: ImageSourcePropType;
  city: string;
  dateRange: string;
  onPress?: () => void;
  onChangeImage?: (uri: string) => Promise<void> | void;
};

export function UpcomingTripCard({
  imageSource,
  city,
  dateRange,
  onPress,
  onChangeImage,
}: Props) {
  const [image, setImage] = useState(imageSource);

  useEffect(() => {
    setImage(imageSource);
  }, [imageSource]);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("Permission required to access photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      setImage({ uri }); // instant local preview
      await onChangeImage?.(uri); // let parent save to Firebase
    }
  };

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
      <View>
        <Image
          source={image}
          className="w-full"
          style={{ height: 192 }}
          resizeMode="cover"
        />

        <Pressable
          onPress={pickImage}
          className="absolute bottom-3 right-3 bg-black/60 px-3 py-1.5 rounded-full"
        >
          <Text className="text-white text-xs font-medium">Change Photo</Text>
        </Pressable>
      </View>

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