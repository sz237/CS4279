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
import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

interface SignUpFormProps {
  handleSignUp: (email: string, password: string, displayName: string, username: string) => void;
}

export function SignUpForm({ handleSignUp, onSwitchToLogin }: SignUpFormProps & { onSwitchToLogin: () => void }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const [showPassword, setShowPassword] = React.useState(false);

  const lastNameRef = React.useRef<TextInput>(null);
  const usernameRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  function onSubmit() {
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (firstName && lastName && username && email && password) {
      handleSignUp(email, password, displayName, username);
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
        <CardContent className="gap-4">
          <View className="gap-4">

            {/* First + Last name side by side */}
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={setFirstName}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  returnKeyType="next"
                  submitBehavior="submit"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  ref={lastNameRef}
                  id="lastName"
                  placeholder="Doe"
                  autoComplete="family-name"
                  autoCapitalize="words"
                  value={lastName}
                  onChangeText={setLastName}
                  onSubmitEditing={() => usernameRef.current?.focus()}
                  returnKeyType="next"
                  submitBehavior="submit"
                />
              </View>
            </View>

            <View className="gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                ref={usernameRef}
                id="username"
                placeholder="e.g. jane_doe"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                onSubmitEditing={() => emailRef.current?.focus()}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                placeholder="j_doe@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="password">Password</Label>
              <View className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                  className="pr-10"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            <Button className="w-full" onPress={onSubmit}>
              <Text>Continue</Text>
            </Button>
          </View>

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
