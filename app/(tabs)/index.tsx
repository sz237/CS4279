import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { auth } from "../../src/config/firebase";

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return unsubscribe;
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="mb-2.5 text-2xl font-bold">Welcome Home</Text>
      <Text className="text-base text-neutral-600">
        Logged in as: {user?.email ?? "Loading..."}
      </Text>
    </View>
  );
}
