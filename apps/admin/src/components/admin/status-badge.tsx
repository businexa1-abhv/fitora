import { Badge } from '@/components/ui/badge';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  CONFIRMED: 'success',
  ACTIVE: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  DELIVERED: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  CANCELLED: 'destructive',
  FAILED: 'destructive',
  EXPIRED: 'secondary',
  REFUNDED: 'secondary',
  INACTIVE: 'outline',
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status] ?? 'outline';
  return (
    <Badge variant={variant} className="font-medium">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
