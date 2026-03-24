import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { AddTripProvider } from "@/context/AddTripContext";
import { TripsProvider } from "@/context/TripsContext";

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <TripsProvider>
    <AddTripProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#FFFFFF" : "#18181B",
        tabBarInactiveTintColor: isDark ? "#6B7280" : "#9CA3AF",
        tabBarStyle: {
          backgroundColor: isDark ? "#0F0F0F" : "#FFFFFF",
          borderTopColor: isDark ? "#27272A" : "#F3F4F6",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <Ionicons name="search-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="aichat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="addTrip"
        options={{
          title: "Add Trip",
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: "Itinerary",
          headerShown: false,
          href: "/(tabs)/itinerary/overview" as any,
          tabBarIcon: ({ color }) => (
            <Ionicons name="map-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="serpapi"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="googleplaces"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </AddTripProvider>
    </TripsProvider>
  );
}
