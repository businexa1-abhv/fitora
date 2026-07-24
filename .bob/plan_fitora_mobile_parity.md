# Fitora Owner-App: Web Feature Parity Plan

## Executive Summary

The `apps/owner-app` React Native (Expo Router) mobile app is substantially built — ~90% of screens exist. The gaps fall into 4 categories:

1. **Mock/hardcoded data** replacing real API calls (analytics coach data, on-duty status, ratings)
2. **Missing features** that exist in the web portal but not in mobile (trainer profile edit, trainer performance, invoice management, report exports, training program management)
3. **Incomplete integrations** (invoice-share has demo implementations, training-plan has no backend save)
4. **Profile update** (manage/profile.tsx navigates to success without calling API)

The web app (`apps/web`) is a different codebase (Next.js) used by owners/trainers on desktop. Both apps share the same NestJS backend (`apps/api`).

---

## Current State Audit

### ✅ Already Complete (Mobile)
- Authentication (login, welcome, role switching owner/coach)
- Dashboard (owner + coach modes, with real API data)
- Courts list, detail, create/edit form
- Court availability/calendar with slot management
- Bookings list (filtered, paginated, real-time WebSocket)
- Booking detail with QR, check-in, cancellation
- Booking search with filters
- Walk-in booking flow (3-step: guest info → slot → confirm)
- QR check-in scanner (owner + coach)
- Analytics tab (owner + coach earnings — though coach analytics has mock data)
- Notifications with filters and mark read
- Slot types CRUD
- Pricing rules management
- Operating hours & slot schedule generation
- Membership plans CRUD
- Member management
- Coupon/promotions management
- Staff shifts (create, week view, edit, delete)
- Payroll with payroll period detail
- Expense CRUD
- Player CRM (list, detail, profile update, notes)
- Coach directory (with mock on-duty status)
- Community hub (groups, announcements)
- Business profile, branding, payment settings
- Security (change password, logout all devices)
- Notification preferences
- Subscription management (expired screen + renewal)
- Push notification permission flow
- Deep link routing
- Coach mode: dashboard, batches, sessions, students, schedule, attendance, progress reports, training notes, leave requests, QR attendance, earnings

### ⚠️ Incomplete / Has Issues

| Screen | Issue | Priority |
|--------|-------|----------|
| `(tabs)/analytics.tsx` | Coach analytics uses 3 hardcoded coaches (Mark Anthony, Sarah Lee, John Doe); student counts use arbitrary multipliers | HIGH |
| `manage/coaches.tsx` | "On Duty" is `i % 3 === 2` (mock); "Avg Rating" hardcoded to "4.8" | HIGH |
| `coach/report/[enrollmentId].tsx` | Default skill ratings are hardcoded (Footwork:4, Serve:4, Backhand:3, overall:4.2) | MEDIUM |
| `manage/profile.tsx` | No API call on save — navigates to success screen without updating profile | HIGH |
| `coach/training-plan.tsx` | Only uses AsyncStorage — no backend persistence | MEDIUM |
| `manage/invoice/[id].tsx` | Tax rate hardcoded at 18%, invoice data comes from route params only (no API fetch) | MEDIUM |
| `manage/invoice-share.tsx` | Share/email/SMS are demo Alerts — no real implementation | LOW |
| `(auth)/login.tsx` | Demo credentials hardcoded & auto-filled; unused `keepLoggedIn` state | HIGH |

### ❌ Missing Features (exist in web, missing in mobile)

| Feature | Web Location | Status |
|---------|-------------|--------|
| **Trainer profile edit** | `/trainer/profile` | Missing in mobile |
| **Trainer performance metrics** | `/trainer/performance` | Missing in mobile |
| **Training notes (web-style)** | `/trainer/notes` | Mobile has notes screen but lacks delete/edit |
| **Training program management** | `/owner/training` | Mobile has no program CRUD |
| **Report exports (CSV)** | `/owner/reports` | Mobile has no export functionality |
| **Invoice list screen** | via billing | `manage/invoices.tsx` doesn't exist |
| **updateOwnerProfile API** | `/owner/settings` | Mobile profile screen doesn't call API |

---

## Implementation Plan

### Phase 1: Fix Critical Bugs & Mock Data (Priority: HIGH)

#### 1.1 Fix Analytics Mock Coaches
**File:** `apps/owner-app/app/(tabs)/analytics.tsx`  
**Issue:** Lines 83-102 use 3 hardcoded coach objects  
**Fix:** Replace with real data from `listTenantTrainers(token, tenantId)`. Use tenant ID from `getTenantMe()`. Map real trainer data to the coach analytics display. Fall back to empty array if no trainers.

**Data mapping:**
```typescript
const coaches = trainers.map(t => ({
  initials: `${t.firstName[0]}${t.lastName[0]}`,
  name: `${t.firstName} ${t.lastName}`,
  sport: t.trainerProfile?.sport ?? 'N/A',
  students: t.trainerProfile?.currentStudents ?? 0,
}));
```

#### 1.2 Fix Coaches Mock Stats
**File:** `apps/owner-app/app/manage/coaches.tsx`  
**Issue:** On-duty count uses `Math.round(coaches.length * 0.65)`, avg rating hardcoded to "4.8"  
**Fix:**  
- Calculate avg rating from `trainer.averageRating` (already fetched from API). Average the non-null values.  
- On-duty: show "N/A" or calculate from real shift data (call `listStaffShifts` for today). Simplest fix: remove the "On Duty" stat card entirely and replace with "Active Trainers" (total count).

#### 1.3 Fix Profile Update (Missing API call)
**File:** `apps/owner-app/app/manage/profile.tsx`  
**Issue:** Save button navigates without calling API  
**Fix:** Call `updateTenant(token, tenantId, { ownerFirstName, ownerLastName, phone })` on save. Check what fields the API supports from `getTenantMe` response. If the owner profile update uses a different endpoint, check the `getAuthMe` + a PATCH user endpoint.

**Note:** Need to check if `updateOwnerProfile` exists or needs to be added to `owner-api.ts`. The tenant update endpoint may cover this.

#### 1.4 Remove Demo Credentials from Login
**File:** `apps/owner-app/app/(auth)/login.tsx`  
**Issue:** Demo credentials hardcoded (lines 28-30) and auto-filled (lines 40-41)  
**Fix:** Remove the hardcoded `DEMO_OWNER` and `DEMO_COACH` credentials. In dev mode, these can be env-var-controlled. Remove auto-fill from initial state. Keep the "Use Demo" button but load credentials from environment or remove it entirely.

### Phase 2: Add Missing Screens (Priority: HIGH/MEDIUM)

#### 2.1 Invoice List Screen
**New file:** `apps/owner-app/app/manage/invoices.tsx`  
**Web equivalent:** Referenced from billing screen  
**Behavior:**  
- Show list of all invoices/bookings with payment status (use `getOwnerBookings` filtered to COMPLETED status, or a future invoices API)  
- Navigate to `manage/invoice/[id]`  
- Currently invoice data comes from route params — update to fetch from API if endpoint exists, or use booking data

**Note:** The backend may not have a dedicated `/invoices` endpoint. Check if `getOwnerBookings` returns enough data. The invoice `[id]` screen already does tax calculation locally.

#### 2.2 Trainer Performance Screen (Coach mode)
**New file:** `apps/owner-app/app/coach/performance.tsx`  
**Web equivalent:** `/trainer/performance`  
**API:** `getTrainerPerformance(token)` — already exists in `trainer-api.ts`  
**Features:**
- Attendance rate stat card
- Active students count
- Sessions marked count
- Progress reports written
- Average rating
- Leave summary (pending/approved/rejected)
- Add link from coach dashboard

**Navigation:** Add link from `coach/` routes or from the CoachDashboard quick actions.

#### 2.3 Trainer Profile Edit Screen
**New file:** `apps/owner-app/app/coach/edit-profile.tsx`  
**Web equivalent:** `/trainer/profile`  
**API:** `getTrainerProfile(token)` and `updateTrainerProfile(token, payload)` — already in `trainer-api.ts`  
**Features:**
- Edit bio/description text
- Years of experience (numeric)
- Specializations (comma-separated tags)
- View name, email, verification badge (read-only)
- Save changes with loading state

**Navigation:** Link from `manage/coaches` coach detail, or from coach profile tab.

#### 2.4 Fix Training Notes (Add Delete functionality)
**File:** `apps/owner-app/app/coach/notes.tsx`  
**Issue:** Edit/delete actions show UI but no implementation  
**Fix:** Add `deleteTrainingNote(token, noteId)` call (check if it exists in `trainer-api.ts`). Add swipe-to-delete or long-press action. The web app (`/trainer/notes`) has delete functionality.

**Note:** Check `trainer-api.ts` — if `deleteTrainingNote` doesn't exist, add it and the corresponding API call to `apps/owner-app/lib/trainer-api.ts`.

#### 2.5 Training Plans Backend Integration
**File:** `apps/owner-app/app/coach/training-plan.tsx`  
**Issue:** Only saves to AsyncStorage, no backend  
**Assessment:** The backend API (`apps/api`) may not have training plan endpoints yet. Check if `/training/plans` exists. If not, keep AsyncStorage but add a proper sync UX. If yes, integrate.

**Decision:** Keep AsyncStorage persistence but add a proper "Published" state that marks the plan as submitted. If backend endpoint exists, integrate. Otherwise, clearly label as "Local Draft" and not "Published".

#### 2.6 Owner Reports Export
**New file:** `apps/owner-app/app/manage/reports.tsx`  
**Web equivalent:** `/owner/reports`  
**API:** `exportOwnerReport(token, metric, period)` — exists in web but NOT in `owner-api.ts`  
**Action:** Add `exportOwnerReport` function to `apps/owner-app/lib/owner-api.ts`  
**Features:**
- 6 export buttons matching the web (Booking, Revenue, Membership, Training, Slot Utilization, Payout)
- Each exports a CSV
- On mobile: use `expo-sharing` to share the file or open in browser
- Add "Reports" link to `manage/more.tsx` settings menu

#### 2.7 Training Program Management
**New file:** `apps/owner-app/app/manage/training.tsx`  
**Web equivalent:** `/owner/training`  
**API:** Need to check if `getTrainingPrograms(token, courtId)`, `createTrainingProgram`, etc. exist in `owner-api.ts`  
**Features:**
- List training programs across courts
- Show program name, age range, fee, associated batches
- Create new program button

**Note:** This may require new API functions in `owner-api.ts`. Check the backend endpoints first.

### Phase 3: Improve Existing Screens (Priority: MEDIUM)

#### 3.1 Fix Coach Report Default Data
**File:** `apps/owner-app/app/coach/report/[enrollmentId].tsx`  
**Fix:** Only show skill ratings when a real report exists. When no report, show empty/zero state with "Create First Report" CTA instead of hardcoded 4/4/3 ratings.

#### 3.2 Add "More" menu item for Reports
**File:** `apps/owner-app/app/(tabs)/more.tsx`  
**Fix:** Add "Reports & Exports" under Finance section linking to `manage/reports`

#### 3.3 Fix Invoice Tax Rate
**File:** `apps/owner-app/app/manage/invoice/[id].tsx`  
**Fix:** Get GST rate from tenant settings (from `getTenantMe`). Fall back to 18% only if not configured. Store the tenant GST rate.

#### 3.4 Fix Coaches On-Duty Logic
**File:** `apps/owner-app/app/manage/coaches.tsx`  
**Fix:** Remove hardcoded 65% on-duty calculation. Show total trainers and calculate avg rating from real data. Replace "On Duty" stat with something meaningful from real data (e.g., "Active Today" based on shifts, or just remove).

### Phase 4: Backend & API Additions (If Needed)

#### 4.1 Check/Add deleteTrainingNote
**File:** `apps/owner-app/lib/trainer-api.ts`  
**Action:** Add `deleteTrainingNote(token, noteId)` if missing

#### 4.2 Add exportOwnerReport to owner-api.ts
**File:** `apps/owner-app/lib/owner-api.ts`  
**Action:** Add `exportOwnerReport(token, metric, period)` → calls API endpoint

#### 4.3 Add updateOwnerProfile if needed
**File:** `apps/owner-app/lib/owner-api.ts`  
**Action:** Add `updateOwnerProfile(token, payload)` or use existing `updateTenant` endpoint

---

## Implementation Order (by Priority)

### Sprint 1 — Critical Bug Fixes
1. Remove demo credentials from login screen
2. Fix profile update to call API (manage/profile.tsx)
3. Fix analytics mock coach data (use real trainer API)
4. Fix coaches screen mock stats

### Sprint 2 — Missing Core Features  
5. Add deleteTrainingNote to trainer-api.ts + coach/notes.tsx
6. Add exportOwnerReport to owner-api.ts
7. Create `manage/reports.tsx` screen
8. Add Reports link to `more.tsx` settings menu
9. Create coach performance screen (`coach/performance.tsx`)
10. Create coach profile edit screen (`coach/edit-profile.tsx`)

### Sprint 3 — Polish & Completeness
11. Fix coach report default skill ratings
12. Fix invoice tax rate (use tenant setting)
13. Add invoices list screen (manage/invoices.tsx)  
14. Fix training-plan local storage UX (add clear "Draft only" labeling)
15. Add training program management if API supports it
16. Fix coach analytics on-duty stats

---

## Validation Strategy

After each change:
1. `cd apps/owner-app && npx expo-doctor` — check for expo issues
2. TypeScript check: `npx tsc --noEmit` from owner-app
3. Manual test on simulator (iOS) or device
4. Verify API calls return data (check network tab or console logs)
5. Check loading, empty, and error states

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/owner-app/app/coach/performance.tsx` | Trainer performance metrics screen |
| `apps/owner-app/app/coach/edit-profile.tsx` | Trainer profile edit screen |
| `apps/owner-app/app/manage/reports.tsx` | Reports export screen |
| `apps/owner-app/app/manage/invoices.tsx` | Invoice list screen |

## Files to Modify

| File | Change |
|------|--------|
| `apps/owner-app/app/(tabs)/analytics.tsx` | Replace mock coaches with real trainer data |
| `apps/owner-app/app/(tabs)/more.tsx` | Add Reports link to Finance section |
| `apps/owner-app/app/manage/coaches.tsx` | Fix mock stats, calculate real avg rating |
| `apps/owner-app/app/manage/profile.tsx` | Add API call on save |
| `apps/owner-app/app/coach/notes.tsx` | Add delete functionality |
| `apps/owner-app/app/coach/report/[enrollmentId].tsx` | Fix default skill ratings |
| `apps/owner-app/app/manage/invoice/[id].tsx` | Use tenant GST rate |
| `apps/owner-app/app/(auth)/login.tsx` | Remove demo credentials |
| `apps/owner-app/lib/trainer-api.ts` | Add deleteTrainingNote |
| `apps/owner-app/lib/owner-api.ts` | Add exportOwnerReport, updateOwnerProfile |

---

## Architecture Notes

- **Navigation:** Expo Router file-based. New screens go in appropriate directory (`coach/`, `manage/`). They'll be automatically routable.
- **Auth:** Use `useAuth()` from `providers/auth-provider.tsx` to get token and user
- **Queries:** Use TanStack `useQuery` / `useMutation`. Follow existing patterns in similar screens.
- **Theme:** Use `useTheme()` for colors. Follow the design system in `constants/theme.ts`.
- **Components:** Reuse `Card`, `Button`, `QueryState`, `ManageHeader`, `EmptyState`, `FitoraLoader` from `components/`
- **Error handling:** Follow the `QueryState` pattern for loading/error/empty states
- **TypeScript:** All types from `@fitora/types` or locally defined; no `any`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/owner-app/lib/owner-api.ts` | Owner API functions (50+) |
| `apps/owner-app/lib/trainer-api.ts` | Coach/trainer API functions |
| `apps/owner-app/providers/auth-provider.tsx` | Auth context |
| `apps/owner-app/providers/theme-provider.tsx` | Theme context |
| `apps/owner-app/constants/theme.ts` | Design tokens |
| `apps/owner-app/components/ui.tsx` | Core UI components |
| `apps/owner-app/components/manage-header.tsx` | Screen header component |
| `apps/owner-app/components/empty-state.tsx` | Empty state component |
| `apps/owner-app/app/(tabs)/_layout.tsx` | Tab navigation config |
