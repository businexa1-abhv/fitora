// Booking status and type color metadata used across the Bookings module.

export const BOOKING_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: 'Confirmed', color: '#006c49', bg: '#dcfce7' },
  PENDING: { label: 'Pending', color: '#92400e', bg: '#fef9c3' },
  CANCELLED: { label: 'Cancelled', color: '#ba1a1a', bg: '#fee2e2' },
  COMPLETED: { label: 'Completed', color: '#7c3aed', bg: '#ede9fe' },
  CHECKED_IN: { label: 'Checked In', color: '#2563eb', bg: '#dbeafe' },
  REFUNDED: { label: 'Refunded', color: '#6b7280', bg: '#f3f4f6' },
};

export const BOOKING_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  HOURLY: { label: 'Hourly', color: '#2563eb', bg: '#dbeafe' },
  WALK_IN: { label: 'Walk-in', color: '#c2410c', bg: '#ffedd5' },
  MEMBERSHIP: { label: 'Membership', color: '#7c3aed', bg: '#ede9fe' },
  TRAINING: { label: 'Training', color: '#0891b2', bg: '#cffafe' },
  TOURNAMENT: { label: 'Tournament', color: '#dc2626', bg: '#fee2e2' },
};

export function getStatusMeta(status: string) {
  return BOOKING_STATUS_META[status] ?? { label: status, color: '#464652', bg: '#f0f3ff' };
}

export function getTypeMeta(type: string) {
  return BOOKING_TYPE_META[type] ?? { label: type, color: '#464652', bg: '#f0f3ff' };
}
