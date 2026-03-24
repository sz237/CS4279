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
import { useTrips } from "@/context/TripsContext";
import { useStops } from "@/hooks/useStops";

function formatDateRange(start: string, end: string): string {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

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

  const { trips, selectedTripId } = useTrips();
  const trip = trips.find((t) => t.id === selectedTripId) ?? null;
  const { stops } = useStops(selectedTripId);

  const mapStops = stops.map((s) => ({
    id: s.id,
    coordinate: { latitude: s.lat, longitude: s.lng },
    title: s.name,
  }));
  const routeCoords = mapStops.map((s) => s.coordinate);

  // Compute map center from stops mean, fall back to a default
  const mapCenter = stops.length > 0
    ? {
        latitude: stops.reduce((sum, s) => sum + s.lat, 0) / stops.length,
        longitude: stops.reduce((sum, s) => sum + s.lng, 0) / stops.length,
      }
    : { latitude: 40.7580, longitude: -73.9855 };

  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Minimum map height: the larger of 256 px or 1/3 of the screen
  const MAP_MIN = Math.max(180, Math.floor(SCREEN_HEIGHT / 5));

  // containerHeight: total pixels available for map + sheet combined
  // (measured once the layout settles; falls back to a percentage until then)
  const [containerHeight, setContainerHeight] = useState(0);

  // stickyHeaderHeight: reported by the active tab's sticky header via context
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(80);

  // tabBarHeight: measured from the pill tab bar rendered inside the sheet
  const [tabBarHeight, setTabBarHeight] = useState(68);

  // MAP_MAX: map can expand until the sheet shows exactly:
  //   drag handle + sticky header + tab bar (modal stops at the toggle line)
  const MAP_MAX =
    containerHeight > 0
      ? containerHeight - DRAG_HANDLE_HEIGHT - stickyHeaderHeight - tabBarHeight
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
          <Text className="text-2xl font-bold text-gray-900">
            {trip?.title ?? "Your Trip"}
          </Text>
          <Text className="text-sm text-gray-400 mt-0.5">
            {trip ? formatDateRange(trip.startDate, trip.endDate) : ""}
          </Text>
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
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}
            mapType="standard"
            showsUserLocation={false}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#7C3AED"
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            )}
            {mapStops.map((stop, index) => (
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
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -20 },
            shadowOpacity: 0.10,
            shadowRadius: 50,
            elevation: 20,
            overflow: "hidden",
          }}
        >
          {/* Drag handle */}
          <View
            {...panResponder.panHandlers}
            style={{
              alignItems: "center",
              paddingTop: 16,
              paddingBottom: 8,
              backgroundColor: "white",
            }}
          >
            <View
              style={{
                width: 48,
                height: 6,
                backgroundColor: "#E4E4E7",
                borderRadius: 3,
              }}
            />
          </View>

          {/* Tab content */}
          <ItinerarySheetContext.Provider value={{ reportStickyHeaderHeight }}>
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
          </ItinerarySheetContext.Provider>

          {/* ── Pill tab bar — inside the sheet ── */}
          <View
            style={{ paddingHorizontal: 24, paddingBottom: 20, paddingTop: 8 }}
            onLayout={(e) => setTabBarHeight(e.nativeEvent.layout.height)}
          >
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "rgba(244,244,245,0.95)",
                borderRadius: 999,
                padding: 4,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.5)",
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeSeg === tab.seg;
                return (
                  <TouchableOpacity
                    key={tab.seg}
                    onPress={() =>
                      router.replace(`/(tabs)/itinerary/${tab.seg}` as never)
                    }
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 999,
                      backgroundColor: isActive ? "#6D28D9" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: isActive ? "#FFFFFF" : "#71717A",
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
