import { useTrips } from "@/context/TripsContext";
import { placeDetails, placesTextSearch } from "@/lib/googleplaces";
import { auth, db } from "@/src/config/firebase";
import type { ItineraryModel, StopModel } from "@/src/models";
import { deleteStop, saveStop } from "@/src/services/trips";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, doc, getDocs, limit, query, where } from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchMode = "destinations" | "people";

type SearchResult = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
};

type ReviewSnippet = {
  author?: string;
  rating?: number;
  text: string;
};

type AddedStop = {
  itineraryId: string;
  stopId: string;
};

type UserResult = {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  bio: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { trips } = useTrips();

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<SearchMode>("destinations");

  // ── Destination search state ──────────────────────────────────────────────
  const [location, setLocation] = useState("");
  const [activity, setActivity] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [reviewSnippets, setReviewSnippets] = useState<ReviewSnippet[]>([]);
  const [addedStops, setAddedStops] = useState<Record<string, AddedStop>>({});
  const [addBusy, setAddBusy] = useState<string | null>(null);
  const [tripPickerVisible, setTripPickerVisible] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<SearchResult | null>(null);
  const [tripPickerOptions, setTripPickerOptions] = useState<ItineraryModel[]>([]);

  // ── People search state ───────────────────────────────────────────────────
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<UserResult[]>([]);
  const [peopleBusy, setPeopleBusy] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  // ── Destination logic ─────────────────────────────────────────────────────

  const canSearch = useMemo(() => location.trim().length > 0 && !busy, [location, busy]);

  // Current or upcoming trips whose cityOrArea overlaps the searched location
  const matchingUpcomingTrips = useMemo(() => {
    const city = location.trim().toLowerCase();
    if (!city) return [];
    return trips.filter(
      (trip) =>
        (trip.status === "upcoming" || trip.status === "current") &&
        (trip.cityOrArea.toLowerCase().includes(city) ||
          city.includes(trip.cityOrArea.toLowerCase()))
    );
  }, [trips, location]);

  const runSearch = useCallback(async () => {
    const locationValue = location.trim();
    const activityValue = activity.trim();
    if (!locationValue) {
      setError("Please enter a location.");
      setResults([]);
      return;
    }
    const textQuery = activityValue
      ? `${activityValue} in ${locationValue}`
      : `Things to do in ${locationValue}`;
    setBusy(true);
    setError("");
    setSubmittedQuery(textQuery);
    try {
      const places = await placesTextSearch(textQuery);
      const mapped = places.map((p) => ({
        id: p.id,
        name: p.displayName?.text || "Unnamed place",
        address: p.formattedAddress,
        rating: p.rating,
        reviewCount: p.userRatingCount,
      }));
      setResults(mapped);
    } catch (err: any) {
      setResults([]);
      setError(err?.message || "Search failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [activity, location]);

  const openResultDetails = useCallback(async (item: SearchResult) => {
    setSelectedPlace(item);
    setDetailVisible(true);
    setDetailBusy(true);
    setDetailError("");
    setReviewSnippets([]);
    try {
      const details = await placeDetails(item.id);
      const sourceReviews = (details.reviews || [])
        .map((review) => ({
          author: review.authorAttribution?.displayName,
          rating: review.rating,
          text: review.text?.text || "",
        }))
        .filter((review) => review.text.trim().length > 0);
      setReviewSnippets(sourceReviews.slice(0, 3));
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load reviews.");
    } finally {
      setDetailBusy(false);
    }
  }, []);

  const closeDetails = useCallback(() => setDetailVisible(false), []);

  const saveStopToTrip = useCallback(
    async (place: SearchResult, itineraryId: string) => {
      const stopId = doc(collection(db, "itineraries", itineraryId, "stops")).id;
      const trip = trips.find((t) => t.id === itineraryId);
      const stop: StopModel = {
        id: stopId,
        orderIndex: trip?.stopCount ?? 0,
        day: null,
        timeLabel: null,
        duration: null,
        placeId: place.id,
        name: place.name,
        address: place.address || "",
        photoUrl: null,
        lat: 0,
        lng: 0,
        rating: place.rating ?? null,
        userRatingCount: place.reviewCount ?? null,
        types: [],
        briefSummary: null,
        travelMode: null,
        travelMinutes: null,
        category: null,
      };
      await saveStop(itineraryId, stop);
      setAddedStops((prev) => ({ ...prev, [place.id]: { itineraryId, stopId } }));
    },
    [trips]
  );

  const handleAddToItinerary = useCallback(
    async (item: SearchResult) => {
      if (matchingUpcomingTrips.length === 0) {
        Alert.alert(
          "No trips found",
          `You don't have any current or upcoming trips to ${location.trim()}.`
        );
        return;
      }
      if (matchingUpcomingTrips.length === 1) {
        setAddBusy(item.id);
        try {
          await saveStopToTrip(item, matchingUpcomingTrips[0].id);
        } finally {
          setAddBusy(null);
        }
        return;
      }
      setPendingPlace(item);
      setTripPickerOptions(matchingUpcomingTrips);
      setTripPickerVisible(true);
    },
    [matchingUpcomingTrips, saveStopToTrip, location]
  );

  const handleTripPicked = useCallback(
    async (trip: ItineraryModel) => {
      if (!pendingPlace) return;
      setTripPickerVisible(false);
      setAddBusy(pendingPlace.id);
      try {
        await saveStopToTrip(pendingPlace, trip.id);
      } finally {
        setAddBusy(null);
        setPendingPlace(null);
      }
    },
    [pendingPlace, saveStopToTrip]
  );

  const handleRemove = useCallback(
    async (placeId: string) => {
      const added = addedStops[placeId];
      if (!added) return;
      setAddBusy(placeId);
      try {
        await deleteStop(added.itineraryId, added.stopId);
        setAddedStops((prev) => {
          const next = { ...prev };
          delete next[placeId];
          return next;
        });
      } finally {
        setAddBusy(null);
      }
    },
    [addedStops]
  );

  // ── People logic ──────────────────────────────────────────────────────────

  const canSearchPeople = useMemo(
    () => peopleQuery.trim().length > 0 && !peopleBusy,
    [peopleQuery, peopleBusy]
  );

  const searchPeople = useCallback(async () => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return;

    setPeopleBusy(true);
    setPeopleError("");
    setPeopleResults([]);

    const currentUid = auth.currentUser?.uid;

    try {
      // Run prefix searches on username and displayName concurrently
      const [usernameSnap, displayNameSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "users"),
            where("username", ">=", q),
            where("username", "<=", q + "\uf8ff"),
            limit(20)
          )
        ),
        getDocs(
          query(
            collection(db, "users"),
            where("displayName", ">=", q),
            where("displayName", "<=", q + "\uf8ff"),
            limit(20)
          )
        ),
      ]);

      const seen = new Set<string>();
      const merged: UserResult[] = [];

      for (const snap of [usernameSnap, displayNameSnap]) {
        for (const d of snap.docs) {
          if (seen.has(d.id) || d.id === currentUid) continue;
          seen.add(d.id);
          const data = d.data();
          merged.push({
            uid: d.id,
            username: data.username ?? "",
            displayName: data.displayName ?? "",
            photoURL: data.photoURL ?? null,
            bio: data.bio ?? null,
          });
        }
      }

      setPeopleResults(merged);
    } catch (err: any) {
      setPeopleError(err?.message || "Search failed. Please try again.");
    } finally {
      setPeopleBusy(false);
    }
  }, [peopleQuery]);

  const toggleFollow = useCallback((uid: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  // ── Shared style objects ──────────────────────────────────────────────────

  const fieldLabel = {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#525252",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  };

  const inputBox = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F4F4F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,212,216,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* ── Header card ── */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          shadowColor: "#191C1D",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.06,
          shadowRadius: 40,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "600", color: "#18181B", marginBottom: 16 }}>
          Explore
        </Text>

        {/* ── Mode toggle ── */}
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeButton, searchMode === "destinations" && styles.modeButtonActive]}
            onPress={() => setSearchMode("destinations")}
          >
            <Ionicons
              name="map-outline"
              size={14}
              color={searchMode === "destinations" ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[
                styles.modeButtonText,
                searchMode === "destinations" && styles.modeButtonTextActive,
              ]}
            >
              Destinations
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, searchMode === "people" && styles.modeButtonActive]}
            onPress={() => setSearchMode("people")}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={searchMode === "people" ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[
                styles.modeButtonText,
                searchMode === "people" && styles.modeButtonTextActive,
              ]}
            >
              People
            </Text>
          </Pressable>
        </View>

        {/* ── Destinations form ── */}
        {searchMode === "destinations" && (
          <>
            <View style={{ marginBottom: 16, marginTop: 16 }}>
              <Text style={fieldLabel}>Destination</Text>
              <View style={inputBox}>
                <Ionicons name="location-outline" size={16} color="#6D28D9" />
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#18181B" }}
                  placeholder="City, State, or Area"
                  placeholderTextColor="#A1A1AA"
                  value={location}
                  onChangeText={setLocation}
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={runSearch}
                />
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6, marginLeft: 4 }}>
                <Text style={[fieldLabel, { marginBottom: 0, marginLeft: 0 }]}>Interests</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  (optional)
                </Text>
              </View>
              <View style={inputBox}>
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#18181B" }}
                  placeholder="Matcha, Coffee, Run"
                  placeholderTextColor="#A1A1AA"
                  value={activity}
                  onChangeText={setActivity}
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={runSearch}
                />
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 20 }}>
              <TouchableOpacity
                onPress={runSearch}
                disabled={!canSearch}
                activeOpacity={0.88}
                style={{ borderRadius: 12, overflow: "hidden", alignSelf: "flex-start", opacity: canSearch ? 1 : 0.5 }}
              >
                <LinearGradient
                  colors={["#6D28D9", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 10, paddingHorizontal: 28 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                    {busy ? "Searching…" : "Search"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {!!error && (
                <Text style={{ marginTop: 10, color: "#B91C1C", fontSize: 13 }}>{error}</Text>
              )}
            </View>
          </>
        )}

        {/* ── People form ── */}
        {searchMode === "people" && (
          <View style={{ marginTop: 16 }}>
            <View style={inputBox}>
              <Ionicons name="search-outline" size={16} color="#6D28D9" />
              <TextInput
                style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#18181B" }}
                placeholder="Search by name or username"
                placeholderTextColor="#A1A1AA"
                value={peopleQuery}
                onChangeText={setPeopleQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={searchPeople}
              />
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 16, marginTop: 16 }}>
              <TouchableOpacity
                onPress={searchPeople}
                disabled={!canSearchPeople}
                activeOpacity={0.88}
                style={{ borderRadius: 12, overflow: "hidden", alignSelf: "flex-start", opacity: canSearchPeople ? 1 : 0.5 }}
              >
                <LinearGradient
                  colors={["#6D28D9", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 10, paddingHorizontal: 28 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                    {peopleBusy ? "Searching…" : "Search"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {!!peopleError && (
                <Text style={{ marginTop: 10, color: "#B91C1C", fontSize: 13 }}>{peopleError}</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Results ── */}
      <View style={styles.resultsContainer}>
        {searchMode === "destinations" ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsContent}
            ListHeaderComponent={
              submittedQuery ? (
                <Text style={styles.resultsTitle}>Results for: {submittedQuery}</Text>
              ) : null
            }
            renderItem={({ item }) => {
              const isAdded = !!addedStops[item.id];
              const isBusy = addBusy === item.id;
              return (
                <View style={styles.resultCard}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  {!!item.address && (
                    <Text style={styles.resultAddress}>{item.address}</Text>
                  )}
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.metaText}>
                      {item.rating ?? "—"} ({item.reviewCount ?? 0})
                    </Text>
                  </View>
                  <View style={styles.resultActions}>
                    <Pressable
                      style={styles.viewReviewsButton}
                      onPress={() => openResultDetails(item)}
                    >
                      <Text style={styles.viewReviewsButtonText}>View Reviews</Text>
                    </Pressable>
                    {isAdded ? (
                      <Pressable
                        style={[styles.removeButton, isBusy && styles.buttonDisabled]}
                        onPress={() => handleRemove(item.id)}
                        disabled={isBusy}
                      >
                        <Text style={styles.removeButtonText}>
                          {isBusy ? "Removing…" : "Remove"}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.addToItineraryButton, isBusy && styles.buttonDisabled]}
                        onPress={() => handleAddToItinerary(item)}
                        disabled={isBusy}
                      >
                        <Text style={styles.addToItineraryButtonText}>
                          {isBusy ? "Adding…" : "Add to Itinerary"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="map-outline" size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>No activities yet</Text>
                <Text style={styles.emptySubtitle}>
                  Enter a location and search to see activity ideas.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={peopleResults}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.resultsContent}
            renderItem={({ item }) => {
              const isFollowing = followedIds.has(item.uid);
              const initials = initialsFromName(item.displayName || item.username || "U");
              return (
                <View style={styles.personCard}>
                  {item.photoURL ? (
                    <Image
                      source={{ uri: item.photoURL }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{item.displayName}</Text>
                    <Text style={styles.personUsername}>@{item.username}</Text>
                    {!!item.bio && (
                      <Text style={styles.personBio} numberOfLines={1}>
                        {item.bio}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    style={[
                      styles.followButton,
                      isFollowing && styles.followingButton,
                    ]}
                    onPress={() => toggleFollow(item.uid)}
                  >
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText,
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>Find people</Text>
                <Text style={styles.emptySubtitle}>
                  Search by name or username to find friends.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* ── Reviews modal ── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetails}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedPlace?.name || "Place details"}
              </Text>
              <Pressable onPress={closeDetails} hitSlop={8}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            {!!selectedPlace?.address && (
              <Text style={styles.modalAddress}>{selectedPlace.address}</Text>
            )}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {detailBusy ? (
                <Text style={styles.modalLoadingText}>Loading reviews...</Text>
              ) : detailError ? (
                <Text style={styles.modalErrorText}>{detailError}</Text>
              ) : (
                <>
                  <Text style={styles.modalSectionTitle}>Reviews</Text>
                  {reviewSnippets.length === 0 ? (
                    <Text style={styles.modalMuted}>No review text available.</Text>
                  ) : (
                    reviewSnippets.map((review, index) => (
                      <View key={`review-${index}`} style={styles.reviewCard}>
                        <Text style={styles.reviewMeta}>
                          {review.author || "Anonymous"}{" "}
                          {typeof review.rating === "number" ? `· ${review.rating}/5` : ""}
                        </Text>
                        <Text style={styles.reviewText}>{review.text}</Text>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Trip picker modal ── */}
      <Modal
        visible={tripPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTripPickerVisible(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add to which trip?</Text>
              <Pressable onPress={() => setTripPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>
            {pendingPlace && (
              <Text style={styles.pickerSubtitle} numberOfLines={1}>
                {pendingPlace.name}
              </Text>
            )}
            {tripPickerOptions.map((trip) => (
              <Pressable
                key={trip.id}
                style={styles.pickerOption}
                onPress={() => handleTripPicked(trip)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerOptionTitle}>{trip.title}</Text>
                  <Text style={styles.pickerOptionMeta}>
                    {trip.startDate} – {trip.endDate}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F4F4F5",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: "#111827",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },

  // Results
  resultsContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  resultsContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },

  // Destination result cards
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
  },
  resultName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  resultAddress: { marginTop: 4, color: "#6B7280", fontSize: 13 },
  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center" },
  metaText: { marginLeft: 4, color: "#4B5563", fontSize: 13 },
  resultActions: { marginTop: 10, flexDirection: "row", gap: 8 },
  viewReviewsButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  viewReviewsButtonText: { color: "#111827", fontSize: 13, fontWeight: "600" },
  addToItineraryButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  addToItineraryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  removeButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  removeButtonText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },

  // People result cards
  personCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 16, fontWeight: "600", color: "#374151" },
  personName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  personUsername: { fontSize: 13, color: "#6B7280", marginTop: 1 },
  personBio: { fontSize: 12, color: "#9CA3AF", marginTop: 3 },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#111827",
  },
  followButtonText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  followingButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  followingButtonText: { color: "#6B7280" },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: { color: "#9CA3AF", marginTop: 12, fontSize: 16, fontWeight: "500" },
  emptySubtitle: { color: "#D1D5DB", fontSize: 14, marginTop: 4 },

  // Reviews modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "flex-end",
    padding: 12,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111827" },
  modalAddress: { marginTop: 4, fontSize: 13, color: "#6B7280" },
  modalScroll: { marginTop: 10 },
  modalScrollContent: { paddingBottom: 8 },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
    marginBottom: 6,
  },
  modalMuted: { fontSize: 13, color: "#9CA3AF" },
  modalLoadingText: { fontSize: 14, color: "#6B7280" },
  modalErrorText: { fontSize: 13, color: "#B91C1C" },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  reviewMeta: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  reviewText: { fontSize: 13, color: "#111827", lineHeight: 18 },

  // Trip picker modal
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  pickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  pickerSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  pickerOptionTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  pickerOptionMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
