export const HOLD_PREFIX = 'fitora:slot:hold';
export const SLOT_HOLDS_PREFIX = 'fitora:slot:holds';
export const USER_HOLDS_PREFIX = 'fitora:user:holds';

export function holdKey(slotId: string, holdToken: string) {
  return `${HOLD_PREFIX}:${slotId}:${holdToken}`;
}

export function slotHoldsKey(slotId: string) {
  return `${SLOT_HOLDS_PREFIX}:${slotId}`;
}

export function userHoldsKey(userId: string) {
  return `${USER_HOLDS_PREFIX}:${userId}`;
}
