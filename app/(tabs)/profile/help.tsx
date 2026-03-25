import * as Linking from "expo-linking";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

function EmailRow({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-base font-semibold text-gray-900">{name}</Text>
      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${email}`)} activeOpacity={0.85}>
        <Text className="mt-1 text-base text-indigo-600 underline">{email}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HelpScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20 }}>
      <Text className="mb-4 text-xl font-semibold text-gray-900">
        Contact the Nomad team at:
      </Text>

      <EmailRow name="Tamara Quiroz" email="tamara.regalado.quiroz@vanderbilt.edu" />
      <EmailRow name="Sarah Zeng" email="sarah.d.zeng@vanderbilt.edu" />
      <EmailRow name="Trieu Truong" email="trieu.vy.truong@vanderbilt.edu" />
      <EmailRow name="Rosalyn Lu" email="rosalyn.lu@vanderbilt.edu" />
    </ScrollView>
  );
}