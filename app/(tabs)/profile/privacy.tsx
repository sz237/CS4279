import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

function LinkButton({
  title,
  subtitle,
  url,
}: {
  title: string;
  subtitle: string;
  url: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.85}
      className="mb-3 rounded-2xl border border-gray-200 bg-white p-4"
    >
      <View className="flex-row items-center">
        <Ionicons name="open-outline" size={20} color="#4F46E5" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-gray-900">{title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PrivacyScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20 }}>
      <View className="rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="text-xl font-semibold text-gray-900">
          Firebase Privacy & Security
        </Text>

        <Text className="mt-4 text-base leading-6 text-slate-700">
          Nomad uses Firebase services for authentication and data storage. Firebase’s
          official privacy and security guidance explains how Firebase helps protect
          project data, how developers should handle user privacy, and which security
          best practices to follow when building and launching an app.
        </Text>

        <Text className="mt-4 text-base leading-6 text-slate-700">
          For the official and most current information, use the links below.
        </Text>
      </View>

      <View className="mt-4">
        <LinkButton
          title="Firebase Privacy and Security"
          subtitle="Official Firebase privacy and security overview"
          url="https://firebase.google.com/support/privacy"
        />
        <LinkButton
          title="Firebase Security Checklist"
          subtitle="Official checklist for securing Firebase apps"
          url="https://firebase.google.com/support/guides/security-checklist"
        />
      </View>
    </ScrollView>
  );
}