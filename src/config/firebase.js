// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';


// TODO: Add SDKs for Firebase products that you want to use

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_apiKey,
  authDomain: process.env.EXPO_PUBLIC_authDomain,
  projectId: process.env.EXPO_PUBLIC_projectId,
  storageBucket: process.env.EXPO_PUBLIC_storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_messagingSenderId,
  appId: process.env.EXPO_PUBLIC_appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Auth specifically for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export { auth };
