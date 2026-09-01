import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Text, TextInput } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const IBMPlexSansArabicRegular = require('../assets/fonts/IBMPlexSansArabic-Regular.otf');
const IBMPlexSansArabicMedium = require('../assets/fonts/IBMPlexSansArabic-Medium.otf');
const IBMPlexSansArabicSemiBold = require('../assets/fonts/IBMPlexSansArabic-SemiBold.otf');
const IBMPlexSansArabicBold = require('../assets/fonts/IBMPlexSansArabic-Bold.otf');

const FORCED_ARABIC_FONT = 'IBM Arabic';

const queryClient = new QueryClient();

const NativeText = Text as any;
const NativeTextInput = TextInput as any;
const globalFontStyle = {
  fontFamily: FORCED_ARABIC_FONT,
  direction: 'ltr',
  writingDirection: 'ltr',
  includeFontPadding: false,
  textAlign: 'left',
};

const applyGlobalTextDefaults = (Component: any) => {
  const existingStyles = Array.isArray(Component.defaultProps?.style)
    ? Component.defaultProps.style
    : Component.defaultProps?.style
      ? [Component.defaultProps.style]
      : [];

  Component.defaultProps = {
    ...(Component.defaultProps ?? {}),
    allowFontScaling: true,
    style: [globalFontStyle, ...existingStyles],
  };
};

applyGlobalTextDefaults(NativeText);
applyGlobalTextDefaults(NativeTextInput);

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'IBM Arabic': IBMPlexSansArabicRegular,
    'IBM Arabic Medium': IBMPlexSansArabicMedium,
    'IBM Arabic SemiBold': IBMPlexSansArabicSemiBold,
    'IBM Arabic Bold': IBMPlexSansArabicBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
