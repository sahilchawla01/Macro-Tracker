import 'react-native-gesture-handler';
import {
  Orbitron_700Bold,
  useFonts as useOrbitronFonts,
} from '@expo-google-fonts/orbitron';
import {
  ShareTechMono_400Regular,
  useFonts as useShareTechFonts,
} from '@expo-google-fonts/share-tech-mono';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { DatabaseProvider } from '@/src/context/DatabaseContext';
import { retro } from '@/src/theme/retro';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const RetroNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: retro.neonPink,
    background: retro.bg,
    card: retro.bgPanel,
    text: retro.text,
    border: retro.neonCyan,
    notification: retro.neonYellow,
  },
};

function RootStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: retro.bg },
        headerTintColor: retro.neonCyan,
        contentStyle: { backgroundColor: retro.bg },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [orbitronLoaded] = useOrbitronFonts({ Orbitron_700Bold });
  const [shareLoaded] = useShareTechFonts({ ShareTechMono_400Regular });
  const loaded = orbitronLoaded && shareLoaded;

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <DatabaseProvider>
      <ThemeProvider value={RetroNavTheme}>
        <RootStack />
      </ThemeProvider>
    </DatabaseProvider>
  );
}
