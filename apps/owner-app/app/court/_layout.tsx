import { Stack } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';

export default function CourtStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
