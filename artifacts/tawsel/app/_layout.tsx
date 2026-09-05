import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { I18nManager, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
I18nManager.swapLeftAndRightInRTL(true);

const NativeText = Text as typeof Text & { defaultProps?: Record<string, unknown> };
const NativeTextInput = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };

NativeText.defaultProps = {
  ...NativeText.defaultProps,
  style: [{ fontFamily: 'IBMPlexSansArabic' }, NativeText.defaultProps?.style],
};

NativeTextInput.defaultProps = {
  ...NativeTextInput.defaultProps,
  style: [{ fontFamily: 'IBMPlexSansArabic' }, NativeTextInput.defaultProps?.style],
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const IBMPlexSansArabicRegular = require('../assets/fonts/IBMPlexSansArabic-Regular.otf');
const IBMPlexSansArabicMedium = require('../assets/fonts/IBMPlexSansArabic-Medium.otf');
const IBMPlexSansArabicSemiBold = require('../assets/fonts/IBMPlexSansArabic-SemiBold.otf');
const IBMPlexSansArabicBold = require('../assets/fonts/IBMPlexSansArabic-Bold.otf');

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic: IBMPlexSansArabicRegular,
    IBMPlexSansArabicMedium,
    IBMPlexSansArabicSemiBold,
    IBMPlexSansArabicBold,
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
          <GestureHandlerRootView style={{ flex: 1, direction: 'rtl' as never }}>
            <KeyboardProvider>
              <View style={{ flex: 1, direction: 'rtl' as never }}>
                <RootLayoutNav />
              </View>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
