import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '../components/useColorScheme';
import { AppProvider, useAppContext } from '../context/AppContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isGuest, isStorageLoaded, authLoading, state } = useAppContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isStorageLoaded || authLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const hasSession = user !== null || isGuest;

    if (!hasSession && !inAuthGroup) {
      // Redirect to authorization if no active session
      router.replace('/auth');
    } else if (hasSession) {
      if (!state.onboardingComplete && !inOnboardingGroup) {
        // Enforce onboarding questionnaire if not complete
        router.replace('/onboarding');
      } else if (state.onboardingComplete && (inAuthGroup || inOnboardingGroup)) {
        // Redirect to main tabs when logged in and onboarding is completed
        router.replace('/(tabs)');
      }
    }
  }, [user, isGuest, isStorageLoaded, authLoading, state.onboardingComplete, segments]);

  if (!isStorageLoaded || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ presentation: 'card', title: 'Рецепт', headerTintColor: '#f43f5e', headerTitleStyle: { fontFamily: 'SpaceMono' } }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

