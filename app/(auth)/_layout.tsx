import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import your screen components
import LoginScreen from "./login";
import SignUpScreen from "./signup";

export default function AuthLayout() {
  const [activeTab, setActiveTab] = useState("signin");
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 64,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center mb-8">
        <Text className="text-4xl font-bold text-foreground">Nomad</Text>
      </View>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full max-w-[400px] mx-auto flex-col"
      >
        <TabsList className="flex-row w-full mb-3">
          <TabsTrigger value="signin" className="flex-1">
            <Text>Sign In</Text>
          </TabsTrigger>
          <TabsTrigger value="signup" className="flex-1">
            <Text>Sign Up</Text>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          {/* Render the Login logic directly */}
          <LoginScreen onSwitchToSignUp={() => setActiveTab("signup")} />
        </TabsContent>

        <TabsContent value="signup">
          {/* Render the SignUp logic directly */}
          <SignUpScreen onSwitchToLogin={() => setActiveTab("signin")} />
        </TabsContent>
      </Tabs>
    </ScrollView>
  );
}
