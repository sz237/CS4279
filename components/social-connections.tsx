import * as React from 'react';
import { Image, Platform, View, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/src/config/firebase'; // Ensure this points to your config
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';

const SOCIAL_CONNECTION_STRATEGIES = [
  {
    type: 'oauth_apple',
    source: { uri: 'https://img.clerk.com/static/apple.png?width=160' },
    useTint: true,
  },
];

export function SocialConnections() {
  const { colorScheme } = useColorScheme();

  const handleAppleSignIn = async () => {
    try {
      // 1. Trigger the native Apple Sign-In dialog
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleCredential;

      if (identityToken) {
        // 2. Create a Firebase credential from the Apple token
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: identityToken,
        });

        // 3. Sign in to Firebase with the credential
        await signInWithCredential(auth, credential);
        console.log("Successfully signed in with Apple");
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User closed the modal, no action needed
        return;
      }
      Alert.alert("Apple Sign-In Error", e.message);
    }
  };

  return (
    <View className="gap-2 sm:flex-row sm:gap-3 flex-row justify-evenly">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => {
        return (
          <Button
            key={strategy.type}
            variant="outline"
            size="lg"
            className="sm:flex-1"
            onPress={strategy.type === 'oauth_apple' ? handleAppleSignIn : undefined}
          >
            <Image
              className={cn('size-4', strategy.useTint && Platform.select({ web: 'dark:invert' }))}
              tintColor={Platform.select({
                native: strategy.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
              })}
              source={strategy.source}
            />
          </Button>
        );
      })}
    </View>
  );
}