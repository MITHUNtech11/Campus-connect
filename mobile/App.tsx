/**
 * CampusConnect mobile — Expo/React Native port of frontend/.
 *
 * This file is the RN counterpart of frontend/src/App.tsx's <Shell/>: it owns
 * the three things that sit above every screen —
 *   1. the auth provider,
 *   2. the onboarding modal, shown whenever `!user.onboarding_completed`
 *      (same gate as Shell()),
 *   3. the Campus Copilot FAB, mounted once for the whole authenticated app.
 *
 * The API base URL comes from EXPO_PUBLIC_API_URL — see mobile/.env.example.
 */

import './global.css';

import { StatusBar } from 'expo-status-bar';
import { Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import Copilot from './src/components/Copilot';
import { FullPageSpinner } from './src/components/ui';
import type { RootStackParamList } from './src/navigation/types';

/**
 * A container ref rather than useNavigation(): the Copilot is rendered outside
 * any screen, so it has no screen-level navigation object to read.
 */
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  // All four weights the app actually uses (see ui.tsx's font-normal/medium/
  // semibold/bold Text). Only Poppins_400Regular is wired up as the default
  // (src/components/Text.tsx, tailwind.config.js) — loading the rest here
  // just makes them available to the OS's synthetic-bold fallback.
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 bg-slate-50">
          <FullPageSpinner />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Shell />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { user, loading, refreshUser } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <FullPageSpinner />
      </View>
    );
  }

  const needsOnboarding = !!user && !user.onboarding_completed;

  return (
    <View className="flex-1 bg-slate-50">
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>

      {/* onboarding_completed comes straight from public.users. */}
      {!!user && needsOnboarding && (
        <Modal visible transparent animationType="fade">
          <OnboardingScreen user={user} onComplete={() => refreshUser()} />
        </Modal>
      )}

      {!!user && !needsOnboarding && (
        <Copilot
          onOpenProfile={(id) => {
            if (navigationRef.isReady()) navigationRef.navigate('Profile', { id });
          }}
        />
      )}
    </View>
  );
}
