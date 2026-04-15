import { SignUpForm } from '@/components/sign-up-form';
import { auth } from '@/src/config/firebase';
import { updateCurrentUserProfile } from '@/src/services/profile';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Alert, View } from 'react-native';

export default function SignUpScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const handleSignUp = async (email: string, password: string, displayName: string, username: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await updateCurrentUserProfile({ displayName, username, bio: '', photoURL: null });
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