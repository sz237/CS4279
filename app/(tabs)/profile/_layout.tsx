import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit"
        options={{
          title: "Edit Profile",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="past-trips"
        options={{
          title: "Past Trips",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Push Notifications",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="follow-list"
        options={{
          title: "Connections",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: "Privacy & Security",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: "Help & Support",
          headerBackTitle: "Profile",
        }}
      />
    </Stack>
  );
}