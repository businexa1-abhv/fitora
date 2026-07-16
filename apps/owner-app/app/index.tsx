import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';

export default function Index() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/welcome" />;
}
