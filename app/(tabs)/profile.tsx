import { auth } from "@/src/config/firebase";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 text-base font-bold text-gray-900">{title}</Text>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-3">
      <Ionicons name={icon} size={22} color="#94A3B8" />
      <View className="ml-3 flex-1">
        <Text className="text-lg font-medium text-gray-900">{title}</Text>
        <Text className="text-sm text-slate-500">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#CBD5E1", true: "#0F172A" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable className="flex-row items-center py-4">
      <Ionicons name={icon} size={22} color="#94A3B8" />
      <View className="ml-3 flex-1">
        <Text className="text-lg font-medium text-gray-900">{title}</Text>
        <Text className="text-sm text-slate-500">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
    </Pressable>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function MemberRow({ name, email }: { name: string; email: string }) {
  const initials = initialsFromName(name);

  return (
    <View className="flex-row items-center py-4">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-200">
        <Text className="text-xl font-medium text-slate-700">{initials}</Text>
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-lg font-medium text-gray-900">{name}</Text>
        <Text className="text-base text-slate-500">{email}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const userEmail = auth.currentUser?.email ?? "No email listed";

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert("Error Signing Out", error?.message ?? "Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-5 text-3xl font-bold text-gray-900">Profile</Text>

        <Card className="mb-5">
          <View className="flex-row items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-indigo-100">
              <Text className="text-2xl text-indigo-600">SC</Text>
            </View>
            <View className="ml-4 flex-1">
              <View className="flex-row items-center">
                <Text className="text-3xl font-semibold text-gray-900">
                  Sarah Chen
                </Text>
              </View>
              <Text className="mt-1 text-base text-slate-500">{userEmail}</Text>
              <Pressable className="mt-2">
                <Text className="text-base text-indigo-600">Edit Profile</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <View className="mb-5">
          <SectionHeader title="Group Members" />
          <Card className="p-0">
            <View className="px-4">
              <MemberRow name="Sarah Chen" email="sarah@email.com" />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <MemberRow name="Mike Torres" email="mike@email.com" />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <MemberRow name="Emma Wilson" email="emma@email.com" />
            </View>
          </Card>
        </View>

        <View className="mb-5">
          <SectionHeader title="Settings" />
          <Card className="p-0">
            <View className="px-4">
              <SettingRow
                icon="notifications-outline"
                title="Push Notifications"
                subtitle="Get updates about trip changes"
                value={pushEnabled}
                onValueChange={setPushEnabled}
              />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <SettingRow
                icon="calendar-outline"
                title="Daily Memory Reminders"
                subtitle="Reminder to log your day at 9 PM"
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
              />
            </View>
          </Card>
        </View>

        <View className="mb-5">
          <Card className="p-0">
            <View className="px-4">
              <NavRow
                icon="settings-outline"
                title="Trip Settings"
                subtitle="Manage trip details and preferences"
              />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <NavRow
                icon="shield-checkmark-outline"
                title="Privacy & Security"
                subtitle="Control your data and privacy"
              />
            </View>
            <View className="h-px bg-gray-100" />
            <View className="px-4">
              <NavRow
                icon="help-circle-outline"
                title="Help & Support"
                subtitle="Get help or send feedback"
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 bg-gray-50 px-5 pb-6 pt-3">
        <Card className="p-0">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center py-4"
          >
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text className="ml-2 text-lg font-medium text-red-600">
              Log Out
            </Text>
          </Pressable>
        </Card>
      </View>
    </View>
  );
}
