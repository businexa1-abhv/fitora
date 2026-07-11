export enum UserRole {
  ADMIN = 'ADMIN',
  COURT_OWNER = 'COURT_OWNER',
  TRAINER = 'TRAINER',
  PLAYER = 'PLAYER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  PRINTER = 'PRINTER',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.COURT_OWNER]: 'Court Owner',
  [UserRole.TRAINER]: 'Trainer',
  [UserRole.PLAYER]: 'Player',
  [UserRole.SERVICE_PROVIDER]: 'Service Provider',
  [UserRole.PRINTER]: 'Printer',
};
