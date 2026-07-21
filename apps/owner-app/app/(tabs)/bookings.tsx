import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { BookingCard, type BookingCardData } from '@/components/booking-card';
import { BookingSkeletonList } from '@/components/booking-skeleton';
import { useBookingsLive } from '@/hooks/use-bookings-live';
import {
  getOwnerBookingsFiltered,
  getOwnerDashboard,
  getTenantMe,
  type BookingsFilterParams,
  type OwnerBookingRow,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'today' | 'upcoming' | 'active' | 'completed' | 'cancelled' | 'walkins';

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'walkins', label: 'Walk-ins' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tabToParams(tab: FilterTab): BookingsFilterParams {
  const today = new Date().toISOString().slice(0, 10);
  switch (tab) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'upcoming':
      return { status: 'CONFIRMED,PENDING' };
    case 'active':
      return { status: 'CONFIRMED' };
    case 'completed':
      return { status: 'COMPLETED' };
    case 'cancelled':
      return { status: 'CANCELLED' };
    case 'walkins':
      return { bookingSource: 'OWNER_WALK_IN' };
    default:
      return {};
  }
}

function rowToCardData(row: OwnerBookingRow): BookingCardData {
  return {
    id: row.id,
    status: row.status,
    bookingType: row.bookingType,
    totalAmount: row.totalAmount,
    date: row.slot?.startTime ?? row.createdAt,
    court: row.court
      ? { id: row.court.id, name: row.court.name, sport: row.court.sportType }
      : undefined,
    user: row.user,
    slot: row.slot,
    seats: row.seats,
  };
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <Card style={[styles.statCard, accent && { borderColor: colors.primary, borderWidth: 1.5 }]}>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
    </Card>
  );
}

function FabActionModal({
  visible,
  onClose,
  onWalkIn,
  onQrScan,
}: {
  visible: boolean;
  onClose: () => void;
  onWalkIn: () => void;
  onQrScan: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const actions = [
    {
      icon: 'person-add-outline' as const,
      label: 'Walk-in Booking',
      onPress: onWalkIn,
      color: '#f97316',
    },
    {
      icon: 'qr-code-outline' as const,
      label: 'Scan QR / Check-in',
      onPress: onQrScan,
      color: colors.primary,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + Spacing.lg,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New Booking</Text>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [
                styles.sheetAction,
                { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => {
                onClose();
                a.onPress();
              }}
            >
              <View style={[styles.sheetIcon, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={[styles.sheetLabel, { color: colors.foreground }]}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const { colors } = useTheme();
  const messages: Record<
    FilterTab,
    { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }
  > = {
    today: {
      icon: 'calendar-outline',
      title: 'No bookings today',
      body: 'Walk-ins and reservations will appear here.',
    },
    upcoming: {
      icon: 'time-outline',
      title: 'No upcoming bookings',
      body: 'Confirmed future bookings will appear here.',
    },
    active: {
      icon: 'checkmark-circle-outline',
      title: 'No active bookings',
      body: 'Confirmed and checked-in sessions appear here.',
    },
    completed: {
      icon: 'trophy-outline',
      title: 'No completed bookings',
      body: 'Sessions that were checked in appear here.',
    },
    cancelled: {
      icon: 'close-circle-outline',
      title: 'No cancellations',
      body: 'Cancelled and refunded bookings appear here.',
    },
    walkins: {
      icon: 'walk-outline',
      title: 'No walk-ins yet',
      body: 'Walk-in bookings created at the counter appear here.',
    },
  };
  const msg = messages[tab];
  return (
    <View style={styles.emptyBox}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.mutedBg }]}>
        <Ionicons name={msg.icon} size={32} color={colors.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{msg.title}</Text>
      <Text style={[styles.emptyBody, { color: colors.muted }]}>{msg.body}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingsTabScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [fabOpen, setFabOpen] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);

  // ── Tenant ID for realtime ──────────────────────────────────────────────────
  const tenantQuery = useQuery({
    queryKey: ['owner', 'tenant'],
    queryFn: () => getTenantMe(token!),
    enabled: !!token,
  });

  // ── Realtime subscription ───────────────────────────────────────────────────
  useBookingsLive(tenantQuery.data?.id, token);

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  // ── Infinite booking list ────────────────────────────────────────────────────
  const listQuery = useInfiniteQuery({
    queryKey: ['owner', 'bookings', 'list', activeTab],
    queryFn: ({ pageParam = 1 }) =>
      getOwnerBookingsFiltered(token!, {
        page: pageParam as number,
        pageSize: 20,
        ...tabToParams(activeTab),
      }),
    getNextPageParam: (lastPage) => {
      const p = lastPage as unknown as { page: number; pageSize: number; total: number };
      return (p.page ?? 1) * (p.pageSize ?? 20) < (p.total ?? 0) ? (p.page ?? 1) + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!token,
  });

  // Flatten all pages
  const bookings: BookingCardData[] = useMemo(
    () => (listQuery.data?.pages ?? []).flatMap((page) => (page.items ?? []).map(rowToCardData)),
    [listQuery.data],
  );

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = dashboardQuery.data?.stats;
  const todayCount = stats?.bookingsToday ?? 0;
  const activeCount = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN',
  ).length;
  const revenueMtd = stats?.revenueMtd ?? 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleTabPress = useCallback((key: FilterTab, index: number) => {
    setActiveTab(key);
    tabScrollRef.current?.scrollTo({ x: Math.max(0, index * 96 - 48), animated: true });
  }, []);

  const handleFabPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Walk-in Booking', 'Scan QR / Check-in'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) router.push('/ops/walk-in');
          if (idx === 2) router.push('/ops/check-in-scanner');
        },
      );
    } else {
      setFabOpen(true);
    }
  }, [router]);

  const handleCardPress = useCallback(
    (id: string) => router.push({ pathname: '/bookings/[id]' as never, params: { id } }),
    [router],
  );

  const handleLoadMore = useCallback(() => {
    if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
      void listQuery.fetchNextPage();
    }
  }, [listQuery]);

  // ── Render ────────────────────────────────────────────────────────────────────
  const isFirstLoad = listQuery.isLoading && bookings.length === 0;

  const ListHeader = (
    <>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="TODAY" value={String(todayCount)} accent />
        <StatCard label="ACTIVE" value={String(activeCount)} />
        <StatCard label="MTD REV" value={formatCompact(revenueMtd)} />
      </View>

      {/* Tab rail */}
      <View style={[styles.tabBarWrap, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {FILTER_TABS.map(({ key, label }, index) => {
            const isActive = key === activeTab;
            return (
              <Pressable
                key={key}
                onPress={() => handleTabPress(key, index)}
                style={styles.tabItem}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.muted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {label}
                </Text>
                {isActive && (
                  <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isFirstLoad && (
        <View style={{ marginTop: Spacing.md }}>
          <BookingSkeletonList count={5} />
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Bookings</Text>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push('/bookings/search' as never)}
            style={styles.iconBtn}
          >
            <Ionicons name="search-outline" size={22} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/bookings/search' as never)}
            style={styles.iconBtn}
          >
            <Ionicons name="filter-outline" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* Booking list */}
      <FlatList
        data={isFirstLoad ? [] : bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard booking={item} onPress={handleCardPress} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={isFirstLoad ? null : <EmptyState tab={activeTab} />}
        ListFooterComponent={
          listQuery.isFetchingNextPage ? (
            <View style={{ marginTop: Spacing.sm }}>
              <BookingSkeletonList count={2} />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: Spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <Pressable
        onPress={handleFabPress}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Android action sheet */}
      <FabActionModal
        visible={fabOpen}
        onClose={() => setFabOpen(false)}
        onWalkIn={() => router.push('/ops/walk-in')}
        onQrScan={() => router.push('/ops/check-in-scanner')}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    padding: Spacing.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },

  // Tab bar
  tabBarWrap: {
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  tabBarContent: {
    paddingHorizontal: 0,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  tabLabel: {
    fontSize: FontSize.sm,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 2,
    borderRadius: Radius.full,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    maxWidth: 260,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Android FAB modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.lg,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
