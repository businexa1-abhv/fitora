#!/usr/bin/env node
/**
 * Prints Owner + Coach demo credentials when starting the owner mobile app.
 */
const lines = [
  '',
  '┌─ FitOra Owner App ─────────────────────────────────────┐',
  '│ Role login (Stitch Owner Login — Owner | Coach toggle) │',
  '│                                                        │',
  '│  Owner  businexa1@gmail.com / OwnerPass123!            │',
  '│  Coach  trainer@fitora.com  / TrainerPass123!          │',
  '│                                                        │',
  '│  Seed coach: pnpm db:seed                              │',
  '│  API:        pnpm dev:api  (http://localhost:3001)     │',
  '└────────────────────────────────────────────────────────┘',
  '',
];

for (const line of lines) console.log(line);
