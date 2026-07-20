import { ErrorScreen } from '@/components/error-screen';

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      code="403"
      title="Access denied"
      description="You don't have permission to view this page. Please sign in with the correct account."
    />
  );
}
