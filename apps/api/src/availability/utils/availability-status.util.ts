import type { SlotOperationalState } from '@prisma/client';

/** Derived display status shown to players (includes FULL). */
export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'FEW_SPOTS'
  | 'FULL'
  | 'RESERVED'
  | 'BLOCKED'
  | 'MAINTENANCE'
  | 'TOURNAMENT'
  | 'PRIVATE'
  | 'CLOSED'
  | 'HOLIDAY';

/** Statuses that allow a player to book. */
export const BOOKABLE_STATUSES: ReadonlySet<AvailabilityStatus> = new Set([
  'AVAILABLE',
  'FEW_SPOTS',
]);

export function isBookableStatus(status: AvailabilityStatus): boolean {
  return BOOKABLE_STATUSES.has(status);
}

/**
 * Precedence:
 * 1. Owner operational override (BLOCKED / MAINTENANCE / TOURNAMENT / PRIVATE / CLOSED)
 * 2. FULL when remaining seats == 0
 * 3. FEW_SPOTS when remaining <= 25% of capacity
 * 4. AVAILABLE
 */
export function computeAvailabilityStatus(input: {
  isBlocked?: boolean;
  blockReason?: string | null;
  operationalState?: SlotOperationalState | string | null;
  capacity: number;
  availableSeats: number;
  reservedSeats?: number;
}): AvailabilityStatus {
  const operational = resolveOperationalState(input);
  if (operational !== 'AVAILABLE') {
    return operational;
  }
  if (input.availableSeats <= 0) return 'FULL';
  if ((input.reservedSeats ?? 0) > 0) return 'RESERVED';
  const threshold = Math.max(1, Math.floor(input.capacity * 0.25));
  if (input.availableSeats <= threshold) return 'FEW_SPOTS';
  return 'AVAILABLE';
}

export function resolveOperationalState(input: {
  isBlocked?: boolean;
  blockReason?: string | null;
  operationalState?: SlotOperationalState | string | null;
}): Exclude<AvailabilityStatus, 'FULL' | 'FEW_SPOTS' | 'HOLIDAY'> | 'HOLIDAY' {
  if (input.operationalState && input.operationalState !== 'AVAILABLE') {
    return input.operationalState as Exclude<AvailabilityStatus, 'FULL' | 'FEW_SPOTS'>;
  }

  if (input.isBlocked) {
    switch (input.blockReason) {
      case 'MAINTENANCE':
        return 'MAINTENANCE';
      case 'TOURNAMENT':
        return 'TOURNAMENT';
      case 'PRIVATE':
        return 'PRIVATE';
      case 'CLOSED':
        return 'CLOSED';
      case 'HOLIDAY':
        return 'HOLIDAY';
      default:
        return 'BLOCKED';
    }
  }

  return 'AVAILABLE';
}

/** Sync legacy isBlocked / blockReason from operational state. */
export function syncLegacyBlockFields(state: SlotOperationalState | string): {
  isBlocked: boolean;
  blockReason: 'BLOCKED' | 'MAINTENANCE' | 'HOLIDAY' | 'TOURNAMENT' | null;
} {
  switch (state) {
    case 'AVAILABLE':
      return { isBlocked: false, blockReason: null };
    case 'MAINTENANCE':
      return { isBlocked: true, blockReason: 'MAINTENANCE' };
    case 'TOURNAMENT':
      return { isBlocked: true, blockReason: 'TOURNAMENT' };
    case 'PRIVATE':
      return { isBlocked: true, blockReason: 'BLOCKED' };
    case 'CLOSED':
      return { isBlocked: true, blockReason: 'HOLIDAY' };
    case 'BLOCKED':
    default:
      return { isBlocked: true, blockReason: 'BLOCKED' };
  }
}

export function operationalStateFromBlockReason(
  isBlocked: boolean,
  blockReason?: string | null,
): SlotOperationalState {
  if (!isBlocked) return 'AVAILABLE' as SlotOperationalState;
  switch (blockReason) {
    case 'MAINTENANCE':
      return 'MAINTENANCE' as SlotOperationalState;
    case 'TOURNAMENT':
      return 'TOURNAMENT' as SlotOperationalState;
    case 'PRIVATE':
      return 'PRIVATE' as SlotOperationalState;
    case 'CLOSED':
    case 'HOLIDAY':
      return 'CLOSED' as SlotOperationalState;
    default:
      return 'BLOCKED' as SlotOperationalState;
  }
}
