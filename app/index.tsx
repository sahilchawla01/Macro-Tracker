import { Redirect } from 'expo-router';

import { getSQLite } from '@/src/db/client';
import { isOnboardingComplete } from '@/src/db/repo';

export default function Index() {
  const db = getSQLite();
  const done = isOnboardingComplete(db);
  if (done) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/onboarding" />;
}
