import { Stack } from 'expo-router';
import { CoachColors } from '@/constants/coach-theme';

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: CoachColors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="student/[enrollmentId]" />
      <Stack.Screen name="training-plan" />
      <Stack.Screen name="qr-attendance" />
      <Stack.Screen name="report/[enrollmentId]" />
    </Stack>
  );
}
