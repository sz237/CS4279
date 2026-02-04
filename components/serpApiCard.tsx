import { Text, View } from "react-native";

export default function SerpApiCard({ item }: any) {
    return (
        <View className="mb-3 rounded-2xl border border-neutral-200 p-4">
            <Text className="text-base font-semibold">
                {item.title ?? "Untitled"}
            </Text>
        
            <Text className="mt-1 text-sm text-neutral-600">
                ⭐ {item.rating ?? "No rating"}
                {typeof item.reviews === "number" ? ` (${item.reviews})` : ""}
            </Text>
        
            {item.address ? (
                <Text className="mt-1 text-sm text-neutral-600">{item.address}</Text>
            ) : null}
        </View>
    )
}