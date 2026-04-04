import { Stack } from 'expo-router';
import { retro } from '@/src/theme/retro';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: retro.bg },
      }}
    />
  );
}
