import { ErrorScreen } from '@/components/error-screen';

export default function MaintenancePage() {
  return (
    <ErrorScreen
      code="503"
      title="Down for maintenance"
      description="FitOra is undergoing scheduled maintenance. We'll be back shortly. Check fitora.com/status for updates."
      showRetry
    />
  );
}
