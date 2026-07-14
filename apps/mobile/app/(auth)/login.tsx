import { Redirect } from 'expo-router';

/** Legacy login route — player auth now starts at welcome/mobile. */
export default function LegacyLoginRedirect() {
  return <Redirect href="/(auth)/welcome" />;
}
