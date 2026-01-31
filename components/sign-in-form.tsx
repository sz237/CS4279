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
import { Pressable, type TextInput, View } from 'react-native';

// Explicitly defining the props for TypeScript
interface SignInFormProps {
  handleSignIn: (email: string, password: string) => void;
}

export function SignInForm({ handleSignIn, onSwitchToSignUp }: SignInFormProps & { onSwitchToSignUp: () => void }) {
  // 1. Initialize local state to track user input
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const router = useRouter();
  
  const passwordInputRef = React.useRef<TextInput>(null);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  // 2. Wrap the handler to pass the local state variables
  function onSubmit() {
    if (email && password) {
      handleSignIn(email, password);
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Sign in to your app</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome back! Please sign in to continue
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
                // 3. Bind input value and update state on change
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
                <Button
                  variant="link"
                  size="sm"
                  className="web:h-fit ml-auto h-4 px-1 py-0 sm:h-4"
                  onPress={() => {
                    // TODO: Add Forgot Password logic
                  }}>
                  <Text className="font-normal leading-4">Forgot your password?</Text>
                </Button>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                // 4. Bind input value and update state on change
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

          <Text className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Text 
              className="text-sm underline underline-offset-4 text-primary font-medium"
              onPress={onSwitchToSignUp}
            >
              Sign up
            </Text>
          </Text>

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