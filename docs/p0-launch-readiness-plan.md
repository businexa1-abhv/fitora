# FitOra P0 Launch Readiness — Execution Plan
**Sprint:** P0 - Launch Readiness Sprint  
**Status:** 11/12 P0 items done. This plan completes the last item and validates the whole platform.  
**Rule:** DO NOT start P1 features. Fix P0 only.

---

## EXECUTION ORDER (critical path)

```
Parallel batch A (independent):
  Phase 1A  — Player: notification persistence guard
  Phase 2A  — API: walk-in subscription guard
  Phase 6   — Deep link path injection fix

Sequential:
  Phase 1B  — Owner: notification-permission screen + auth-provider wiring
  Phase 2B  — API: membership plan subscription guard
  Phase 2C  — API: slot creation subscription guards
  Phase 2D  — Env: enable gate flag
  Phase 2E  — Frontend: subscription expiry redirect in owner _layout.tsx

Verification:
  Phase 3   — Cross-app flow review (code reading)
  Phase 4   — Realtime verification (code reading)

Final:
  Phase 5   — pnpm lint + typecheck + test + build
  Phase 7   — Performance audit
  Phase 8   — Release checklist report → docs/p0-launch-report.md
```

---

## Phase 1 — P0-11: Notification Permission Prompt

### 1A — Player App: Persistence guard in login.tsx

**File:** `apps/player-app/app/(auth)/login.tsx`

**Context:** `handleVerifyOtp()` already only advances to `'notifications'` when `response.isNewUser === true`. Returning users skip it. The only gap is that if a new user completes onboarding, then reinstalls the app and creates a new account, they'd see the step again. We must persist the flag.

**Change 1** — Add import at line 1 (alongside existing imports):
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Change 2** — In `completeRegistration()` after `await signIn(...)` succeeds (line ~300), add:
```ts
await AsyncStorage.setItem('fitora_notification_asked', '1').catch(() => undefined);
```

**Change 3** — In `handleVerifyOtp()`, when `response.isNewUser` is true (line ~195), check the flag before setting step to profile (which leads to notifications):
```ts
// No change needed to the isNewUser branch — the flag is written at COMPLETION, not at start.
// This prevents a returning user who uninstalled from seeing it again on fresh install.
```
Actually: the flag is per-device. On reinstall, `AsyncStorage` is cleared on iOS (unless backed up). This is acceptable — iOS may ask once more on fresh install. The flag prevents the step showing on the SAME DEVICE for the same or different accounts.

**Acceptance:** `AsyncStorage.setItem('fitora_notification_asked', '1')` is called after successful onboarding completion regardless of user's allow/skip choice.

---

### 1B — Owner App: New notification-permission screen + wiring

#### File 1: CREATE `apps/owner-app/app/notification-permission.tsx`

Full-screen prompt using owner-app theme. Show notification benefits for owners. Two buttons: "Allow" and "Not now". On both: set `AsyncStorage` flag then `router.back()`. On "Allow": also call `registerForPushNotifications(token)`.

**Pattern reference:** `apps/owner-app/app/subscription-expired.tsx` (uses `colors`, `FontSize`, `Radius`, `Spacing`).

Key code:
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from '@/lib/push';

const ASKED_KEY = 'fitora_owner_notification_asked';

// On mount: auto-dismiss if already asked
useEffect(() => {
  AsyncStorage.getItem(ASKED_KEY).then((val) => {
    if (val) router.back();
  });
}, []);

async function handleAllow() {
  await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
  if (token) await registerForPushNotifications(token).catch(() => undefined);
  router.back();
}

async function handleSkip() {
  await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
  router.back();
}
```

Benefits to show (owner-specific):
- "Instant booking alerts" — know when a player books your court
- "Payment confirmations" — instant notification when payment is received
- "Check-in reminders" — 15-min alerts before each session starts

#### File 2: MODIFY `apps/owner-app/app/(tabs)/_layout.tsx`

Add `useEffect` + `useRef` to push to `notification-permission` once after first authenticated tab load.

**Add imports:**
```ts
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Add inside `TabsLayout()` before the `return`:**
```ts
const router = useRouter();
const notifChecked = useRef(false);

useEffect(() => {
  if (notifChecked.current) return;
  notifChecked.current = true;
  AsyncStorage.getItem('fitora_owner_notification_asked').then((val) => {
    if (!val) router.push('/notification-permission');
  });
}, [router]);
```

#### File 3: MODIFY `apps/owner-app/app/_layout.tsx`

Add `notification-permission` to the Stack:
```tsx
<Stack.Screen name="notification-permission" />
```
(Add after the existing `subscription-expired` screen at line 126)

#### File 4: MODIFY `apps/owner-app/providers/auth-provider.tsx`

Add push token registration on signIn and bootstrap.

**Add import:**
```ts
import { registerForPushNotifications } from '@/lib/push';
```

**In `signIn()`** after `setAppMode(resolved)` (line 72):
```ts
registerForPushNotifications(response.tokens.accessToken).catch(() => undefined);
```

**In `bootstrap()`** after `setToken(accessToken)` (line 56):
```ts
if (accessToken) {
  registerForPushNotifications(accessToken).catch(() => undefined);
}
```

**Acceptance:** Owner opens app → tab bar mounts → `notification-permission` pushed (first time) → "Allow" registers push token → subsequent launches skip prompt.

---

## Phase 2 — Owner Subscription Enforcement

### 2A — API: Walk-in booking guard

**File:** `apps/api/src/bookings/bookings.service.ts`

`SubscriptionService` is already injected as `this.subscriptions` (line 77). `court` is fetched at line 99 and already has `tenantId` from the full Prisma object.

**Add after line 104** (after `ForbiddenException` check):
```ts
await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
```

Note: `court.tenantId` may be `string | null` — guard it:
```ts
if (court.tenantId) {
  await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
}
```

### 2B — API: Membership plan creation guard

**File:** `apps/api/src/memberships/memberships.service.ts`

`court.tenantId` is already used at line 68 — it's in the Prisma result. Just need to inject `SubscriptionService` and add the guard.

**Step 1 — Add import:**
```ts
import { SubscriptionService } from '../finance/subscription/subscription.service';
```

**Step 2 — Add injection to constructor** (after `CouponsService`):
```ts
@Inject(forwardRef(() => SubscriptionService))
private subscriptions: SubscriptionService,
```

**Step 3 — Add guard in `createPlan()`** after `this.assertOwnerOrAdmin(court.ownerId, user)` (line 63):
```ts
if (court.tenantId) {
  await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
}
```

**File:** `apps/api/src/memberships/memberships.module.ts`

Add `FinanceModule` import (it already exports `SubscriptionService`):
```ts
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), forwardRef(() => FinanceModule)],
  ...
})
```

### 2C — API: Slot creation guards

**File:** `apps/api/src/slots/slots.service.ts`

First check what `getCourt()` returns — verify it selects `tenantId`. Read lines 500+ of the file.

**Step 1 — Add imports:**
```ts
import { Inject, forwardRef } from '@nestjs/common';
import { SubscriptionService } from '../finance/subscription/subscription.service';
```

**Step 2 — Update constructor** (currently line 54-57):
```ts
constructor(
  private prisma: PrismaService,
  private events: SlotEventsService,
  @Inject(forwardRef(() => SubscriptionService))
  private subscriptions: SubscriptionService,
) {}
```

**Step 3 — Add guard to `createSlot()`** after `this.assertOwnerOrAdmin(court.ownerId, user)` (line 63):
```ts
if (court.tenantId) {
  await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
}
```

**Step 4 — Add guard to `generateSlots()`** after `this.assertOwnerOrAdmin(court.ownerId, user)` (line 109):
```ts
if (court.tenantId) {
  await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
}
```

**Step 5 — Add guard to `generateRecurringSlots()`** after `this.assertOwnerOrAdmin(court.ownerId, user)` (line 139):
```ts
if (court.tenantId) {
  await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
}
```

**File:** `apps/api/src/slots/slots.module.ts`

Add `FinanceModule`:
```ts
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [AvailabilityModule, RealtimeModule, forwardRef(() => FinanceModule)],
  ...
})
```

Also add `forwardRef` to imports from `@nestjs/common`.

### 2D — Production env flag

**File:** `.env.production.example`

Add under deployment flags section:
```
SUBSCRIPTION_GATE_ENABLED=true
```

### 2E — Frontend: Subscription expiry redirect

**File:** `apps/owner-app/app/_layout.tsx`

In the auth routing `useEffect` (lines 73-93), add subscription redirect logic after the existing coach-mode check:

```ts
// After line 92 (isCoachMode redirect):
if (isAuthenticated && isOwner && isSubscriptionExpired && !onExpiredScreen) {
  router.replace('/subscription-expired');
  return;
}
```

**File:** `apps/owner-app/providers/auth-provider.tsx`

Add `isSubscriptionExpired` state — check subscription status after bootstrap:

1. Add import: `import { getMySubscription } from '@/lib/owner-api';`
2. Add state: `const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);`
3. In `bootstrap()`, after `setToken(accessToken)`:
```ts
if (accessToken) {
  getMySubscription(accessToken)
    .then((sub) => {
      if (sub && sub.status !== 'ACTIVE' && sub.status !== 'GRACE') {
        setIsSubscriptionExpired(true);
      }
    })
    .catch(() => undefined); // non-blocking
}
```
4. Expose `isSubscriptionExpired` in context value and interface.

---

## Phase 3 — Cross-App Flow Verification (code reading)

Read these files and confirm no broken contract:

| Flow | File | Check |
|------|------|-------|
| Player booking | `apps/player-app/app/booking/[courtId].tsx` | Uses `createBooking(dto)` → POST /bookings |
| Walk-in | `apps/owner-app/app/ops/walk-in-confirm.tsx` | Sends `slotId`, `courtId`, `guestPhone` |
| Membership plan | Owner-app membership screen | Sends `courtId` to `/memberships/plans/:courtId` |
| Payment webhook | `apps/api/src/payments/payments.controller.ts` | Verify Razorpay HMAC signature uses rawBody |
| QR check-in | `apps/api/src/bookings/utils/qr-code.util.ts` | `checkInCode` returned by walk-in path |

---

## Phase 4 — Realtime Verification (code reading)

Read `apps/api/src/realtime/slots.gateway.ts`:
- Confirm `RealtimeGateway` calls `events.onEvent()` (or `events.on*` methods) to register listeners
- Confirm `slot:updated` payload shape matches `useCourtSlotsLive` expectation
- Confirm `booking:confirmed` room is `court:{courtId}` + `user:{userId}`
- Confirm `onModuleDestroy` or `onApplicationShutdown` removes listeners (no memory leaks)

---

## Phase 5 — Production Build

Run in order:
```bash
pnpm typecheck
pnpm lint
pnpm test --filter=@fitora/api
pnpm build --filter=@fitora/api
pnpm build --filter=@fitora/web
pnpm build --filter=@fitora/admin
```

Fix all errors before proceeding. Known expected errors from Phase 2 changes:
- `court.tenantId` nullability — handle with `if (court.tenantId)` guards
- Module circular dependency — use `forwardRef(() => FinanceModule)` in both modules
- `isSubscriptionExpired` missing from `AuthContextValue` — add to interface

---

## Phase 6 — Security: Deep Link Path Injection Fix

**BOTH apps do `router.push(data.path as never)` with unvalidated data from push payload.**

### Fix player-app

**File:** `apps/player-app/lib/push.ts`

Add at end of file:
```ts
const PLAYER_SAFE_PATHS = [
  '(tabs)', 'booking/', 'court/', 'venue/', 'membership',
  'notifications', 'notification-settings', 'shop/', 'services/',
  'training/', 'wallet', 'print/',
];

export function isSafeDeepLinkPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('..') || path.startsWith('/')) return false;
  return PLAYER_SAFE_PATHS.some((p) => path.startsWith(p));
}
```

**File:** `apps/player-app/app/_layout.tsx`

Replace both raw `router.push(data.path as never)` and `router.push(link.path as never)` calls with guarded versions:
```ts
import { isSafeDeepLinkPath } from '@/lib/push';

// notification response handler (line 42):
if (data.path && isSafeDeepLinkPath(data.path)) {
  router.push(data.path as never);
}

// handleUrl (line 31):
if (link && isSafeDeepLinkPath(link.path)) {
  router.push(link.path as never);
}
```

### Fix owner-app

**File:** `apps/owner-app/lib/push.ts`

Add equivalent function with owner-specific allowed paths:
```ts
const OWNER_SAFE_PATHS = [
  '(tabs)', 'ops/', 'manage/', 'court/', 'coach/',
  'notifications', 'subscription-expired',
];

export function isSafeDeepLinkPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('..') || path.startsWith('/')) return false;
  return OWNER_SAFE_PATHS.some((p) => path.startsWith(p));
}
```

**File:** `apps/owner-app/app/_layout.tsx`

Same guard pattern — wrap both `router.push(data.path as never)` (line 60) and `router.push(link.path as never)` (line 46).

---

## Phase 7 — Performance Audit (review only)

1. Verify `getCourt()` in `slots.service.ts` selects `tenantId` (needed for Phase 2C). If not, add it to the select.
2. Check `generateRecurringSlots` for N+1 — `createSlotsForDate` inside nested loop. Flag as WARN if per-row inserts.
3. Check `apps/owner-app/app/(tabs)/analytics.tsx` — any heavy chart lib imported without lazy loading?
4. Confirm both mobile query providers have `staleTime: 60_000` (confirmed already).

---

## Phase 8 — Release Checklist

After all phases complete, produce `docs/p0-launch-report.md` with:

**Scoring:** PASS / WARN / FAIL for each of 21 items across 6 categories:
1. Notifications (5 items)
2. Subscription Enforcement (5 items)
3. Security (5 items)
4. Build & Quality (5 items)
5. Realtime (4 items — P5-01 through P5-04)
6. Performance (3 items — P6-01 through P6-03)

**Ship criteria:** 0 FAILs, ≤ 2 WARNs.

Report format:
- Summary table with scores
- `## Remediation Required` — list of FAILs with file+line fix
- `## Deferred` — WARNs accepted for post-launch
- `## Production Deployment Checklist` — env vars, migrations, Redis, Razorpay mode
- `## Rollback Plan`

---

## Files Changed Summary

| Phase | File | Action |
|-------|------|--------|
| 1A | `apps/player-app/app/(auth)/login.tsx` | +AsyncStorage import, +flag write in completeRegistration |
| 1B | `apps/owner-app/app/notification-permission.tsx` | CREATE |
| 1B | `apps/owner-app/app/(tabs)/_layout.tsx` | +useEffect for one-time prompt check |
| 1B | `apps/owner-app/app/_layout.tsx` | +notification-permission Stack.Screen |
| 1B | `apps/owner-app/providers/auth-provider.tsx` | +registerForPushNotifications in signIn+bootstrap, +isSubscriptionExpired |
| 2A | `apps/api/src/bookings/bookings.service.ts` | +assertTenantCanAcceptBookings in createWalkInBooking |
| 2B | `apps/api/src/memberships/memberships.service.ts` | +SubscriptionService injection, +guard in createPlan |
| 2B | `apps/api/src/memberships/memberships.module.ts` | +FinanceModule import |
| 2C | `apps/api/src/slots/slots.service.ts` | +SubscriptionService injection, +guards in createSlot+generateSlots+generateRecurringSlots |
| 2C | `apps/api/src/slots/slots.module.ts` | +FinanceModule import |
| 2D | `.env.production.example` | +SUBSCRIPTION_GATE_ENABLED=true |
| 2E | `apps/owner-app/app/_layout.tsx` | +subscription expiry redirect |
| 6 | `apps/player-app/lib/push.ts` | +isSafeDeepLinkPath() |
| 6 | `apps/player-app/app/_layout.tsx` | +path validation before router.push |
| 6 | `apps/owner-app/lib/push.ts` | +isSafeDeepLinkPath() |
| 6 | `apps/owner-app/app/_layout.tsx` | +path validation before router.push |
