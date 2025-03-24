import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AppNavigator from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ignore specific firebase-related warnings
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  '@firebase/firestore',
]);

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [initializing]);

  if (initializing) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{ marginTop: 10, fontSize: 16 }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppNavigator user={user} />
    </SafeAreaProvider>
  );
}
