import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";

const STOPS = [
  { id: "bixby",    coordinate: { latitude: 36.3719, longitude: -121.9019 }, title: "Bixby Bridge" },
  { id: "nepenthe", coordinate: { latitude: 36.2556, longitude: -121.7783 }, title: "Nepenthe" },
  { id: "pfeiffer", coordinate: { latitude: 36.2394, longitude: -121.8169 }, title: "Pfeiffer Beach" },
  { id: "mcway",    coordinate: { latitude: 36.1577, longitude: -121.6692 }, title: "McWay Falls" },
];

const ROUTE_COORDS = STOPS.map((s) => s.coordinate);

const TABS = [
  { label: "Overview",  seg: "overview"  },
  { label: "Itinerary", seg: "itinerary" },
  { label: "Explore",   seg: "explore"   },
] as const;

type TabSeg = (typeof TABS)[number]["seg"];

export default function ItineraryLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const activeSeg = pathname.split("/").pop() as TabSeg | string;

  // Redirect bare /itinerary to /itinerary/overview
  useEffect(() => {
    const validSegs: string[] = ["overview", "itinerary", "explore"];
    if (!validSegs.includes(activeSeg ?? "")) {
      router.replace("/(tabs)/itinerary/overview" as never);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-1 pb-2">
        <View>
          <Text className="text-2xl font-bold text-gray-900">SoCal Road Trip 🌴</Text>
          <Text className="text-sm text-gray-400 mt-0.5">March 21–25, 2025</Text>
        </View>
      </View>

      {/* Map */}
      <MapView
        style={{ height: 240 }}
        initialRegion={{
          latitude: 36.27,
          longitude: -121.77,
          latitudeDelta: 0.55,
          longitudeDelta: 0.55,
        }}
        mapType="standard"
        showsUserLocation={false}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        <Polyline
          coordinates={ROUTE_COORDS}
          strokeColor="#7C3AED"
          strokeWidth={3}
          lineDashPattern={[8, 4]}
        />
        {STOPS.map((stop, index) => (
          <Marker key={stop.id} coordinate={stop.coordinate} title={stop.title}>
            <View
              className="bg-violet-600 w-7 h-7 rounded-full items-center justify-center border-2 border-white"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 4,
              }}
            >
              <Text className="text-white text-xs font-bold">{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Active tab content */}
      <View className="flex-1">
        <Slot />
      </View>

      {/* 3-Tab toggle */}
      <View className="bg-white border-t border-gray-100 px-4 pt-3 pb-4">
        <View className="flex-row bg-gray-100 rounded-full p-1">
          {TABS.map((tab) => {
            const isActive = activeSeg === tab.seg;
            return (
              <TouchableOpacity
                key={tab.seg}
                onPress={() =>
                  router.replace(`/(tabs)/itinerary/${tab.seg}` as never)
                }
                className={`flex-1 py-2 items-center rounded-full ${
                  isActive ? "bg-violet-600" : ""
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? "text-white" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
