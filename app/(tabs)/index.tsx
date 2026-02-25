import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

type Friend = {
  id: string;
  name: string;
  handle: string;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 text-base font-bold text-gray-900">{title}</Text>
  );
}

function InfoChip({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Ionicons name={icon} size={18} color="#7C3AED" />
      <Text className="mt-1 text-sm font-semibold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-400">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const friends: Friend[] = useMemo(
    () => [
      { id: "1", name: "Avery Kim", handle: "@averyk" },
      { id: "2", name: "Jordan Lee", handle: "@jordytravels" },
      { id: "3", name: "Maya Patel", handle: "@mayagoes" },
      { id: "4", name: "Noah Brooks", handle: "@nbskies" },
      { id: "5", name: "Sofia Rivera", handle: "@sofiarv" },
    ],
    []
  );

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((friendId) => friendId !== id) : [...prev, id]
    );
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-5 text-3xl font-bold text-gray-900">
          Welcome Home
        </Text>

      <View className="mb-5">
        <SectionHeader title="Current Trip" />
        <View
          className="rounded-2xl bg-white p-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row">
            <InfoChip icon="location-outline" value="SoCal" label="Trip" />
            <View className="w-px bg-gray-100" />
            <InfoChip icon="calendar-outline" value="Mar 21–25" label="Dates" />
            <View className="w-px bg-gray-100" />
            <InfoChip icon="people-outline" value="4" label="Travelers" />
            <View className="w-px bg-gray-100" />
            <InfoChip icon="time-outline" value="5 days" label="Duration" />
          </View>
        </View>
      </View>

        {/* Upcoming Trips */}
        <View className="mb-5">
          <SectionHeader title="Upcoming Trips" />
          <View
            className="mb-4 bg-white rounded-2xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="location-outline" size={18} color="#7C3AED" />
              <Text className="text-base font-semibold text-gray-900">
                Austin, TX
              </Text>
            </View>
            <Text className="text-sm text-gray-500 mt-1">April 15-18, 2026</Text>
          </View>

          <View
            className="bg-white rounded-2xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="location-outline" size={18} color="#7C3AED" />
              <Text className="text-base font-semibold text-gray-900">
                Boston, MA
              </Text>
            </View>
            <Text className="text-sm text-gray-500 mt-1">May 9-19, 2026</Text>
          </View>
        </View>

        {/* Discover New Places */}
        <View className="mb-5">
          <SectionHeader title="Discover New Places" />
          <View
            className="mb-4 bg-white rounded-2xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text className="text-base font-semibold text-gray-900">
                Golden Gate Park
              </Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="location-outline" size={15} color="#7C3AED" />
              <Text className="text-sm text-gray-500 mt-1">
                San Francisco, CA
              </Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="time-outline" size={15} color="#7C3AED" />
              <Text className="text-sm text-gray-500 mt-1">
                8:00 AM - 10:00 PM
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          className="rounded-2xl py-3 px-4 items-center bg-violet-600"
          onPress={() => setGroupModalVisible(true)}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-white text-base font-semibold">Create Group</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={groupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View
          className="flex-1 justify-end px-3 pb-3"
          style={{ backgroundColor: "rgba(17, 24, 39, 0.45)" }}
        >
          <View
            className="rounded-3xl bg-white px-4 pt-3 pb-4 border border-gray-200"
            style={{ maxHeight: "78%" }}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-lg font-bold text-gray-900">Create Group</Text>
              <Pressable onPress={() => setGroupModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            <Text className="text-sm text-gray-500 mb-3">
              Select friends to add to your travel group.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {friends.map((friend) => {
                const added = selectedFriendIds.includes(friend.id);

                return (
                  <View
                    key={friend.id}
                    className="mb-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-sm font-semibold text-gray-900">
                        {friend.name}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-0.5">
                        {friend.handle}
                      </Text>
                    </View>
                    <Pressable
                      className={`rounded-xl px-3 py-2 ${added ? "bg-gray-700" : "bg-violet-600"}`}
                      onPress={() => toggleFriend(friend.id)}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {added ? "Added" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm text-gray-500">
                {selectedFriendIds.length} selected
              </Text>
              <Pressable
                className="rounded-xl px-4 py-2 bg-violet-600"
                onPress={() => setGroupModalVisible(false)}
              >
                <Text className="text-white text-sm font-semibold">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
