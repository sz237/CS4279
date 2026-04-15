import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

function getRecommendedCity(lovedCity: string): string {
  const city = lovedCity.toLowerCase();

  const buckets: Array<{ keywords: string[]; recommendations: string[] }> = [
    {
      keywords: ["new york", "nyc", "brooklyn", "manhattan"],
      recommendations: ["Chicago, IL", "Boston, MA", "Philadelphia, PA", "Washington, D.C."],
    },
    {
      keywords: ["los angeles", "la", "santa monica", "hollywood"],
      recommendations: ["San Francisco, CA", "San Diego, CA", "Seattle, WA", "Portland, OR"],
    },
    {
      keywords: ["san francisco", "sf", "bay area"],
      recommendations: ["Los Angeles, CA", "Portland, OR", "Seattle, WA", "Denver, CO"],
    },
    {
      keywords: ["miami", "fort lauderdale", "boca raton"],
      recommendations: ["New Orleans, LA", "Savannah, GA", "Charleston, SC", "Tampa, FL"],
    },
    {
      keywords: ["chicago"],
      recommendations: ["Detroit, MI", "Minneapolis, MN", "Milwaukee, WI", "Indianapolis, IN"],
    },
    {
      keywords: ["paris"],
      recommendations: ["Amsterdam", "Barcelona", "Prague", "Lisbon"],
    },
    {
      keywords: ["london"],
      recommendations: ["Edinburgh", "Dublin", "Amsterdam", "Copenhagen"],
    },
    {
      keywords: ["tokyo", "osaka", "kyoto"],
      recommendations: ["Seoul", "Taipei", "Bangkok", "Singapore"],
    },
    {
      keywords: ["barcelona", "madrid"],
      recommendations: ["Lisbon", "Seville", "Valencia", "Porto"],
    },
    {
      keywords: ["rome", "florence", "milan", "venice"],
      recommendations: ["Athens", "Dubrovnik", "Porto", "Barcelona"],
    },
    {
      keywords: ["cancun", "tulum", "playa del carmen"],
      recommendations: ["Cartagena, Colombia", "San Juan, Puerto Rico", "Havana, Cuba", "Nassau, Bahamas"],
    },
    {
      keywords: ["hawaii", "honolulu", "maui"],
      recommendations: ["Bali, Indonesia", "Fiji", "Maldives", "Tahiti"],
    },
    {
      keywords: ["bali"],
      recommendations: ["Chiang Mai", "Koh Samui", "Luang Prabang", "Yogyakarta"],
    },
    {
      keywords: ["dubai", "abu dhabi"],
      recommendations: ["Doha", "Marrakech", "Istanbul", "Muscat"],
    },
  ];

  for (const bucket of buckets) {
    if (bucket.keywords.some((kw) => city.includes(kw))) {
      const choices = bucket.recommendations;
      return choices[Math.floor(Math.random() * choices.length)];
    }
  }

  const fallbacks = [
    "Lisbon, Portugal",
    "Kyoto, Japan",
    "Cartagena, Colombia",
    "Cape Town, South Africa",
    "Prague, Czech Republic",
    "Queenstown, New Zealand",
    "Porto, Portugal",
    "Chiang Mai, Thailand",
    "Dubrovnik, Croatia",
    "Medellín, Colombia",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

type Props = {
  lovedCity: string;
  onDismiss: () => void;
  onPlanTrip: (city: string) => void;
};

export function TripRecommendationBanner({ lovedCity, onDismiss, onPlanTrip }: Props) {
  const recommendedCity = getRecommendedCity(lovedCity);

  return (
    <View
      style={{
        backgroundColor: UI.colors.cardBg,
        borderRadius: UI.radius.card,
        borderWidth: 1,
        borderColor: "#DDD6FE",
        padding: 16,
        marginBottom: 20,
        ...UI.shadow.card,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 12 }}>
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 999,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="star" size={18} color="#F59E0B" />
          </View>
          <Text
            style={{
              fontSize: UI.type.body,
              fontWeight: "700",
              color: UI.colors.textPrimary,
              flex: 1,
              flexWrap: "wrap",
            }}
          >
            You really enjoyed traveling in{" "}
            <Text style={{ color: UI.colors.brand }}>{lovedCity}</Text>!
          </Text>
        </View>

        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={18} color={UI.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <Text
        style={{
          fontSize: UI.type.body,
          color: UI.colors.textSecondary,
          marginTop: 10,
          marginBottom: 12,
          lineHeight: 20,
        }}
      >
        Here's another city we think you may like:
      </Text>

      {/* Recommendation pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: UI.colors.brandSoft,
          borderRadius: UI.radius.pill,
          alignSelf: "flex-start",
          paddingHorizontal: 14,
          paddingVertical: 8,
          marginBottom: 14,
        }}
      >
        <Ionicons name="location" size={14} color={UI.colors.brand} style={{ marginRight: 6 }} />
        <Text style={{ fontSize: UI.type.body, fontWeight: "700", color: UI.colors.brand }}>
          {recommendedCity}
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => onPlanTrip(recommendedCity)}
        style={{
          backgroundColor: UI.colors.brand,
          borderRadius: UI.radius.button,
          paddingVertical: 11,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: UI.type.body, fontWeight: "700" }}>
          Plan a Trip There
        </Text>
      </Pressable>
    </View>
  );
}
