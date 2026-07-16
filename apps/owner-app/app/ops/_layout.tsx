import { Stack } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';

export default function OpsStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="games" />
      <Stack.Screen name="memberships" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="hours" />
      <Stack.Screen name="slot-types" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="walk-in-guest" />
      <Stack.Screen name="walk-in" />
      <Stack.Screen name="walk-in-confirm" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="check-in-scanner" />
      <Stack.Screen name="check-in-success" />
    </Stack>
  );
}
