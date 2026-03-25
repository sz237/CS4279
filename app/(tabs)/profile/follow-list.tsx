import {
    FollowListItem,
    getFakeFollowers,
    getFakeFollowing,
} from "@/src/services/profile";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function UserRow({ user }: { user: FollowListItem }) {
  const initials = initialsFromName(user.displayName || user.username || "U");

  return (
    <View className="flex-row items-center py-4">
      {user.photoURL ? (
        <Image
          source={{ uri: user.photoURL }}
          style={{ width: 56, height: 56, borderRadius: 28 }}
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-200">
          <Text className="text-lg font-medium text-slate-700">{initials}</Text>
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text className="text-lg font-medium text-gray-900">
          {user.displayName}
        </Text>
        <Text className="text-base text-slate-500">@{user.username}</Text>
      </View>
    </View>
  );
}

export default function FollowListScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type === "followers" ? "followers" : "following";

  const [items, setItems] = useState<FollowListItem[]>([]);

  useEffect(() => {
    setItems(type === "followers" ? getFakeFollowers() : getFakeFollowing());
  }, [type]);

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20 }}>
      <Text className="mb-4 text-2xl font-bold text-gray-900">
        {type === "followers" ? "Followers" : "Following"}
      </Text>

      <View
        className="rounded-2xl border border-gray-200 bg-white px-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {items.map((item, index) => (
          <View key={`${type}-${item.uid}`}>
            <UserRow user={item} />
            {index < items.length - 1 ? <View className="h-px bg-gray-100" /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}