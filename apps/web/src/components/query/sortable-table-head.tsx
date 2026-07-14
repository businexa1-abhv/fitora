'use client';

import React from 'react';

interface SortableThProps {
  label: string;
  field: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export function SortableTh({ label, field, sortBy, sortOrder, onSort }: SortableThProps): React.JSX.Element {
  const active = sortBy === field;
  const arrow = active ? (sortOrder === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th
      className="text-left px-5 py-3.5 font-semibold cursor-pointer select-none"
      onClick={() => onSort(field)}
    >
      {label} <span className="text-muted text-xs">{arrow}</span>
    </th>
  );
}

export function toggleSort(
  field: string,
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' | undefined,
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  if (sortBy !== field) return { sortBy: field, sortOrder: 'desc' };
  return { sortBy: field, sortOrder: sortOrder === 'desc' ? 'asc' : 'desc' };
}
