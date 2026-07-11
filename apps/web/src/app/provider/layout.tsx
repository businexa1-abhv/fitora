import { ProviderAuthGuard } from '@/components/provider/provider-auth-guard';
import { ProviderShell } from '@/components/provider/provider-shell';

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProviderAuthGuard>
      <ProviderShell>{children}</ProviderShell>
    </ProviderAuthGuard>
  );
}
