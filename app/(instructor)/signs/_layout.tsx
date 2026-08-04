import { Stack } from 'expo-router';

export default function SignsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[classIndex]" />
    </Stack>
  );
}