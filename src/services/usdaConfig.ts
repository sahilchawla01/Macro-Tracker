import Constants from 'expo-constants';

/** USDA FoodData Central API key (public in client; optional proxy for production). */
export function getUsdaApiKey(): string {
  const extra = Constants.expoConfig?.extra as { usdaApiKey?: string } | undefined;
  const fromExtra = extra?.usdaApiKey?.trim();
  if (fromExtra) return fromExtra;
  return process.env.EXPO_PUBLIC_USDA_API_KEY?.trim() ?? '';
}
