import { EditTripModal } from "@/components/itinerary/EditTripModal";
import { MemberChip } from "@/components/itinerary/MemberChip";
import { useItinerarySheet } from "@/lib/ItinerarySheetContext";
import { useTrips } from "@/context/TripsContext";
import { updateItinerary } from "@/src/services/trips";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";

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
  const { reportStickyHeaderHeight, setMapDay } = useItinerarySheet();

  // Reset map to show all stops when overview is active
  useEffect(() => { setMapDay(null); }, []);
  const { trips, selectedTripId } = useTrips();
  const trip = trips.find((t) => t.id === selectedTripId) ?? null;

  const [editVisible, setEditVisible] = useState(false);
  const [notesEditMode, setNotesEditMode] = useState(false);
  const [notes, setNotes] = useState(trip?.notes ?? "");
  const [notesDraft, setNotesDraft] = useState(trip?.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const members = trip?.memberUsernames ?? [];
  const dateRange = trip ? formatDateRange(trip.startDate, trip.endDate) : "";
  const inviteCode = trip?.inviteCode ?? null;

  // Sync notes if trip changes (e.g. real-time update from another member)
  useEffect(() => {
    if (!notesEditMode) {
      setNotes(trip?.notes ?? "");
      setNotesDraft(trip?.notes ?? "");
    }
  }, [trip?.notes]);

  function handleNotesEdit() {
    setNotesDraft(notes);
    setNotesEditMode(true);
  }

  function handleNotesCancel() {
    setNotesDraft(notes);
    setNotesEditMode(false);
  }

  async function handleNotesSave() {
    if (!trip || notesSaving) return;
    setNotesSaving(true);
    try {
      await updateItinerary(trip.id, { notes: notesDraft.trim() || null });
      setNotes(notesDraft);
      setNotesEditMode(false);
    } finally {
      setNotesSaving(false);
    }
  }

  async function shareCode() {
    if (!inviteCode) return;
    await Share.share({ message: `Join my trip on Nomad! Use code: ${inviteCode}` });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* ── Sticky header: title + dates ── */}
      <View
        style={{ backgroundColor: "#F9FAFB", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}
        onLayout={(e) => reportStickyHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View className="flex-row items-start justify-between" style={{ gap: 4 }}>
          <View className="flex-1" style={{ gap: 4 }}>
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
            <View className="flex-row items-center gap-1.5 mt-1">
              <Ionicons name="calendar-outline" size={15} color="#71717A" />
              <Text className="text-zinc-500 text-sm">{dateRange}</Text>
            </View>
          </View>

          {/* Subtle edit button */}
          <Pressable
            onPress={() => setEditVisible(true)}
            className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mt-1"
            accessibilityLabel="Edit trip"
          >
            <Ionicons name="pencil-outline" size={15} color="#71717A" />
          </Pressable>
        </View>
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
                Manage
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {members.map((name) => (
              <MemberChip key={name} name={name} />
            ))}
          </View>
        </View>

        {/* Invite Code */}
        {inviteCode && (
          <View className="mt-7">
            <Text className="text-lg font-bold text-zinc-900 mb-3">Invite Code</Text>
            <View className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-3">
              <Text className="text-base font-semibold text-zinc-900 tracking-widest">
                {inviteCode}
              </Text>
              <Pressable
                onPress={shareCode}
                className="flex-row items-center gap-1.5"
              >
                <Ionicons name="copy-outline" size={16} color="#6D28D9" />
                <Text className="text-violet-700 text-sm font-bold">Copy</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Notes */}
        <View className="mt-7">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-zinc-900">Notes</Text>
            {!notesEditMode && (
              <Pressable onPress={handleNotesEdit} className="flex-row items-center gap-1">
                <Ionicons name="pencil-outline" size={14} color="#6D28D9" />
                <Text className="text-violet-700 text-xs font-bold">Edit</Text>
              </Pressable>
            )}
          </View>

          {notesEditMode ? (
            <>
              <TextInput
                value={notesDraft}
                onChangeText={setNotesDraft}
                placeholder="Add notes for the group…"
                placeholderTextColor="#A1A1AA"
                multiline
                autoFocus
                className="bg-gray-100 rounded-xl px-4 py-3 text-zinc-900 text-sm mb-3"
                style={{ minHeight: 100, textAlignVertical: "top" }}
              />
              <View className="flex-row gap-2">
                <Pressable
                  onPress={handleNotesCancel}
                  className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
                >
                  <Text className="text-zinc-600 text-sm font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleNotesSave}
                  disabled={notesSaving}
                  className="flex-1 bg-violet-600 rounded-xl py-3 items-center"
                >
                  <Text className="text-white text-sm font-semibold">
                    {notesSaving ? "Saving…" : "Save"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable onPress={handleNotesEdit} className="bg-gray-100 rounded-xl px-4 py-3" style={{ minHeight: 80 }}>
              <Text className={`text-sm ${notes ? "text-zinc-900" : "text-zinc-400"}`}>
                {notes || "Add notes for the group…"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      {trip && (
        <EditTripModal
          visible={editVisible}
          trip={trip}
          onClose={() => setEditVisible(false)}
        />
      )}
    </View>
  );
}
