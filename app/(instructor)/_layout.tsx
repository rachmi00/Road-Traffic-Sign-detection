import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function InstructorTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trip Review',
          tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="signs"
        options={{
          title: 'Sign Editor',
          tabBarIcon: ({ color }) => <Ionicons name="create-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color }) => <Ionicons name="information-circle-outline" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}