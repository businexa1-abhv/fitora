'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SortableTableHeadProps {
  label: string;
  field: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}

export function SortableTableHead({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className,
}: SortableTableHeadProps) {
  const active = sortBy === field;
  const Icon = active ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={cn('cursor-pointer select-none', className)} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn('h-3.5 w-3.5', active ? 'text-foreground' : 'text-muted-foreground')} />
      </span>
    </TableHead>
  );
}

function toggleSort(
  field: string,
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' | undefined,
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  if (sortBy !== field) return { sortBy: field, sortOrder: 'desc' };
  return { sortBy: field, sortOrder: sortOrder === 'desc' ? 'asc' : 'desc' };
}

export function useSortState(
  setSortBy: (v: string) => void,
  setSortOrder: (v: 'asc' | 'desc') => void,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
) {
  return (field: string) => {
    const next = toggleSort(field, sortBy, sortOrder);
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
  };
}
