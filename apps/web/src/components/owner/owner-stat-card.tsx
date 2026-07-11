import type { LucideIcon } from 'lucide-react';

interface OwnerStatCardProps {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export function OwnerStatCard({ label, value, change, icon: Icon, trend = 'neutral' }: OwnerStatCardProps) {
  return (
    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold">{value}</p>
          {change && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend === 'up'
                  ? 'text-primary'
                  : trend === 'down'
                    ? 'text-red-600'
                    : 'text-muted'
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
