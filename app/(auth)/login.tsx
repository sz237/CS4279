import { SignInForm } from '@/components/sign-in-form';
import { auth } from '@/src/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React from 'react';
import { Alert, View } from 'react-native';

export default function LoginScreen({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const handleSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("Sign In Error", error.message);
    }
  };

  return (
    <View className="gap-y-4">
      <SignInForm handleSignIn={handleSignIn} onSwitchToSignUp={onSwitchToSignUp} />
    </View>
  );
}