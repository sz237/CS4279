import { SectionHeader } from "@/components/common/SectionHeader";
import { JoinTripModal } from "@/components/home/JoinTripModal";
import { TripActionsMenu } from "@/components/home/TripActionsMenu";
import { TripRecommendationBanner } from "@/components/home/TripRecommendationBanner";
import { TripPreviewCard } from "@/components/trips/TripPreviewCard";
import { useTrips } from "@/context/TripsContext";
import type { ItineraryModel } from "@/src/models";
import { getTripMetaMap } from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHOWN_RECOMMENDATIONS_KEY = "nomad_shown_recommendations_v1";

async function getShownRecommendations(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SHOWN_RECOMMENDATIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function markRecommendationShown(tripId: string): Promise<void> {
  const shown = await getShownRecommendations();
  if (!shown.includes(tripId)) {
    await AsyncStorage.setItem(
      SHOWN_RECOMMENDATIONS_KEY,
      JSON.stringify([...shown, tripId])
    );
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, loading, selectTrip } = useTrips();
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const [recommendationTrip, setRecommendationTrip] =
    useState<ItineraryModel | null>(null);
  const checkedRef = useRef(false);

  const currentTrip = trips.find((t) => t.status === "current") ?? null;
  const upcomingTrips = trips.filter((t) => t.status === "upcoming");

  useEffect(() => {
    if (loading || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        const [metaMap, shown] = await Promise.all([
          getTripMetaMap(),
          getShownRecommendations(),
        ]);

        const pastTrips = trips.filter((t) => t.status === "past");
        const candidate = pastTrips.find(
          (t) => (metaMap[t.id]?.rating ?? 0) === 5 && !shown.includes(t.id)
        );

        if (candidate) {
          setRecommendationTrip(candidate);
        }
      } catch {
        // Non-critical — silently skip if storage read fails
      }
    })();
  }, [loading, trips]);

  function openTrip(id: string) {
    selectTrip(id);
    router.push({
      pathname: "/(tabs)/itinerary/overview",
      params: { from: "home" },
    });
  }

  async function handleDismissBanner() {
    if (recommendationTrip) {
      await markRecommendationShown(recommendationTrip.id);
    }
    setRecommendationTrip(null);
  }

  async function handlePlanRecommendedTrip() {
    if (recommendationTrip) {
      await markRecommendationShown(recommendationTrip.id);
    }
    setRecommendationTrip(null);
    router.push("/(tabs)/addTrip" as never);
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
          {recommendationTrip ? (
            <TripRecommendationBanner
              lovedCity={recommendationTrip.cityOrArea}
              onDismiss={handleDismissBanner}
              onPlanTrip={handlePlanRecommendedTrip}
            />
          ) : null}

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
