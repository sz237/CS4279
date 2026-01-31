import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

// Updated interface to match your usage
interface SignUpFormProps {
  handleSignUp: (email: string, password: string) => void;
}

export function SignUpForm({ handleSignUp, onSwitchToLogin }: SignUpFormProps & { onSwitchToLogin: () => void }) {
  // 1. Initialize state for email and password
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const router = useRouter();
  
  const passwordInputRef = React.useRef<TextInput>(null);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  // 2. Pass the email and password state to the handler
  function onSubmit() {
    if (email && password) {
      handleSignUp(email, password);
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create your account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome! Please fill in the details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                // 3. Update state on change
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">Password</Label>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                // 4. Update state on change
                value={password}
                onChangeText={setPassword}
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
            </View>
            <Button className="w-full" onPress={onSubmit}>
              <Text>Continue</Text>
            </Button>
          </View>
          
          {/* Note: In your toggle setup, you might want to use the onSwitchToLogin prop here instead of a Link */}
          <View className="flex-row justify-center items-center gap-1">
            <Text className="text-sm text-muted-foreground">
              Already have an account?
            </Text>
            <Pressable onPress={onSwitchToLogin}>
              <Text className="text-sm underline underline-offset-4 text-primary font-medium">
                Sign in
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground px-4 text-sm">or</Text>
            <Separator className="flex-1" />
          </View>
          <SocialConnections />
        </CardContent>
      </Card>
    </View>
  );
}