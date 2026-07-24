# Bookings Tab — Owner App Implementation Plan

## Summary

Add a full **Bookings** bottom-navigation tab to `apps/owner-app` (React Native / Expo Router).
No existing screens are redesigned. All new code follows the Google Stitch / FitOra design system exactly.

---

## Files to Create / Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `app/(tabs)/_layout.tsx` | **Modify** | Add `<Tabs.Screen name="bookings" …>` (owner-only, between Courts and Alerts) |
| 2 | `app/_layout.tsx` | **Modify** | Register `<Stack.Screen name="bookings" />` in root Stack (like `ops`, `manage`) |
| 3 | `lib/owner-api.ts` | **Modify** | Extend `OwnerBookingRow`; add `getOwnerBookingsFiltered`, `getBookingDetail` |
| 4 | `lib/booking-status.ts` | **Create** | Status/type color metadata helper |
| 5 | `hooks/use-bookings-live.ts` | **Create** | Socket.IO realtime hook (tenant-scoped), invalidates booking cache |
| 6 | `components/status-badge.tsx` | **Create** | `StatusBadge` + `BookingTypeBadge` reusable components |
| 7 | `components/booking-card.tsx` | **Create** | Reusable booking card used across list, detail, search |
| 8 | `components/booking-skeleton.tsx` | **Create** | Animated shimmer skeleton loader |
| 9 | `app/bookings/_layout.tsx` | **Create** | Stack navigator wrapping `[id].tsx` + `search.tsx` |
| 10 | `app/(tabs)/bookings.tsx` | **Create** | Main Bookings tab: stats, tab-filter, infinite list, FAB |
| 11 | `app/bookings/[id].tsx` | **Create** | Booking detail: player card, slot info, QR code, actions |
| 12 | `app/bookings/search.tsx` | **Create** | Full-text search + filter chips |

Total new files: **10**. Modified existing files: **3**.

---

## Step-by-Step Implementation

### Step 1 — `lib/booking-status.ts` (new)

Simple status color map. Every other file imports from here.

```ts
// apps/owner-app/lib/booking-status.ts
export const BOOKING_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED:  { label: 'Confirmed',  color: '#006c49', bg: '#dcfce7' },
  PENDING:    { label: 'Pending',    color: '#92400e', bg: '#fef9c3' },
  CANCELLED:  { label: 'Cancelled',  color: '#ba1a1a', bg: '#fee2e2' },
  COMPLETED:  { label: 'Completed',  color: '#7c3aed', bg: '#ede9fe' },
  CHECKED_IN: { label: 'Checked In', color: '#2563eb', bg: '#dbeafe' },
  REFUNDED:   { label: 'Refunded',   color: '#6b7280', bg: '#f3f4f6' },
};

export const BOOKING_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  HOURLY:     { label: 'Hourly',     color: '#2563eb', bg: '#dbeafe' },
  WALK_IN:    { label: 'Walk-in',    color: '#c2410c', bg: '#ffedd5' },
  MEMBERSHIP: { label: 'Membership', color: '#7c3aed', bg: '#ede9fe' },
  TRAINING:   { label: 'Training',   color: '#0891b2', bg: '#cffafe' },
  TOURNAMENT: { label: 'Tournament', color: '#dc2626', bg: '#fee2e2' },
};

export function getStatusMeta(status: string) {
  return BOOKING_STATUS_META[status] ?? { label: status, color: '#464652', bg: '#f0f3ff' };
}

export function getTypeMeta(type: string) {
  return BOOKING_TYPE_META[type] ?? { label: type, color: '#464652', bg: '#f0f3ff' };
}
```

---

### Step 2 — `lib/owner-api.ts` additions

**A. Extend `OwnerBookingRow`** — add optional fields (non-breaking):
```ts
export interface OwnerBookingRow {
  id: string;
  status: string;
  paymentStatus?: string;
  totalAmount?: string | number;
  court?: { id: string; name: string; city?: string; sportType?: string };
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string; avatarUrl?: string };
  slot?: { startTime: string; endTime: string; price?: string };
  bookingSource?: 'PLAYER_APP' | 'OWNER_WALK_IN';
  bookingType?: string;
  checkInCode?: string | null;
  createdAt?: string;
  notes?: string;
  seats?: number;
}
```

**B. New interfaces + functions** (append to owner-api.ts, after `getBookingQr`):
```ts
export interface BookingsFilterParams {
  page?: number;
  pageSize?: number;
  status?: string;        // single or comma-separated: "CONFIRMED,PENDING"
  search?: string;
  courtId?: string;
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;
  bookingSource?: string;
  paymentStatus?: string;
}

export function getOwnerBookingsFiltered(token: string, params: BookingsFilterParams = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return apiFetch<PaginatedResponse<OwnerBookingRow>>(
    `/bookings/owner/list?${qs.toString()}`,
    {},
    token,
  );
}

export function getBookingDetail(token: string, bookingId: string) {
  return apiFetch<OwnerBookingRow>(`/bookings/${bookingId}`, {}, token);
}
```

**IMPORTANT:** The existing `OwnerBookingRow` definition at line 33–40 must be replaced with the extended version above. The functions `checkInBooking` (line 534), `cancelOwnerBooking` (line 571), and `getBookingQr` (line 580) are **not touched**.

---

### Step 3 — `hooks/use-bookings-live.ts` (new)

Pattern mirrors `use-owner-calendar-live.ts` but subscribes to tenant room and does `invalidateQueries` (not surgical patch — bookings are richer objects, full refetch is appropriate).

```ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';

export function useBookingsLive(tenantId: string | undefined, token?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    const socket = getRealtimeSocket(token ?? null);

    const invalidateAll = () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    };

    const invalidateOne = (payload: { bookingId?: string; id?: string }) => {
      const id = payload.bookingId ?? payload.id;
      if (id) void queryClient.invalidateQueries({ queryKey: ['owner', 'booking', id] });
      invalidateAll();
    };

    const onConnect = () => { socket.emit('subscribe:tenant', { tenantId }); invalidateAll(); };

    socket.emit('subscribe:tenant', { tenantId });
    socket.on('connect',            onConnect);
    socket.on('booking.confirmed',  invalidateOne);
    socket.on('booking:confirmed',  invalidateOne);
    socket.on('booking.cancelled',  invalidateOne);
    socket.on('booking:cancelled',  invalidateOne);
    socket.on('attendance.updated', invalidateOne);
    socket.on('booking.created',    invalidateAll);

    return () => {
      socket.emit('unsubscribe:tenant', { tenantId });
      socket.off('connect',            onConnect);
      socket.off('booking.confirmed',  invalidateOne);
      socket.off('booking:confirmed',  invalidateOne);
      socket.off('booking.cancelled',  invalidateOne);
      socket.off('booking:cancelled',  invalidateOne);
      socket.off('attendance.updated', invalidateOne);
      socket.off('booking.created',    invalidateAll);
    };
  }, [tenantId, token, queryClient]);
}
```

**Mount location:** Inside `BookingsTabScreen` (tab root). One subscription for the whole module; the React Query cache is global.

---

### Step 4 — `components/status-badge.tsx` (new)

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { FontSize, Radius } from '@/constants/theme';
import { getStatusMeta, getTypeMeta } from '@/lib/booking-status';

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const cfg = getStatusMeta(status);
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: cfg.color }, size === 'sm' && styles.textSm]}>
        {cfg.label.toUpperCase()}
      </Text>
    </View>
  );
}

export function BookingTypeBadge({ type }: { type: string }) {
  const cfg = getTypeMeta(type);
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  sm:    { paddingHorizontal: 6, paddingVertical: 2 },
  text:  { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.4 },
  textSm: { fontSize: 9 },
});
```

---

### Step 5 — `components/booking-skeleton.tsx` (new)

Animated shimmer placeholder that mirrors the exact height/layout of `BookingCard`.

Key points:
- Uses `Animated.Value` with a pulsing opacity loop (0.3 → 1.0, 750ms each)
- `BookingCardSkeleton` single card; `BookingSkeletonList({ count })` renders N of them
- Uses `colors.border` as shimmer background (matches light theme)

```tsx
// ShimmerBlock, BookingCardSkeleton, BookingSkeletonList
// (see component code in design notes — standard pattern)
```

---

### Step 6 — `components/booking-card.tsx` (new)

The canonical card rendered in all three screens. Accepts `BookingCardData` props.

**Layout:**
```
[ Avatar+Name+Phone ]  ·  [ StatusBadge + Amount ]
────────────────────────────────────────────────
[ SportIcon ] [ CourtName · Sport ]
              [ ⏰ HH:MM – HH:MM · duration ]
────────────────────────────────────────────────
#BOOKINGID        [ TypeBadge ] [ date ]
```

Key helpers inside the file:
- `formatSlot(start, end)` → `"18:00 – 19:00"`
- `formatDate(iso)` → `"14 Jul 2025"`
- `formatMoney(amount)` → `"₹1,200"`
- `getInitials(user)` → `"SR"`
- `getSportIcon(sport)` → `MaterialCommunityIcons` glyph

**`BookingCardData` type:**
```ts
interface BookingCardData {
  id: string;
  status: string;
  bookingType?: string;
  totalAmount?: string | number;
  date?: string;
  court?: { id: string; name: string; sport?: string };
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  slot?: { startTime: string; endTime: string };
  seats?: number;
}
```

---

### Step 7 — `app/bookings/_layout.tsx` (new)

Mirrors `app/ops/_layout.tsx` exactly:

```tsx
import { Stack } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';

export default function BookingsStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
```

---

### Step 8 — `app/(tabs)/bookings.tsx` (new, ~380 lines)

**Structure:**
```
BookingsTabScreen
  ├── useAuth() → token, user
  ├── useTheme() → colors
  ├── useSafeAreaInsets()
  ├── getTenantMe query → tenantId (for realtime subscription)
  ├── useBookingsLive(tenantId, token)  ← realtime
  ├── getOwnerDashboard query → stats (bookingsToday, revenueMtd)
  ├── useInfiniteQuery → getOwnerBookingsFiltered(token, { page, ...tabFilters })
  ├── activeTab state: 'today' | 'upcoming' | 'active' | 'completed' | 'cancelled' | 'walkins'
  ├── fabOpen state
  │
  ├── Fixed top bar (outside FlatList):
  │     "Bookings" title  |  search icon → /bookings/search  |  filter icon → /bookings/search
  │
  ├── FlatList (infinite scroll):
  │     ListHeaderComponent:
  │       ├── 3-column stats row: TODAY | ACTIVE | MTD REV (Cards)
  │       └── horizontal tab rail: Today | Upcoming | Active | Completed | Cancelled | Walk-ins
  │     renderItem → <BookingCard onPress → router.push('/bookings/'+id) />
  │     onEndReached → fetchNextPage()
  │     ListEmptyComponent → <EmptyState tab={activeTab} />
  │     ListFooterComponent → <BookingSkeletonList count={2} /> when isFetchingNextPage
  │
  └── FAB (absolute bottom-right, insets.bottom + 80):
        iOS: ActionSheetIOS
        Android: FabActionModal (slide-up sheet)
        Actions: Walk-in → /ops/walk-in | QR Scan → /ops/check-in-scanner
```

**Tab → filter param mapping:**
```ts
function tabToParams(tab: FilterTab): BookingsFilterParams {
  const today = new Date().toISOString().slice(0, 10);
  switch (tab) {
    case 'today':     return { startDate: today, endDate: today };
    case 'upcoming':  return { status: 'CONFIRMED,PENDING' };
    case 'active':    return { status: 'CONFIRMED' };
    case 'completed': return { status: 'COMPLETED' };
    case 'cancelled': return { status: 'CANCELLED' };
    case 'walkins':   return { bookingSource: 'OWNER_WALK_IN' };
    default:          return {};
  }
}
```

**Infinite query pattern:**
```ts
const listQuery = useInfiniteQuery({
  queryKey: ['owner', 'bookings', 'list', activeTab],
  queryFn: ({ pageParam = 1 }) =>
    getOwnerBookingsFiltered(token!, { page: pageParam as number, pageSize: 20, ...tabToParams(activeTab) }),
  getNextPageParam: (lastPage) => {
    const p = lastPage as unknown as { page: number; pageSize: number; total: number };
    return p.page * p.pageSize < p.total ? p.page + 1 : undefined;
  },
  initialPageParam: 1,
  enabled: !!token,
});

// Flatten pages:
const bookings = listQuery.data?.pages.flatMap((p) => p.items ?? []) ?? [];
```

---

### Step 9 — `app/bookings/[id].tsx` (new, ~350 lines)

```
BookingDetailScreen
  ├── useLocalSearchParams<{ id: string }>()
  ├── useQuery(['owner', 'booking', id]) → getBookingDetail(token, id)
  ├── useQuery(['owner', 'booking', id, 'qr']) → getBookingQr(token, id)
  │     enabled: status === 'CONFIRMED' || status === 'PENDING'
  ├── checkInMutation → checkInBooking(token, id, qrData.checkInCode)
  │     onSuccess → invalidate + Alert.alert('Checked In')
  ├── cancelMutation → cancelOwnerBooking(token, id, reason)
  │     onSuccess → invalidate + Alert.alert(refund info) + router.back()
  │
  ├── Fixed back header: ← arrow + "Booking Detail"
  │
  └── ScrollView:
        ├── Status banner Card (colored border by status + ID + StatusBadge + TypeBadge)
        ├── Player card: avatar initials | name | email | phone (tap → tel:)
        ├── Slot info card: court name · sport | slot time | date | duration | seats
        ├── Payment card: amount | paymentStatus badge | source (Walk-in vs App)
        ├── QR Code card (if CONFIRMED/PENDING): Image(qrCodeDataUrl) + checkInCode mono
        └── Action buttons row:
              [CONFIRMED/PENDING] "Check In"  →  checkInMutation.mutate()
              [CONFIRMED/PENDING] "Cancel"    →  Alert.alert → cancelMutation.mutate()
              [always]            "Call"      →  Linking.openURL('tel:'+phone)
```

**Important:** `getBookingDetail` calls `GET /bookings/:id`. This endpoint already exists on the backend (from exploration: `GET /bookings/:id` with `BOOKINGS_READ` permission). The `OwnerBookingRow` type is a superset that covers what the detail endpoint returns.

---

### Step 10 — `app/bookings/search.tsx` (new, ~280 lines)

```
SearchScreen
  ├── state: rawSearch, debouncedSearch (400ms debounce), status, courtId, bookingSource
  ├── getMyCourts query → court picker chips
  ├── useQuery(['owner','bookings','search', debouncedSearch, status, courtId, bookingSource])
  │     enabled: debouncedSearch.length >= 2 || status !== '' || courtId !== '' || bookingSource !== ''
  │     queryFn → getOwnerBookingsFiltered(token, { search, status, courtId, bookingSource, pageSize: 30 })
  │
  ├── Back header: ← arrow + TextInput (full-width, autofocus, placeholder "Search name, ID, phone…")
  ├── Filter chips row (horizontal scroll):
  │     Status: All | Confirmed | Pending | Completed | Cancelled
  │     Source: All | Walk-in | App
  │     Court:  All | {courts.map(c => c.name)}
  │
  └── FlatList:
        renderItem → <BookingCard onPress → router.push('/bookings/'+id) />
        ListEmptyComponent → prompt or "No results" 
```

---

### Step 11 — Modify `app/(tabs)/_layout.tsx`

Insert **after** the `courts` `<Tabs.Screen>` (line 133), **before** the `notifications` `<Tabs.Screen>`:

```tsx
<Tabs.Screen
  name="bookings"
  options={{
    title: 'Bookings',
    href: isOwner && !isCoachMode ? undefined : null,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
  }}
/>
```

Result: Owner tab bar → Dashboard | Courts | **Bookings** | Alerts | Settings (5 tabs, within iOS/Android limit)

---

### Step 12 — Modify `app/_layout.tsx`

In the `<Stack>` inside `OwnerNavigator`, add after `<Stack.Screen name="manage" />` (line 140):

```tsx
<Stack.Screen name="bookings" />
```

---

## Navigation Schema

```
/(tabs)/bookings       ← BookingsTabScreen (tab root)
  → /bookings/[id]    ← BookingDetailScreen
  → /bookings/search  ← SearchScreen
  → /ops/walk-in      ← existing WalkIn screen (unchanged)
  → /ops/check-in-scanner  ← existing QR scanner (unchanged)

/bookings/[id]
  → router.back()
  → /ops/check-in-scanner  (manual check-in)
  → Linking.openURL('tel:…')

/bookings/search
  → /bookings/[id]
  → router.back()
```

Route params: `[id].tsx` reads `useLocalSearchParams<{ id: string }>()`.

---

## Data Flow

```
User opens Bookings tab
  → useInfiniteQuery(['owner','bookings','list', activeTab])
  → getOwnerBookingsFiltered(token, { page: 1, ...tabToParams(activeTab) })
  → GET /bookings/owner/list?page=1&pageSize=20&status=...
  → renders BookingCard list

Realtime event (booking.confirmed, booking.cancelled, etc.)
  → useBookingsLive subscribes to tenant:{tenantId}
  → invalidateQueries(['owner','bookings'])
  → React Query auto-refetches background
  → list re-renders without user action

User taps BookingCard
  → router.push('/bookings/' + id)
  → useQuery(['owner','booking', id]) → getBookingDetail(token, id)
  → renders detail screen with QR code, actions

User taps "Check In" in detail
  → checkInMutation → checkInBooking(token, id, checkInCode)
  → POST /bookings/:id/check-in
  → invalidate queries → list + detail both refresh

User taps "Cancel" in detail
  → Alert.alert confirmation
  → cancelMutation → cancelOwnerBooking(token, id, reason)
  → POST /bookings/:id/cancel → { refundAmount, refundPercent }
  → Alert refund info → router.back()

User taps FAB + Walk-in
  → router.push('/ops/walk-in')
  → existing walk-in screen runs
  → on success, it already calls invalidateQueries(['owner','bookings'])
  → Bookings tab list refreshes automatically
```

---

## Key Design Decisions

1. **`app/bookings/_layout.tsx` is required.** Without a Stack layout file, Expo Router can't render `[id].tsx` and `search.tsx`. Pattern mirrors `app/ops/_layout.tsx`.

2. **`app/_layout.tsx` needs `<Stack.Screen name="bookings" />`**. Without this, the root Stack doesn't know about the `bookings` segment and navigation from the tab root will throw a missing-screen warning.

3. **`getOwnerBookingsFiltered` is a superset of `getOwnerBookings`**. Existing callers (`getOwnerBookings`) are not changed. Both hit `/bookings/owner/list` — new function just passes filter params.

4. **No `getBookingDetail` endpoint existed in the types layer**. The backend `GET /bookings/:id` endpoint exists (confirmed in backend exploration). We add `getBookingDetail` to the API layer.

5. **Realtime at tenant scope.** `subscribe:tenant` broadcasts all booking events for this owner's courts. This is better than per-court subscription for the bookings list (which spans all courts).

6. **FAB uses `ActionSheetIOS` on iOS, custom bottom-sheet Modal on Android.** This is the native pattern; no external library needed.

7. **Skeleton loader in `ListHeaderComponent`.** This ensures the stats row and tab bar render immediately (no loading state for them), and only the list area shows skeletons. Matches the Dashboard pattern.

8. **`PaginatedResponse<T>` shape** (from `@fitora/shared`): `{ items: T[]; page: number; pageSize: number; total: number; totalPages: number }`. The `getNextPageParam` reads `page * pageSize < total`.

---

## Verification Checklist

After implementation, verify:

1. **Tab navigation**: Owner sees 5 tabs: Dashboard, Courts, Bookings, Alerts, Settings. Coach sees no Bookings tab.
2. **List loads**: `Today` tab shows today's bookings from API.
3. **Tab switching**: Switching tabs fetches correct filtered data.
4. **Infinite scroll**: Scrolling to bottom loads page 2.
5. **Pull to refresh**: Works on FlatList.
6. **Tap card**: Opens `/bookings/[id]` detail screen.
7. **QR code**: Shows `Image` from `qrCodeDataUrl` base64 data URL for CONFIRMED bookings.
8. **Check In**: Calls `POST /bookings/:id/check-in`, shows success alert.
9. **Cancel**: Calls `POST /bookings/:id/cancel`, shows refund info, goes back.
10. **FAB**: Opens action sheet; Walk-in → `/ops/walk-in`; QR → `/ops/check-in-scanner`.
11. **Search**: Typing 2+ chars fetches filtered results.
12. **Realtime**: Creating a walk-in booking causes the Today tab to refresh automatically.
13. **No redesign**: Existing screens (ops/walk-in, ops/check-in-scanner, etc.) unchanged.

---

## Files NOT Modified

- `app/ops/walk-in.tsx` — unchanged (navigated to, not modified)
- `app/ops/check-in.tsx` — unchanged
- `app/ops/check-in-scanner.tsx` — unchanged
- `app/ops/check-in-success.tsx` — unchanged
- `app/(tabs)/index.tsx` — unchanged
- `components/ui.tsx` — unchanged (Card, Button, QueryState still used as-is)
- `constants/theme.ts` — unchanged
- `lib/realtime.ts` — unchanged
- `hooks/use-owner-calendar-live.ts` — unchanged
