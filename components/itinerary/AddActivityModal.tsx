import { placesTextSearch } from "@/lib/googleplaces";
import type { InterestTag } from "@/src/models/trip";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ManualStopInput {
  name: string;
  address: string;
  timeLabel: string;
  duration: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
}

type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingCount?: number;
};

const TIME_OPTIONS = ["Morning", "Noon", "Afternoon", "Evening"] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

const DURATION_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
  { label: "3 hr", minutes: 180 },
] as const;

const STEP = 5;
const MIN_DURATION = 5;
const MAX_DURATION = 480;

type EntryMode = "search" | "manual";

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export interface ActivityPrefill {
  name: string;
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
}

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (input: ManualStopInput) => void;
  defaultTimeLabel?: string;
  locationBias?: { lat: number; lng: number };
  prefill?: ActivityPrefill;

  interestTags?: InterestTag[];
  onPressInterestTag?: (tag: InterestTag) => void;
}

export default function AddActivityModal({
  visible,
  onClose,
  onAdd,
  defaultTimeLabel,
  locationBias,
  prefill,
  interestTags = [],
}: AddActivityModalProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>("search");

  const [timeLabel, setTimeLabel] = useState<TimeOption | "">("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const { bottom: bottomInset } = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (defaultTimeLabel) {
      const match = TIME_OPTIONS.find(
        (o) => o.toLowerCase() === defaultTimeLabel.toLowerCase()
      );
      setTimeLabel(match ?? "");
    }

    if (prefill) {
      setEntryMode("search");
      setSearchQuery(prefill.name);
      setSearchAddress(prefill.address);
      setSelectedPlace({
        id: prefill.placeId ?? "",
        name: prefill.name,
        address: prefill.address,
        lat: prefill.lat ?? 0,
        lng: prefill.lng ?? 0,
        rating: prefill.rating,
        userRatingCount: prefill.userRatingCount,
      });
    }
  }, [visible, defaultTimeLabel, prefill]);

  useEffect(() => {
    if (!visible) {
      setEntryMode("search");
      setTimeLabel("");
      setDurationMinutes(null);
      setSearchQuery("");
      setSelectedPlace(null);
      setSearchResults([]);
      setSearching(false);
      setSearchAddress("");
      setManualName("");
      setManualAddress("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [visible]);

  function switchMode(mode: EntryMode) {
    if (mode === entryMode) return;

    setEntryMode(mode);
    setSearchQuery("");
    setSelectedPlace(null);
    setSearchResults([]);
    setSearching(false);
    setSearchAddress("");
    setManualName("");
    setManualAddress("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    Keyboard.dismiss();
  }

  function handleSearchQueryChange(text: string) {
    setSearchQuery(text);
    setSelectedPlace(null);
    setSearchAddress("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await placesTextSearch(text.trim(), locationBias);
        setSearchResults(
          raw.slice(0, 5).map((p) => ({
            id: p.id,
            name: p.displayName?.text ?? "Unnamed place",
            address: p.formattedAddress ?? "",
            lat: p.location?.latitude ?? 0,
            lng: p.location?.longitude ?? 0,
            rating: p.rating,
            userRatingCount: p.userRatingCount,
          }))
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function handleSelectPlace(place: PlaceResult) {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSearchAddress(place.address);
    setSearchResults([]);
    setSearching(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    Keyboard.dismiss();
  }

  function handleAdd() {
    const name =
      entryMode === "search" ? searchQuery.trim() : manualName.trim();

    if (!name) return;

    onAdd({
      name,
      address:
        entryMode === "search" ? searchAddress.trim() : manualAddress.trim(),
      timeLabel,
      duration: formatDuration(durationMinutes),
      placeId: entryMode === "search" ? selectedPlace?.id : undefined,
      lat: entryMode === "search" ? selectedPlace?.lat : undefined,
      lng: entryMode === "search" ? selectedPlace?.lng : undefined,
      rating: entryMode === "search" ? selectedPlace?.rating : undefined,
      userRatingCount:
        entryMode === "search" ? selectedPlace?.userRatingCount : undefined,
    });
  }

  const showResults =
    entryMode === "search" &&
    (searchResults.length > 0 || searching) &&
    !selectedPlace;

  const canAdd =
    entryMode === "search"
      ? searchQuery.trim().length > 0
      : manualName.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "flex-end" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              className="bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: "90%" }}
            >
              <View className="w-10 h-1 bg-gray-200 rounded-full self-center mt-3 mb-1" />

              <View className="flex-row items-center justify-between px-6 pt-3 pb-4">
                <Text className="text-xl font-bold text-gray-900">
                  Add Activity
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View className="px-6 mb-5">
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#F3F4F6",
                    borderRadius: 12,
                    padding: 3,
                  }}
                >
                  {(["search", "manual"] as EntryMode[]).map((mode) => {
                    const isActive = entryMode === mode;

                    return (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => switchMode(mode)}
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
                          name={
                            mode === "search"
                              ? "search-outline"
                              : "create-outline"
                          }
                          size={14}
                          color={isActive ? "#7C3AED" : "#9CA3AF"}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: isActive ? "#7C3AED" : "#9CA3AF",
                          }}
                        >
                          {mode === "search" ? "Search a Place" : "Add Manually"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 7,
                    textAlign: "center",
                  }}
                >
                  {entryMode === "search"
                    ? "Find a restaurant, landmark, or attraction"
                    : "Name it anything — your Airbnb, a friend's place, etc."}
                </Text>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingBottom: bottomInset + 24,
                }}
              >

                {/* ── INTEREST SEARCH ── */}
                {(interestTags?.length ?? 0) > 0 && (
                  <View className="mb-5">
                    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Saved Interests
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {interestTags!
                        .slice()
                        .sort((a, b) => (b.voterUids?.length ?? 0) - (a.voterUids?.length ?? 0))
                        .map((tag) => (
                          <TouchableOpacity
                            key={tag.id}
                            activeOpacity={0.75}
                            onPress={() => {
                              setEntryMode("search");
                              setSearchQuery(tag.label);
                              setSelectedPlace(null);
                              setSearchAddress("");
                              handleSearchQueryChange(tag.label);
                            }}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 999,
                              backgroundColor: "#F5F3FF",
                              borderWidth: 1,
                              borderColor: "#DDD6FE",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "600",
                                color: "#7C3AED",
                              }}
                            >
                              {tag.label}
                            </Text>

                            <View
                              style={{
                                minWidth: 20,
                                height: 20,
                                paddingHorizontal: 6,
                                borderRadius: 999,
                                backgroundColor: "#7C3AED",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: "#fff",
                                }}
                              >
                                {tag.voterUids?.length ?? 0}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}

                {/* ── SEARCH MODE ── */}
                {entryMode === "search" && (
                  <>
                    <View className="mb-1">
                      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Search
                      </Text>
                      <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 gap-2">
                        <Ionicons
                          name="search-outline"
                          size={16}
                          color="#9CA3AF"
                        />
                        <TextInput
                          value={searchQuery}
                          onChangeText={handleSearchQueryChange}
                          placeholder="Restaurant, museum, park…"
                          placeholderTextColor="#D1D5DB"
                          className="flex-1 text-gray-900 text-sm"
                          autoCorrect={false}
                          returnKeyType="search"
                        />
                        {searching && (
                          <ActivityIndicator size="small" color="#7C3AED" />
                        )}
                        {selectedPlace && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#7C3AED"
                          />
                        )}
                        {searchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              setSearchQuery("");
                              setSearchAddress("");
                              setSelectedPlace(null);
                              setSearchResults([]);
                            }}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="#D1D5DB"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {showResults && (
                      <View
                        className="mb-3 border border-gray-100 rounded-xl overflow-hidden bg-white"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.08,
                          shadowRadius: 12,
                          elevation: 4,
                        }}
                      >
                        {searching && searchResults.length === 0 ? (
                          <View className="px-4 py-3 flex-row items-center gap-2">
                            <ActivityIndicator size="small" color="#7C3AED" />
                            <Text className="text-sm text-gray-400">
                              Searching…
                            </Text>
                          </View>
                        ) : (
                          searchResults.map((place, idx) => (
                            <TouchableOpacity
                              key={place.id}
                              onPress={() => handleSelectPlace(place)}
                              activeOpacity={0.7}
                              className={`px-4 py-3 flex-row items-start gap-3 ${
                                idx < searchResults.length - 1
                                  ? "border-b border-gray-50"
                                  : ""
                              }`}
                            >
                              <View className="w-7 h-7 rounded-full bg-violet-50 items-center justify-center mt-0.5">
                                <Ionicons
                                  name="location-outline"
                                  size={14}
                                  color="#7C3AED"
                                />
                              </View>
                              <View className="flex-1">
                                <Text
                                  className="text-sm font-semibold text-gray-900"
                                  numberOfLines={1}
                                >
                                  {place.name}
                                </Text>
                                {!!place.address && (
                                  <Text
                                    className="text-xs text-gray-400 mt-0.5"
                                    numberOfLines={1}
                                  >
                                    {place.address}
                                  </Text>
                                )}
                              </View>
                              {place.rating != null && (
                                <View className="flex-row items-center gap-1 mt-0.5">
                                  <Ionicons
                                    name="star"
                                    size={11}
                                    color="#F59E0B"
                                  />
                                  <Text className="text-xs text-gray-500">
                                    {place.rating}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}

                    {selectedPlace && (
                      <View className="mb-4">
                        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Address{" "}
                          <Text
                            style={{
                              color: "#7C3AED",
                              fontWeight: "400",
                              textTransform: "none",
                            }}
                          >
                            · from search
                          </Text>
                        </Text>
                        <TextInput
                          value={searchAddress}
                          onChangeText={setSearchAddress}
                          placeholderTextColor="#D1D5DB"
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
                        />
                      </View>
                    )}
                  </>
                )}

                {entryMode === "manual" && (
                  <>
                    <View className="mb-4">
                      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Place Name <Text className="text-red-400">*</Text>
                      </Text>
                      <TextInput
                        value={manualName}
                        onChangeText={setManualName}
                        placeholder="e.g. My Airbnb, Sarah's apartment…"
                        placeholderTextColor="#D1D5DB"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
                        autoCorrect={false}
                      />
                    </View>

                    <View className="mb-4">
                      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Address{" "}
                        <Text className="text-gray-400 normal-case font-normal">
                          · Optional
                        </Text>
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginBottom: 8,
                          lineHeight: 16,
                        }}
                      >
                        Helps estimate travel time to your next stop.
                      </Text>
                      <TextInput
                        value={manualAddress}
                        onChangeText={setManualAddress}
                        placeholder="e.g. 123 Congress Ave, Austin TX"
                        placeholderTextColor="#D1D5DB"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
                        autoCorrect={false}
                        returnKeyType="done"
                      />
                    </View>
                  </>
                )}

                <View className="mb-4">
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Time of Day
                  </Text>
                  <View className="flex-row gap-2">
                    {TIME_OPTIONS.map((option) => {
                      const isSelected = timeLabel === option;

                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setTimeLabel(isSelected ? "" : option)}
                          activeOpacity={0.75}
                          className={`flex-1 py-2 rounded-xl items-center border ${
                            isSelected
                              ? "bg-violet-600 border-violet-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isSelected ? "text-white" : "text-gray-500"
                            }`}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Duration <Text className="text-gray-400">· Optional</Text>
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                  >
                    {DURATION_PRESETS.map((preset) => {
                      const isSelected = durationMinutes === preset.minutes;

                      return (
                        <TouchableOpacity
                          key={preset.minutes}
                          onPress={() =>
                            setDurationMinutes(
                              isSelected ? null : preset.minutes
                            )
                          }
                          activeOpacity={0.75}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: isSelected ? "#7C3AED" : "#E5E7EB",
                            backgroundColor: isSelected ? "#7C3AED" : "#F9FAFB",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: isSelected ? "#fff" : "#6B7280",
                            }}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F9FAFB",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setDurationMinutes((prev) =>
                          prev === null
                            ? null
                            : prev - STEP < MIN_DURATION
                              ? null
                              : prev - STEP
                        )
                      }
                      disabled={!durationMinutes}
                      activeOpacity={0.6}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        opacity: durationMinutes ? 1 : 0.3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "300",
                          color: "#374151",
                          lineHeight: 24,
                        }}
                      >
                        −
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1, alignItems: "center" }}>
                      {durationMinutes ? (
                        <Text
                          style={{
                            fontSize: 17,
                            fontWeight: "700",
                            color: "#111827",
                          }}
                        >
                          {formatDuration(durationMinutes)}
                        </Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#D1D5DB",
                            fontWeight: "500",
                          }}
                        >
                          Tap to set
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        setDurationMinutes((prev) => {
                          const next = (prev ?? 0) + STEP;
                          return next > MAX_DURATION ? prev : next;
                        })
                      }
                      disabled={(durationMinutes ?? 0) >= MAX_DURATION}
                      activeOpacity={0.6}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        opacity:
                          (durationMinutes ?? 0) >= MAX_DURATION ? 0.3 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "300",
                          color: "#7C3AED",
                          lineHeight: 24,
                        }}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleAdd}
                  disabled={!canAdd}
                  className={`rounded-2xl py-4 items-center ${
                    canAdd ? "bg-violet-600" : "bg-gray-200"
                  }`}
                  activeOpacity={0.85}
                >
                  <Text
                    className={`font-semibold text-base ${
                      canAdd ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Add to Itinerary
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}