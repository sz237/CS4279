import { DatesCard } from "@/components/itinerary/DatesCard";
import { MemberChip } from "@/components/itinerary/MemberChip";
import { useItinerarySheet } from "@/lib/ItinerarySheetContext";
import { useTrips } from "@/context/TripsContext";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

function formatDateRange(start: string, end: string): string {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`;
}

export default function OverviewScreen() {
  const { reportStickyHeaderHeight } = useItinerarySheet();
  const { trips, selectedTripId } = useTrips();
  const trip = trips.find((t) => t.id === selectedTripId) ?? null;

  const members = trip?.memberUsernames ?? [];
  const dateRange = trip ? formatDateRange(trip.startDate, trip.endDate) : "";

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* ── Sticky header: title + dates ── */}
      <View
        style={{ backgroundColor: "#F9FAFB", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}
        onLayout={(e) => reportStickyHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ marginBottom: 20, gap: 4 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: "#6D28D9",
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Trip Overview
          </Text>
          <Text style={{ fontSize: 30, fontWeight: "800", color: "#18181B" }}>
            {trip?.title ?? "Your Trip"}
          </Text>
        </View>

        <DatesCard dateRange={dateRange} onEdit={() => {}} />
      </View>

      {/* ── Scrollable content below ── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Members */}
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181B" }}>
              Group Members
            </Text>
            <Pressable
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              accessibilityLabel="Invite group members"
            >
              <Ionicons name="add" size={14} color="#6D28D9" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#6D28D9" }}>
                Invite
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {members.map((name) => (
              <MemberChip key={name} name={name} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
