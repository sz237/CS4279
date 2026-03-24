import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { placeDetails, placesTextSearch } from "@/lib/googleplaces";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

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

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
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
  const [itineraryIds, setItineraryIds] = useState<string[]>([]);

  const canSearch = useMemo(() => location.trim().length > 0 && !busy, [location, busy]);

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
      const sourceReviews =
        (details.reviews || [])
          .map((review) => ({
            author: review.authorAttribution?.displayName,
            rating: review.rating,
            text: review.text?.text || "",
          }))
          .filter((review) => review.text.trim().length > 0) || [];

      const conciseReviews = sourceReviews
        .slice(0, 3)
        .map((review) => ({ ...review, text: review.text }));
      setReviewSnippets(conciseReviews);
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load reviews.");
    } finally {
      setDetailBusy(false);
    }
  }, []);

  const closeDetails = useCallback(() => {
    setDetailVisible(false);
  }, []);

  const addToItinerary = useCallback((placeId: string) => {
    setItineraryIds((prev) => (prev.includes(placeId) ? prev : [...prev, placeId]));
  }, []);

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

  return (
    <View style={styles.screen}>
      {/* ── Search card ── */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: 28,
          shadowColor: "#191C1D",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.06,
          shadowRadius: 40,
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: "#18181B",
            marginBottom: 24,
          }}
        >
          Explore
        </Text>

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

        {/* INTERESTS (OPTIONAL) */}
        <View style={{ marginBottom: 24 }}>
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

        {/* Divider + Search button */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingTop: 20,
          }}
        >
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
      </View>

      <View style={styles.resultsContainer}>
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContent}
          ListHeaderComponent={
            submittedQuery ? (
              <Text style={styles.resultsTitle}>Results for: {submittedQuery}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.resultCard}>
              <Text style={styles.resultName}>{item.name}</Text>
              {!!item.address && <Text style={styles.resultAddress}>{item.address}</Text>}
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
                <Pressable
                  style={[
                    styles.addToItineraryButton,
                    itineraryIds.includes(item.id) && styles.addToItineraryButtonAdded,
                  ]}
                  onPress={() => addToItinerary(item.id)}
                >
                  <Text style={styles.addToItineraryButtonText}>
                    {itineraryIds.includes(item.id) ? "Added" : "Add to Itinerary"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
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
      </View>

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
                          {review.author || "Anonymous"} {typeof review.rating === "number" ? `· ${review.rating}/5` : ""}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
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
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
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
    marginTop: 8,
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
  viewReviewsButtonText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },
  addToItineraryButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  addToItineraryButtonAdded: {
    backgroundColor: "#374151",
  },
  addToItineraryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtitle: {
    color: "#D1D5DB",
    fontSize: 14,
    marginTop: 4,
  },
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
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  modalAddress: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  modalScroll: {
    marginTop: 10,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
    marginBottom: 6,
  },
  modalMuted: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  modalLoadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  modalErrorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  reviewMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
});
