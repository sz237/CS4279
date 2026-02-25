import { Slot, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItinerarySheetContext } from "@/lib/ItinerarySheetContext";

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

// Height of the drag-handle pill area (paddingTop 10 + pill 4 + paddingBottom 8)
const DRAG_HANDLE_HEIGHT = 22;

export default function ItineraryLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const activeSeg = pathname.split("/").pop() as TabSeg | string;

  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Minimum map height: the larger of 256 px or 1/3 of the screen
  const MAP_MIN = Math.max(180, Math.floor(SCREEN_HEIGHT / 5));

  // containerHeight: total pixels available for map + sheet combined
  // (measured once the layout settles; falls back to a percentage until then)
  const [containerHeight, setContainerHeight] = useState(0);

  // stickyHeaderHeight: reported by SheetStickyHeader via context
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(80);

  // MAP_MAX: map can expand until the sheet shows exactly the drag handle + sticky header
  const MAP_MAX =
    containerHeight > 0
      ? containerHeight - DRAG_HANDLE_HEIGHT - stickyHeaderHeight
      : Math.floor(SCREEN_HEIGHT * 0.62);

  // Keep refs in sync so the PanResponder closure always uses the latest values
  const mapMinRef = useRef(MAP_MIN);
  const mapMaxRef = useRef(MAP_MAX);
  mapMinRef.current = MAP_MIN;
  mapMaxRef.current = MAP_MAX;

  const [mapHeightAnim] = useState(() => new Animated.Value(MAP_MIN));
  const currentMapHeight = useRef(MAP_MIN);

  // Called by SheetStickyHeader after it measures its own height
  const reportStickyHeaderHeight = useCallback((h: number) => {
    setStickyHeaderHeight(h);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      // Don't capture taps; only intentional vertical drags on the handle
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (_, { dy }) => {
        // dy > 0 = dragging down = map expands; dy < 0 = dragging up = map contracts
        const next = Math.min(
          Math.max(currentMapHeight.current + dy, mapMinRef.current),
          mapMaxRef.current
        );
        mapHeightAnim.setValue(next);
      },
      onPanResponderRelease: (_, { dy }) => {
        const next = Math.min(
          Math.max(currentMapHeight.current + dy, mapMinRef.current),
          mapMaxRef.current
        );
        currentMapHeight.current = next;
        Animated.spring(mapHeightAnim, {
          toValue: next,
          useNativeDriver: false,
          damping: 20,
          stiffness: 180,
        }).start();
      },
    })
  ).current;

  // Redirect bare /itinerary → /itinerary/overview
  useEffect(() => {
    const validSegs: string[] = ["overview", "activities", "explore"];
    if (!validSegs.includes(activeSeg ?? "")) {
      router.replace("/(tabs)/itinerary/overview" as never);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Trip header ─────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 pt-1 pb-2">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Big Apple Vacay 🍎</Text>
          <Text className="text-sm text-gray-400 mt-0.5">March 21–25, 2025</Text>
        </View>
      </View>

      {/* ── Map + Sheet container (measured to derive MAP_MAX) ───────── */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {/* Animated map — height driven by the animated value */}
        <Animated.View style={{ height: mapHeightAnim, overflow: "hidden" }}>
          <MapView
            style={{ flex: 1 }}
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
        </Animated.View>

        {/* ── Draggable bottom sheet ───────────────────────────────── */}
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 10,
            overflow: "hidden",
          }}
        >
          {/* Drag handle — the only touch target for the pan gesture */}
          <View
            {...panResponder.panHandlers}
            style={{
              alignItems: "center",
              paddingTop: 10,
              paddingBottom: 8,
              backgroundColor: "white",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#D1D5DB",
                borderRadius: 2,
              }}
            />
          </View>

          {/* Tab content — context lets child routes report their header height */}
          <ItinerarySheetContext.Provider value={{ reportStickyHeaderHeight }}>
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
          </ItinerarySheetContext.Provider>
        </View>
      </View>

      {/* ── Bottom 3-tab navigation ──────────────────────────────────── */}
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
