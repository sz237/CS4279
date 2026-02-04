import { signOut } from "firebase/auth";
import { Alert, Pressable, Text, View } from "react-native";
import { auth } from "../../src/config/firebase";

export default function SettingsScreen() {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert("Error Signing Out", error.message);
    }
  };

  return (
    <View className="flex-1 justify-center bg-white px-5">
      <Text className="mb-10 text-center text-3xl font-bold">Settings</Text>

      <View className="mb-5 rounded-xl bg-neutral-100 p-4">
        <Text className="text-sm text-neutral-800">
          User ID: {auth.currentUser?.uid ?? "Unknown"}
        </Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        className="items-center rounded-xl bg-red-500 px-4 py-3"
      >
        <Text className="text-base font-semibold text-white">Sign Out</Text>
      </Pressable>
    </View>
  );
}
