import { CurrentTripCard } from "@/components/home/CurrentTripCard";
import { JoinTripModal } from "@/components/home/JoinTripModal";
import { TripActionsMenu } from "@/components/home/TripActionsMenu";
import { UpcomingTripCard } from "@/components/home/UpcomingTripCard";
import { useTrips } from "@/context/TripsContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ItineraryModel } from "@/src/models";

function formatDateRange(start: string, end: string): string {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function dayCount(start: string, end: string): number {
  const diff = new Date(end + "T00:00:00").getTime() - new Date(start + "T00:00:00").getTime();
  return Math.round(diff / 86_400_000) + 1;
}

function tripImage(_trip: ItineraryModel): { uri: string } {
  return { uri: "https://placehold.co/342x300" };
}

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
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-zinc-900 text-3xl font-extrabold leading-[48px] mb-8">
        Your Trips
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6D28D9" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Current Trip */}
          {currentTrip && (
            <CurrentTripCard
              imageSource={tripImage(currentTrip)}
              tripName={currentTrip.title}
              dates={formatDateRange(currentTrip.startDate, currentTrip.endDate)}
              travelers={currentTrip.memberUids.length}
              days={dayCount(currentTrip.startDate, currentTrip.endDate)}
              onPress={() => openTrip(currentTrip.id)}
            />
          )}

          {/* Upcoming Journeys */}
          {upcomingTrips.length > 0 && (
            <View className={currentTrip ? "mt-12" : "mt-0"}>
              <Text className="text-zinc-900 text-2xl font-bold mb-8">Upcoming Trips</Text>
              {upcomingTrips.map((trip) => (
                <UpcomingTripCard
                  key={trip.id}
                  imageSource={tripImage(trip)}
                  city={trip.cityOrArea}
                  dateRange={formatDateRange(trip.startDate, trip.endDate)}
                  onPress={() => openTrip(trip.id)}
                />
              ))}
            </View>
          )}

          {trips.length === 0 && (
            <View className="items-center mt-16">
              <Text className="text-gray-400 text-base">No trips yet. Add one to get started!</Text>
            </View>
          )}

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
