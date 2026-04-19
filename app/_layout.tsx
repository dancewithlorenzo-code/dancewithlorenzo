import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { LanguageProvider } from '@/contexts/LanguageContext';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// ─── Splash screen — module-level setup ─────────────────────────────────────
// Step 1: Prevent auto-hide using promise chain — never throws synchronously.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Step 2: SAFETY NET — unconditional hide after 4 s.
// Fires even if every provider crashes and AppLayout never mounts.
let _safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 4000);

// Helper — clears safety timer then hides; all SplashScreen calls in try/catch.
async function hideSplashSafely() {
  try {
    if (_safetyTimer !== null) {
      clearTimeout(_safetyTimer);
      _safetyTimer = null;
    }
  } catch (_) {}
  try {
    await SplashScreen.hideAsync();
  } catch (_) {}
}

// ─── App layout (inside providers) ─────────────────────────────────────────
function AppLayout() {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // Small delay so providers can finish their first render cycle.
        await new Promise(resolve => setTimeout(resolve, 300));
      } finally {
        // finally guarantees hideAsync even if an exception occurs above.
        if (!cancelled) await hideSplashSafely();
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="landing" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notification-history" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="search" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="alert-thresholds" />
      <Stack.Screen name="auto-tune-thresholds" />
      <Stack.Screen name="anomaly-detection" />
      <Stack.Screen name="test-payment" />
      <Stack.Screen name="boutique" options={{ headerShown: false }} />
      <Stack.Screen name="wishlist" options={{ headerShown: false }} />
      <Stack.Screen name="order-history" />
      <Stack.Screen name="notification-preferences" />
      <Stack.Screen
        name="donate"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="admin-add-class" />
      <Stack.Screen name="admin-add-music" />
      <Stack.Screen name="admin-add-boutique" />
      <Stack.Screen name="admin-messaging" />
      <Stack.Screen name="admin-analytics" />
    </Stack>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <AppLayout />
          </SafeAreaProvider>
        </LanguageProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
