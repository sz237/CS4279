import { SectionHeader } from "@/components/common/SectionHeader";
import { JoinTripModal } from "@/components/home/JoinTripModal";
import { TripActionsMenu } from "@/components/home/TripActionsMenu";
import { TripPreviewCard } from "@/components/trips/TripPreviewCard";
import { useTrips } from "@/context/TripsContext";
import type { ItineraryModel } from "@/src/models";
import { UI } from "@/src/theme/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, loading, selectTrip } = useTrips();
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const currentTrip = trips.find((t) => t.status === "current") ?? null;
  const upcomingTrips = trips.filter((t) => t.status === "upcoming");

  function openTrip(id: string) {
    selectTrip(id);
    router.push({
      pathname: "/(tabs)/itinerary/overview",
      params: { from: "home" },
    });
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: UI.colors.pageBg }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 16,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: UI.type.pageTitle,
          fontWeight: "800",
          color: UI.colors.textPrimary,
          marginBottom: 24,
        }}
      >
        Trips
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={UI.colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <>
          <TripActionsMenu
            onJoinTrip={() => setJoinModalVisible(true)}
            onCreateTrip={() => router.push("/(tabs)/addTrip" as never)}
          />

          {currentTrip ? (
            <View style={{ marginTop: UI.spacing.sectionGap }}>
              <SectionHeader title="Current Trip" />
              <TripPreviewCard
                trip={currentTrip}
                onPress={() => openTrip(currentTrip.id)}
              />
            </View>
          ) : null}

          {upcomingTrips.length > 0 ? (
            <View style={{ marginTop: UI.spacing.sectionGap }}>
              <SectionHeader title="Upcoming Trips" />
              {upcomingTrips.map((trip: ItineraryModel) => (
                <TripPreviewCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => openTrip(trip.id)}
                />
              ))}
            </View>
          ) : null}

          {trips.length === 0 ? (
            <View style={{ marginTop: 64, alignItems: "center" }}>
              <Text style={{ fontSize: UI.type.body, color: UI.colors.textMuted }}>
                No trips yet. Add one to get started!
              </Text>
            </View>
          ) : null}

          <JoinTripModal
            visible={joinModalVisible}
            onClose={() => setJoinModalVisible(false)}
            onJoined={(id) => {
              setJoinModalVisible(false);
              openTrip(id);
            }}
          />
        </>
      )}
    </ScrollView>
  );
}