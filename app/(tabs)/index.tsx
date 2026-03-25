import { JoinTripModal } from "@/components/home/JoinTripModal";
import { TripActionsMenu } from "@/components/home/TripActionsMenu";
import { TripPreviewCard } from "@/components/trips/TripPreviewCard";
import { useTrips } from "@/context/TripsContext";
import type { ItineraryModel } from "@/src/models";
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
    router.push("/(tabs)/itinerary/overview" as never);
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-6 text-3xl font-extrabold leading-[48px] text-zinc-900">
        Your Trips
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6D28D9" style={{ marginTop: 40 }} />
      ) : (
        <>
          {currentTrip ? (
            <View>
              <Text className="mb-4 text-2xl font-bold text-zinc-900">Current Trip</Text>
              <TripPreviewCard
                trip={currentTrip}
                onPress={() => openTrip(currentTrip.id)}
              />
            </View>
          ) : null}

          {upcomingTrips.length > 0 ? (
            <View className={currentTrip ? "mt-8" : "mt-0"}>
              <Text className="mb-4 text-2xl font-bold text-zinc-900">Upcoming Trips</Text>
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
            <View className="mt-16 items-center">
              <Text className="text-base text-gray-400">
                No trips yet. Add one to get started!
              </Text>
            </View>
          ) : null}

          <TripActionsMenu
            onJoinTrip={() => setJoinModalVisible(true)}
            onCreateTrip={() => router.push("/(tabs)/addTrip" as never)}
          />

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