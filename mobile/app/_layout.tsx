import { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { useUserStore } from '../store/userStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import VoiceSearchDialog from '../components/VoiceSearchDialog';
import { NotificationProvider } from '../context/NotificationContext';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      retry: 2,
    },
  },
});

// Clerk token cache is provided by @clerk/expo/token-cache (SecureStore-backed)

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const syncProfile = useUserStore((s) => s.syncProfile);
  const fetchAddress = useUserStore((s) => s.fetchAddress);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const lastSyncedId = useRef<string | null>(null);

  // Auth routing guard
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoaded, segments]);

  // Activate hardware back button for entire application
  useEffect(() => {
    const onBackPress = () => {
      const currentSegment = (segments[segments.length - 1] as string) || '';
      const isRoot = !currentSegment || currentSegment === '(tabs)' || currentSegment === 'index';

      if (router.canGoBack()) {
        router.back();
        return true;
      } else if (!isRoot && isSignedIn) {
        router.replace('/(tabs)');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router, segments, isSignedIn]);

  // Sync user data on sign-in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (lastSyncedId.current === user.id) return;

    lastSyncedId.current = user.id;

    syncProfile({
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName || user.firstName || user.username || 'User',
      avatar_url: user.imageUrl,
      phone: user.primaryPhoneNumber?.phoneNumber,
    })
      .then(() => {
        fetchCart(user.id);
        fetchWishlist(user.id);
        fetchAddress(user.id);
      })
      .catch(() => {
        lastSyncedId.current = null;
      });
  }, [isLoaded, isSignedIn, user]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {}
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBarStyle('dark-content');
      RNStatusBar.setBackgroundColor(colors.surface);
      RNStatusBar.setTranslucent(true);
    }
  }, []);

  useEffect(() => {
    // Safety fallback: ensure splash screen hides even if Clerk or fonts take time
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 800);
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <ClerkLoaded>
            <QueryClientProvider client={queryClient}>
              <NotificationProvider>
                <RNStatusBar backgroundColor={colors.surface} barStyle="dark-content" translucent={true} />
                <StatusBar style="dark" />
                <AuthGate />
                <VoiceSearchDialog />
              </NotificationProvider>
            </QueryClientProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </View>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
