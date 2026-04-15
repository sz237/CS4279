import { MemberChip } from "@/components/itinerary/MemberChip";
import { useTrips } from "@/context/TripsContext";
import { useItinerarySheet } from "@/lib/ItinerarySheetContext";
import { updateItinerary } from "@/src/services/trips";
import { UI } from "@/src/theme/ui";
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
  const { reportStickyHeaderHeight, setMapDay, openEditModal } = useItinerarySheet();

  useEffect(() => {
    setMapDay(null);
  }, [setMapDay]);

  const { trips, selectedTripId } = useTrips();
  const trip = trips.find((t) => t.id === selectedTripId) ?? null;

  const [notesEditMode, setNotesEditMode] = useState(false);
  const [notes, setNotes] = useState(trip?.notes ?? "");
  const [notesDraft, setNotesDraft] = useState(trip?.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);

  const members = trip?.memberUsernames ?? [];
  const dateRange = trip ? formatDateRange(trip.startDate, trip.endDate) : "";
  const inviteCode = trip?.inviteCode ?? null;

  useEffect(() => {
    if (!notesEditMode) {
      setNotes(trip?.notes ?? "");
      setNotesDraft(trip?.notes ?? "");
    }
  }, [trip?.notes, notesEditMode]);

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
    <View style={{ flex: 1, backgroundColor: UI.colors.pageBg }}>
      <View
        style={{
          backgroundColor: UI.colors.pageBg,
          paddingHorizontal: UI.spacing.pageX,
          paddingTop: UI.spacing.pageTop + 8,
          paddingBottom: 20,
        }}
        onLayout={(e) => reportStickyHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                fontSize: UI.type.overline,
                fontWeight: "700",
                color: UI.colors.brand,
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}
            >
              Trip Overview
            </Text>

            <Text
              style={{
                fontSize: UI.type.pageTitle,
                fontWeight: "800",
                color: UI.colors.textPrimary,
              }}
            >
              {trip?.title ?? "Your Trip"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Ionicons name="calendar-outline" size={15} color="#71717A" />
              <Text style={{ fontSize: UI.type.body, color: UI.colors.textSecondary }}>
                {dateRange}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={openEditModal}
            style={{
              width: 36,
              height: 36,
              borderRadius: UI.radius.pill,
              backgroundColor: UI.colors.cardBg,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
              borderWidth: 1,
              borderColor: UI.colors.cardBorder,
            }}
            accessibilityLabel="Edit trip"
          >
            <Ionicons name="pencil-outline" size={15} color="#71717A" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: UI.spacing.pageX,
          paddingTop: 8,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: UI.colors.textPrimary }}>
              Group Members
            </Text>

            <Pressable
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              accessibilityLabel="Invite group members"
            >
              <Ionicons name="add" size={14} color={UI.colors.brand} />
              <Text style={{ fontSize: UI.type.caption, fontWeight: "700", color: UI.colors.brand }}>
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

        {inviteCode && (
          <View style={{ marginTop: UI.spacing.sectionGap }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: UI.colors.textPrimary,
                marginBottom: 12,
              }}
            >
              Invite Code
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: UI.colors.cardBg,
                borderColor: UI.colors.cardBorder,
                borderWidth: 1,
                borderRadius: UI.radius.card,
                padding: UI.spacing.cardPadding,
                ...UI.shadow.card,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: UI.colors.textPrimary,
                  letterSpacing: 1.5,
                }}
              >
                {inviteCode}
              </Text>

              <Pressable
                onPress={shareCode}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="copy-outline" size={16} color={UI.colors.brand} />
                <Text style={{ fontSize: UI.type.body, fontWeight: "700", color: UI.colors.brand }}>
                  Copy
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ marginTop: UI.spacing.sectionGap }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: UI.colors.textPrimary }}>
              Notes
            </Text>

            {!notesEditMode && (
              <Pressable onPress={handleNotesEdit} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="pencil-outline" size={14} color={UI.colors.brand} />
                <Text style={{ fontSize: UI.type.caption, fontWeight: "700", color: UI.colors.brand }}>
                  Edit
                </Text>
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
                style={{
                  minHeight: 100,
                  textAlignVertical: "top",
                  backgroundColor: UI.colors.cardBg,
                  borderColor: UI.colors.cardBorder,
                  borderWidth: 1,
                  borderRadius: UI.radius.card,
                  padding: UI.spacing.cardPadding,
                  color: UI.colors.textPrimary,
                  fontSize: UI.type.body,
                  marginBottom: 12,
                  ...UI.shadow.card,
                }}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={handleNotesCancel}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: UI.colors.cardBorder,
                    borderRadius: UI.radius.button,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: UI.colors.cardBg,
                  }}
                >
                  <Text style={{ color: UI.colors.textSecondary, fontSize: UI.type.body, fontWeight: "600" }}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleNotesSave}
                  disabled={notesSaving}
                  style={{
                    flex: 1,
                    borderRadius: UI.radius.button,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: UI.colors.brand,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: UI.type.body, fontWeight: "600" }}>
                    {notesSaving ? "Saving…" : "Save"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              onPress={handleNotesEdit}
              style={{
                minHeight: 80,
                backgroundColor: UI.colors.cardBg,
                borderColor: UI.colors.cardBorder,
                borderWidth: 1,
                borderRadius: UI.radius.card,
                padding: UI.spacing.cardPadding,
                ...UI.shadow.card,
              }}
            >
              <Text
                style={{
                  fontSize: UI.type.body,
                  color: notes ? UI.colors.textPrimary : "#A1A1AA",
                }}
              >
                {notes || "Add notes for the group…"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}