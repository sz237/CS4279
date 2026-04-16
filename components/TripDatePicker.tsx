import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = "#7C3AED";
const ACCENT_LIGHT = "#EDE9FE";
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Types ─────────────────────────────────────────────────────────────────────
type TripType = "one-day" | "multi-day";
type ActiveTab = "depart" | "return";

export type TripDatePickerProps = {
  visible: boolean;
  initialDeparture?: Date;
  initialReturn?: Date;
  minDate?: Date;
  onCancel: () => void;
  onConfirm: (departure: Date, returnDate?: Date) => void;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHeader(d: Date | null): string {
  if (!d) return "—";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}/${d.getFullYear()}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function TripDatePicker({
  visible,
  initialDeparture,
  initialReturn,
  minDate,
  onCancel,
  onConfirm,
}: TripDatePickerProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const today = useMemo(() => stripTime(new Date()), []);
  const min = minDate ? stripTime(minDate) : today;

  const [tripType, setTripType] = useState<TripType>("multi-day");
  const [departDate, setDepartDate] = useState<Date | null>(
    initialDeparture ? stripTime(initialDeparture) : null
  );
  const [returnDate, setReturnDate] = useState<Date | null>(
    initialReturn ? stripTime(initialReturn) : null
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("depart");
  const [viewYear, setViewYear] = useState(
    initialDeparture?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    initialDeparture?.getMonth() ?? today.getMonth()
  );

  // Theme colours
  const sheetBg   = isDark ? "#1C1C1E" : "#F2F2F7";
  const cardBg    = isDark ? "#2C2C2E" : "#FFFFFF";
  const textPrimary   = isDark ? "#F9FAFB" : "#18181B";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const textDisabled  = isDark ? "#4B5563" : "#D1D5DB";
  const divider       = isDark ? "#3A3A3C" : "#E5E7EB";

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Build rows of 7 cells (null = empty padding cell)
  const rows = useMemo(() => {
    const cells: Array<number | null> = [
      ...Array(firstDayOfWeek).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Pad last row to multiple of 7
    while (cells.length % 7 !== 0) cells.push(null);
    const result: Array<Array<number | null>> = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── Day press ────────────────────────────────────────────────────────────────
  const handleDayPress = (day: number) => {
    const tapped = new Date(viewYear, viewMonth, day);
    if (tapped < min) return;

    if (tripType === "one-day") {
      setDepartDate(tapped);
      setReturnDate(null);
      return;
    }

    if (activeTab === "depart") {
      setDepartDate(tapped);
      if (returnDate && tapped >= returnDate) setReturnDate(null);
      setActiveTab("return");
    } else {
      if (departDate && tapped < departDate) {
        // restart range
        setDepartDate(tapped);
        setReturnDate(null);
      } else {
        setReturnDate(tapped);
      }
    }
  };

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const isDoneEnabled =
    tripType === "one-day"
      ? departDate !== null
      : departDate !== null && returnDate !== null;

  const handleDone = () => {
    if (!departDate || !isDoneEnabled) return;
    onConfirm(departDate, tripType === "multi-day" ? returnDate ?? undefined : undefined);
  };

  // ── Per-day state ─────────────────────────────────────────────────────────────
  const getDayState = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const isPast   = date < min;
    const isToday  = sameDay(date, today);
    const isDepart = departDate ? sameDay(date, departDate) : false;
    const isReturn = returnDate ? sameDay(date, returnDate) : false;
    const inRange  =
      departDate && returnDate
        ? date > departDate && date < returnDate
        : false;
    return { isPast, isToday, isDepart, isReturn, inRange };
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        accessibilityViewIsModal
      >
        <View
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 36,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.14,
            shadowRadius: 20,
            elevation: 24,
          }}
        >
          {/* ── Trip type toggle ── */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 4,
              gap: 8,
            }}
          >
            {(["one-day", "multi-day"] as TripType[]).map(type => (
              <Pressable
                key={type}
                onPress={() => {
                  setTripType(type);
                  if (type === "one-day") setReturnDate(null);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: tripType === type }}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: tripType === type ? ACCENT : (isDark ? "#3A3A3C" : "#E5E7EB"),
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: tripType === type ? "#FFFFFF" : textSecondary,
                  }}
                >
                  {type === "one-day" ? "One Day" : "Multiple Days"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Calendar card ── */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: cardBg,
              borderRadius: 20,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {/* Depart / Return tabs — multi-day only */}
            {tripType === "multi-day" && (
              <View
                style={{
                  flexDirection: "row",
                  borderBottomWidth: 1,
                  borderBottomColor: divider,
                }}
              >
                {(["depart", "return"] as ActiveTab[]).map(tab => (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === tab }}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      borderBottomWidth: 2,
                      borderBottomColor: activeTab === tab ? ACCENT : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        marginBottom: 4,
                      }}
                    >
                      {tab}
                    </Text>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "700",
                        color: activeTab === tab ? ACCENT : textPrimary,
                      }}
                    >
                      {formatHeader(tab === "depart" ? departDate : returnDate)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Month header + nav */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 8,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "800", color: textPrimary }}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Pressable onPress={prevMonth} hitSlop={10} accessibilityLabel="Previous month">
                  <Ionicons name="chevron-back" size={20} color={textSecondary} />
                </Pressable>
                <Pressable onPress={nextMonth} hitSlop={10} accessibilityLabel="Next month">
                  <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Day-of-week labels */}
            <View style={{ flexDirection: "row", paddingHorizontal: 12, marginBottom: 2 }}>
              {DAYS.map(d => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: textSecondary }}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
              {rows.map((row, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: "row" }}>
                  {row.map((day, colIdx) => {
                    if (!day) {
                      return (
                        <View
                          key={`empty-${rowIdx}-${colIdx}`}
                          style={{ flex: 1, height: 46 }}
                        />
                      );
                    }

                    const { isPast, isToday, isDepart, isReturn, inRange } =
                      getDayState(day);

                    const showRangeStart = isDepart && returnDate !== null;
                    const showRangeEnd   = isReturn && departDate !== null;

                    return (
                      <Pressable
                        key={day}
                        onPress={() => handleDayPress(day)}
                        disabled={isPast}
                        accessibilityLabel={`${MONTHS[viewMonth]} ${day} ${viewYear}${isPast ? ", unavailable" : ""}${isDepart ? ", departure" : ""}${isReturn ? ", return" : ""}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isPast, selected: isDepart || isReturn }}
                        style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}
                      >
                        {/* Range fill: right-half on start date */}
                        {showRangeStart && (
                          <View
                            style={{
                              position: "absolute",
                              top: 5, bottom: 5,
                              left: "50%", right: 0,
                              backgroundColor: ACCENT_LIGHT,
                            }}
                          />
                        )}
                        {/* Range fill: left-half on end date */}
                        {showRangeEnd && (
                          <View
                            style={{
                              position: "absolute",
                              top: 5, bottom: 5,
                              left: 0, right: "50%",
                              backgroundColor: ACCENT_LIGHT,
                            }}
                          />
                        )}
                        {/* Range fill: full width on in-range days */}
                        {inRange && (
                          <View
                            style={{
                              position: "absolute",
                              top: 5, bottom: 5,
                              left: 0, right: 0,
                              backgroundColor: ACCENT_LIGHT,
                            }}
                          />
                        )}
                        {/* Selected circle */}
                        {(isDepart || isReturn) && (
                          <View
                            style={{
                              position: "absolute",
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: ACCENT,
                            }}
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: isDepart || isReturn ? "700" : inRange ? "500" : "400",
                            color:
                              isDepart || isReturn
                                ? "#FFFFFF"
                                : isPast
                                ? textDisabled
                                : inRange
                                ? ACCENT
                                : isToday
                                ? ACCENT
                                : textPrimary,
                            zIndex: 1,
                          }}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* ── Cancel / Done ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 16,
              gap: 12,
            }}
          >
            <Pressable
              onPress={onCancel}
              style={{ flex: 1, alignItems: "center", paddingVertical: 16 }}
              accessibilityLabel="Cancel date selection"
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: ACCENT }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDone}
              disabled={!isDoneEnabled}
              accessibilityLabel="Confirm date selection"
              accessibilityState={{ disabled: !isDoneEnabled }}
              style={{
                flex: 2,
                backgroundColor: isDoneEnabled ? ACCENT : (isDark ? "#3A3A3C" : "#E5E7EB"),
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: isDoneEnabled ? "#FFFFFF" : textSecondary,
                }}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
