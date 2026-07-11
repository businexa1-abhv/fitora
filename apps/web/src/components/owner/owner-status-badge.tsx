const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-primary-light text-primary',
  ACTIVE: 'bg-primary-light text-primary',
  PAID: 'bg-primary-light text-primary',
  COMPLETED: 'bg-primary-light text-primary',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-primary-light text-primary',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-100 text-slate-600',
};

export function OwnerStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
