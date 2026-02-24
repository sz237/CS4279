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
  View,
} from "react-native";
import { placeDetails, placesTextSearch } from "@/lib/googleplaces";

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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Find Activities</Text>
        <Text style={styles.subheading}>
          Search by location and optional activity type.
        </Text>

        <View style={styles.searchCard}>
          <View style={styles.inputRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Location (e.g. Austin, TX)"
              value={location}
              onChangeText={setLocation}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="walk-outline" size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Activity (optional, e.g. hiking)"
              value={activity}
              onChangeText={setActivity}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
          </View>

          <Pressable
            style={[styles.searchButton, !canSearch && styles.searchButtonDisabled]}
            onPress={runSearch}
            disabled={!canSearch}
          >
            <Text style={styles.searchButtonText}>
              {busy ? "Searching..." : "Search Activities"}
            </Text>
          </Pressable>

          {!!error && <Text style={styles.errorText}>{error}</Text>}
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
            <Pressable style={styles.resultCard} onPress={() => openResultDetails(item)}>
              <Text style={styles.resultName}>{item.name}</Text>
              {!!item.address && <Text style={styles.resultAddress}>{item.address}</Text>}
              <View style={styles.metaRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.metaText}>
                  {item.rating ?? "—"} ({item.reviewCount ?? 0})
                </Text>
              </View>
            </Pressable>
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
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subheading: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 14,
  },
  searchCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 10,
    paddingLeft: 8,
  },
  searchButton: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  searchButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  errorText: {
    marginTop: 8,
    color: "#B91C1C",
    fontSize: 13,
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
