import { SignUpForm } from '@/components/sign-up-form';
import { auth } from '@/src/config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React from 'react';
import { Alert, View } from 'react-native';

export default function SignUpScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const handleSignUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("Sign Up Error", error.message);
    }
  };

  return (
    <View className="gap-y-4">
      <SignUpForm handleSignUp={handleSignUp} onSwitchToLogin={onSwitchToLogin} />
    </View>
  );
}