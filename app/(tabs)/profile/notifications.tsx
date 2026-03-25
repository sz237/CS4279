import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";

const STORAGE_KEY = "nomad_profile_notification_settings_v1";

type NotificationPrefs = {
  tripChanges: boolean;
  followingTrips: boolean;
  popularItineraries: boolean;
};

function Row({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-4">
      <Ionicons name={icon} size={22} color="#94A3B8" />
      <View className="ml-3 flex-1">
        <Text className="text-lg font-medium text-gray-900">{title}</Text>
        <Text className="text-sm text-slate-500">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#CBD5E1", true: "#0F172A" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    tripChanges: true,
    followingTrips: true,
    popularItineraries: false,
  });

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPrefs(JSON.parse(raw));
      }
    })();
  }, []);

  const updatePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20 }}>
      <View
        className="rounded-2xl border border-gray-200 bg-white p-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Row
          icon="swap-horizontal-outline"
          title="Current trip changes"
          subtitle="Be notified when a trip you are in gets updated"
          value={prefs.tripChanges}
          onChange={(value) => updatePrefs({ ...prefs, tripChanges: value })}
        />
        <View className="h-px bg-gray-100" />
        <Row
          icon="people-outline"
          title="Trips from people I follow"
          subtitle="Get notified when followed users create a new trip"
          value={prefs.followingTrips}
          onChange={(value) => updatePrefs({ ...prefs, followingTrips: value })}
        />
        <View className="h-px bg-gray-100" />
        <Row
          icon="compass-outline"
          title="Popular itineraries"
          subtitle="Discover trending itineraries created by other users"
          value={prefs.popularItineraries}
          onChange={(value) =>
            updatePrefs({ ...prefs, popularItineraries: value })
          }
        />
      </View>

      <Text className="mt-4 text-sm text-slate-500">
        Toggles currently stored locally.
      </Text>
    </ScrollView>
  );
}