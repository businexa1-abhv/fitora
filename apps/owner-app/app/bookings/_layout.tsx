import { Stack } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';

export default function BookingsStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
