interface OwnerPageHeaderProps {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
}

export function OwnerPageHeader({
  title,
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  actions,
}: OwnerPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onSearchChange && (
          <input
            type="search"
            placeholder={searchPlaceholder ?? 'Search…'}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-border px-4 py-2 text-sm"
          />
        )}
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </div>
  );
}
