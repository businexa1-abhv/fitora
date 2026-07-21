import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { FitoraLoader } from '@/components/fitora-loader';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <FitoraLoader variant="splash" />;
  }
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/welcome" />;
}
