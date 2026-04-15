import { useTrips } from "@/context/TripsContext";
import { buildPlacePhotoUrl, placeDetails, placesTextSearch } from "@/lib/googleplaces";
import { auth, db } from "@/src/config/firebase";
import type { ItineraryModel, StopModel } from "@/src/models";
import { deleteStop } from "@/src/services/trips";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchMode = "destinations" | "people";

type SearchResult = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  lat: number;
  lng: number;
  photoUrl?: string;
  types?: string[];
};

type UserSearchResult = {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateDayOptions(trip: ItineraryModel): { iso: string; label: string }[] {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const days: { iso: string; label: string }[] = [];
  const end = new Date(trip.endDate + "T00:00:00");
  let cur = new Date(trip.startDate + "T00:00:00");
  while (cur <= end) {
    const iso = cur.toISOString().split("T")[0];
    days.push({
      iso,
      label: `${DAY_NAMES[cur.getDay()]} ${MONTH_SHORT[cur.getMonth()]} ${cur.getDate()}`,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, selectTrip } = useTrips();
  const currentUid = auth.currentUser?.uid;

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<SearchMode>("destinations");

  // ── Destinations state ────────────────────────────────────────────────────
  const [location, setLocation] = useState("");
  const [activity, setActivity] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  // ── People state ──────────────────────────────────────────────────────────
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleBusy, setPeopleBusy] = useState(false);
  const [peopleResults, setPeopleResults] = useState<UserSearchResult[]>([]);
  const peopleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detail / reviews modal ────────────────────────────────────────────────
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [reviewSnippets, setReviewSnippets] = useState<ReviewSnippet[]>([]);

  // ── Live-sync "added" tracking via onSnapshot ─────────────────────────────
  const [addedMap, setAddedMap] = useState<Record<string, AddedStop>>({});
  const [addBusy, setAddBusy] = useState<string | null>(null);

  // ── Trip picker ───────────────────────────────────────────────────────────
  const [tripPickerVisible, setTripPickerVisible] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<SearchResult | null>(null);
  const [tripPickerOptions, setTripPickerOptions] = useState<ItineraryModel[]>([]);

  // ── Day picker ────────────────────────────────────────────────────────────
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [dayPickerTrip, setDayPickerTrip] = useState<ItineraryModel | null>(null);
  const [dayPickerPlace, setDayPickerPlace] = useState<SearchResult | null>(null);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const canSearch = useMemo(
    () => location.trim().length > 0 && !busy,
    [location, busy]
  );

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

  // ─── Live sync: watch stops for matching trips ──────────────────────────────

  const tripIdsKey = matchingUpcomingTrips.map((t) => t.id).join(",");

  useEffect(() => {
    if (matchingUpcomingTrips.length === 0) {
      setAddedMap({});
      return;
    }

    // Per-trip placeId → stopId maps, merged into addedMap on every snapshot
    const tripStopsData: Record<string, Record<string, string>> = {};

    const unsubs = matchingUpcomingTrips.map((trip) => {
      return onSnapshot(
        collection(db, "itineraries", trip.id, "stops"),
        (snap) => {
          tripStopsData[trip.id] = {};
          for (const d of snap.docs) {
            const stop = d.data() as StopModel;
            if (stop.placeId) {
              tripStopsData[trip.id][stop.placeId] = stop.id;
            }
          }
          // Rebuild merged map
          const merged: Record<string, AddedStop> = {};
          for (const [tripId, placeMap] of Object.entries(tripStopsData)) {
            for (const [placeId, stopId] of Object.entries(placeMap)) {
              merged[placeId] = { itineraryId: tripId, stopId };
            }
          }
          setAddedMap(merged);
        }
      );
    });

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripIdsKey]);

  // ─── Destinations search ────────────────────────────────────────────────────

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
      const mapped = places.map((p) => {
        const photoName = p.photos?.[0]?.name;
        return {
          id: p.id,
          name: p.displayName?.text || "Unnamed place",
          address: p.formattedAddress,
          rating: p.rating,
          reviewCount: p.userRatingCount,
          lat: p.location?.latitude ?? 0,
          lng: p.location?.longitude ?? 0,
          photoUrl: photoName ? buildPlacePhotoUrl(photoName, 800) : undefined,
          types: p.types,
        };
      });
      setResults(mapped);
    } catch (err: any) {
      setResults([]);
      setError(err?.message || "Search failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [activity, location]);

  // ─── People search ──────────────────────────────────────────────────────────

  const handlePeopleQueryChange = useCallback((text: string) => {
    setPeopleQuery(text);
    if (peopleDebounceRef.current) clearTimeout(peopleDebounceRef.current);
    if (text.trim().length < 2) {
      setPeopleResults([]);
      return;
    }
    setPeopleBusy(true);
    peopleDebounceRef.current = setTimeout(async () => {
      try {
        const normalized = text.trim().toLowerCase();
        const q = query(
          collection(db, "users"),
          where("username", ">=", normalized),
          where("username", "<=", normalized + "\uf8ff"),
          limit(15)
        );
        const snap = await getDocs(q);
        const found: UserSearchResult[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              uid: data.uid ?? d.id,
              username: data.username ?? "",
              displayName: data.displayName ?? "",
              photoURL: data.photoURL ?? null,
            };
          })
          .filter((u) => u.uid !== currentUid);
        setPeopleResults(found);
      } catch {
        setPeopleResults([]);
      } finally {
        setPeopleBusy(false);
      }
    }, 400);
  }, [currentUid]);

  // ─── Detail modal ───────────────────────────────────────────────────────────

  const openResultDetails = useCallback(async (item: SearchResult) => {
    setSelectedPlace(item);
    setDetailVisible(true);
    setDetailBusy(true);
    setDetailError("");
    setReviewSnippets([]);
    try {
      const details = await placeDetails(item.id);
      const sourceReviews = (details.reviews || [])
        .map((r) => ({
          author: r.authorAttribution?.displayName,
          rating: r.rating,
          text: r.text?.text || "",
        }))
        .filter((r) => r.text.trim().length > 0);
      setReviewSnippets(sourceReviews.slice(0, 3));
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load reviews.");
    } finally {
      setDetailBusy(false);
    }
  }, []);

  // ─── Add / Remove logic ─────────────────────────────────────────────────────

  /** Open trip picker or day picker, depending on how many trips match. */
  const handleAddToItinerary = useCallback(
    (item: SearchResult) => {
      if (matchingUpcomingTrips.length === 0) {
        Alert.alert(
          "No trips found",
          `You don't have any current or upcoming trips to ${location.trim()}.`
        );
        return;
      }
      if (matchingUpcomingTrips.length === 1) {
        openDayPicker(matchingUpcomingTrips[0], item);
        return;
      }
      setPendingPlace(item);
      setTripPickerOptions(matchingUpcomingTrips);
      setTripPickerVisible(true);
    },
    [matchingUpcomingTrips, location]
  );

  function openDayPicker(trip: ItineraryModel, place: SearchResult) {
    const days = generateDayOptions(trip);
    if (days.length === 1) {
      // Single-day trip — skip the picker
      navigateToItinerary(trip, place, days[0].iso);
      return;
    }
    setDayPickerTrip(trip);
    setDayPickerPlace(place);
    setDayPickerVisible(true);
  }

  function navigateToItinerary(
    trip: ItineraryModel,
    place: SearchResult,
    day: string
  ) {
    selectTrip(trip.id);
    router.push({
      pathname: "/(tabs)/itinerary/itinerary" as never,
      params: {
        _t: Date.now().toString(),
        day,
        prefillName: place.name,
        prefillAddress: place.address || "",
        prefillPlaceId: place.id,
        prefillLat: String(place.lat),
        prefillLng: String(place.lng),
        prefillRating: place.rating != null ? String(place.rating) : "",
        prefillUserRatingCount:
          place.reviewCount != null ? String(place.reviewCount) : "",
        prefillPhotoUrl: place.photoUrl || "",
        prefillTypes: (place.types ?? []).join(","),
      },
    } as never);
  }

  const handleTripPicked = useCallback(
    (trip: ItineraryModel) => {
      if (!pendingPlace) return;
      setTripPickerVisible(false);
      openDayPicker(trip, pendingPlace);
      setPendingPlace(null);
    },
    [pendingPlace]
  );

  const handleDayPicked = useCallback(
    (day: string) => {
      if (!dayPickerTrip || !dayPickerPlace) return;
      setDayPickerVisible(false);
      navigateToItinerary(dayPickerTrip, dayPickerPlace, day);
      setDayPickerTrip(null);
      setDayPickerPlace(null);
    },
    [dayPickerTrip, dayPickerPlace, selectTrip]
  );

  const handleRemove = useCallback(
    async (placeId: string) => {
      const added = addedMap[placeId];
      if (!added) return;
      setAddBusy(placeId);
      try {
        await deleteStop(added.itineraryId, added.stopId);
        // addedMap will auto-update via onSnapshot
      } finally {
        setAddBusy(null);
      }
    },
    [addedMap]
  );

  // ─── Style helpers ──────────────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* ── Top card ── */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          shadowColor: "#191C1D",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.06,
          shadowRadius: 40,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "600", color: "#18181B", marginBottom: 20 }}>
          Explore
        </Text>

        {/* ── Mode toggle ── */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            padding: 3,
            marginBottom: 20,
          }}
        >
          {(["destinations", "people"] as SearchMode[]).map((m) => {
            const isActive = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: isActive ? "#fff" : "transparent",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Ionicons
                  name={m === "destinations" ? "location-outline" : "people-outline"}
                  size={14}
                  color={isActive ? "#6D28D9" : "#9CA3AF"}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isActive ? "#6D28D9" : "#9CA3AF",
                  }}
                >
                  {m === "destinations" ? "Destinations" : "People"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === "destinations" ? (
          <>
            {/* DESTINATION */}
            <View style={{ marginBottom: 16 }}>
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

            {/* INTERESTS */}
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
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  alignSelf: "flex-start",
                  opacity: canSearch ? 1 : 0.5,
                }}
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
        ) : (
          /* PEOPLE search input */
          <View style={inputBox}>
            <Ionicons name="search-outline" size={16} color="#6D28D9" />
            <TextInput
              style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#18181B" }}
              placeholder="Search by username"
              placeholderTextColor="#A1A1AA"
              value={peopleQuery}
              onChangeText={handlePeopleQueryChange}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {peopleBusy && (
              <Ionicons name="ellipsis-horizontal" size={16} color="#A1A1AA" />
            )}
          </View>
        )}
      </View>

      {/* ── Results ── */}
      <View style={styles.resultsContainer}>
        {mode === "destinations" ? (
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
              const isAdded = !!addedMap[item.id];
              const isBusy = addBusy === item.id;
              return (
                <View style={styles.resultCard}>
                  {/* Photo */}
                  {!!item.photoUrl && (
                    <Image
                      source={{ uri: item.photoUrl }}
                      style={styles.resultPhoto}
                      resizeMode="cover"
                    />
                  )}

                  <View style={{ padding: 14 }}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    {!!item.address && (
                      <Text style={styles.resultAddress}>{item.address}</Text>
                    )}
                    {item.rating != null && (
                      <View style={styles.metaRow}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.metaText}>
                          {item.rating} ({item.reviewCount ?? 0})
                        </Text>
                      </View>
                    )}

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
                          style={styles.addToItineraryButton}
                          onPress={() => handleAddToItinerary(item)}
                        >
                          <Text style={styles.addToItineraryButtonText}>Add to Trip</Text>
                        </Pressable>
                      )}
                    </View>
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
            renderItem={({ item }) => (
              <View style={styles.personCard}>
                {item.photoURL ? (
                  <Image
                    source={{ uri: item.photoURL }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={20} color="#9CA3AF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{item.displayName || item.username}</Text>
                  {!!item.username && (
                    <Text style={styles.personUsername}>@{item.username}</Text>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              peopleQuery.trim().length >= 2 && !peopleBusy ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#E5E7EB" />
                  <Text style={styles.emptyTitle}>No users found</Text>
                  <Text style={styles.emptySubtitle}>Try a different username.</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#E5E7EB" />
                  <Text style={styles.emptyTitle}>Find people</Text>
                  <Text style={styles.emptySubtitle}>Search by username to find other travelers.</Text>
                </View>
              )
            }
          />
        )}
      </View>

      {/* ── Reviews modal ── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedPlace?.name || "Place details"}
              </Text>
              <Pressable onPress={() => setDetailVisible(false)} hitSlop={8}>
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
                          {typeof review.rating === "number"
                            ? `· ${review.rating}/5`
                            : ""}
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

      {/* ── Day picker modal ── */}
      <Modal
        visible={dayPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDayPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: 16 }]}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: "#E4E4E7", borderRadius: 2, alignSelf: "center", marginBottom: 12 }} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Which day?</Text>
              <Pressable onPress={() => setDayPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            {dayPickerPlace && (
              <Text style={styles.modalAddress} numberOfLines={1}>
                Adding: {dayPickerPlace.name}
              </Text>
            )}

            <ScrollView
              style={{ marginTop: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {dayPickerTrip &&
                generateDayOptions(dayPickerTrip).map((day, idx, arr) => (
                  <Pressable
                    key={day.iso}
                    style={[
                      styles.dayOption,
                      idx < arr.length - 1 && styles.dayOptionBorder,
                    ]}
                    onPress={() => handleDayPicked(day.iso)}
                  >
                    <View style={styles.dayOptionLeft}>
                      <View style={styles.dayDot} />
                      <Text style={styles.dayOptionLabel}>{day.label}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle-outline" size={20} color="#6D28D9" />
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

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

  // Destination result card
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    overflow: "hidden",
  },
  resultPhoto: {
    width: "100%",
    height: 160,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  resultAddress: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 4,
    color: "#4B5563",
    fontSize: 13,
  },
  resultActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
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

  // People card
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  personName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  personUsername: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },

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

  // Trip picker
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

  // Day picker
  dayOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  dayOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dayOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6D28D9",
  },
  dayOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
});
