import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { retro, retroFonts } from '@/src/theme/retro';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const headerShown = useClientOnlyValue(false, true);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: retro.neonPink,
        tabBarInactiveTintColor: retro.textMuted,
        tabBarStyle: {
          backgroundColor: retro.bgPanel,
          borderTopColor: retro.neonCyan,
          borderTopWidth: 1,
        },
        headerStyle: { backgroundColor: retro.bg },
        headerTintColor: retro.neonCyan,
        headerTitleStyle: {
          fontFamily: retroFonts.display,
          fontSize: 18,
          color: retro.neonCyan,
        },
        tabBarLabelStyle: { fontFamily: retroFonts.mono, fontSize: 11 },
        headerShown,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
