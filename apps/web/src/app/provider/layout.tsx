import { ProviderAuthGuard } from '@/components/provider/provider-auth-guard';
import { ProviderShell } from '@/components/provider/provider-shell';

export default function ProviderLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ProviderAuthGuard>
      <ProviderShell>{children}</ProviderShell>
    </ProviderAuthGuard>
  );
}
