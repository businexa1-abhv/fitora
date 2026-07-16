export type AvailabilityStatus =
  'AVAILABLE' | 'FEW_SPOTS' | 'FULL' | 'BLOCKED' | 'MAINTENANCE' | 'HOLIDAY';

export function computeAvailabilityStatus(input: {
  isBlocked: boolean;
  blockReason?: string | null;
  capacity: number;
  availableSeats: number;
}): AvailabilityStatus {
  if (input.isBlocked) {
    if (input.blockReason === 'MAINTENANCE') return 'MAINTENANCE';
    if (input.blockReason === 'HOLIDAY') return 'HOLIDAY';
    return 'BLOCKED';
  }
  if (input.availableSeats <= 0) return 'FULL';
  const threshold = Math.max(1, Math.floor(input.capacity * 0.25));
  if (input.availableSeats <= threshold) return 'FEW_SPOTS';
  return 'AVAILABLE';
}
