import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookingStatus,
  SPORT_LABELS,
  SportType,
  formatCurrency,
  type Booking,
} from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { getMyBookings } from '@/lib/courts';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type BookingTab = 'upcoming' | 'completed' | 'cancelled';

type TabConfig = {
  key: BookingTab;
  label: string;
  status: BookingStatus;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyTitle: string;
  emptyText: string;
};

const TABS: TabConfig[] = [
  {
    key: 'upcoming',
    label: 'Upcoming',
    status: BookingStatus.CONFIRMED,
    emptyIcon: 'calendar-clear-outline',
    emptyTitle: 'No Upcoming Bookings',
    emptyText: 'Your confirmed court reservations and check-in passes will appear here.',
  },
  {
    key: 'completed',
    label: 'Completed',
    status: BookingStatus.COMPLETED,
    emptyIcon: 'time-outline',
    emptyTitle: 'No Completed Bookings',
    emptyText: 'Your history of past training sessions and court rentals will appear here.',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    status: BookingStatus.CANCELLED,
    emptyIcon: 'close-circle-outline',
    emptyTitle: 'No Cancelled Bookings',
    emptyText: 'Cancelled reservations will be listed here for quick reference.',
  },
];

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getSport(booking: Booking) {
  return (booking.court?.sportType as SportType | null) ?? SportType.OTHER;
}

export default function BookingsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');
  const activeConfig = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'my', activeConfig.status],
    queryFn: () => getMyBookings(token!, 1, activeConfig.status),
    enabled: !!token,
  });

  const bookings = bookingsQuery.data?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerButton} />
        <View style={styles.brandWrap}>
          <Ionicons name="location" size={17} color={colors.accent} />
          <Text style={[styles.brand, { color: colors.primary }]}>FitOra</Text>
        </View>
        <Pressable style={[styles.headerButton, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-outline" size={21} color={colors.primary} />
        </Pressable>
      </View>

      <View
        style={[
          styles.tabs,
          { borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabButton}>
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.muted }]}>
                {tab.label}
              </Text>
              <View
                style={[
                  styles.tabIndicator,
                  { backgroundColor: active ? colors.primary : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <QueryState
        isLoading={bookingsQuery.isLoading}
        isError={bookingsQuery.isError}
        error={bookingsQuery.error as Error}
        onRetry={() => bookingsQuery.refetch()}
      >
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.title, { color: colors.foreground }]}>Your Reservations</Text>
              <View style={[styles.countPill, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>
                  {bookingsQuery.data?.total ?? 0}{' '}
                  {bookingsQuery.data?.total === 1 ? 'Booking' : 'Bookings'}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyState config={activeConfig} />}
          renderItem={({ item }) => <BookingCard booking={item} tab={activeTab} />}
        />
      </QueryState>
    </View>
  );
}

function BookingCard({ booking, tab }: { booking: Booking; tab: BookingTab }) {
  const { colors } = useTheme();
  const router = useRouter();
  const sport = getSport(booking);
  const sportColor = SPORT_COLORS[sport];
  const startTime = booking.slot?.startTime;
  const endTime = booking.slot?.endTime;

  function openCheckIn() {
    router.push({
      pathname: '/booking/success',
      params: {
        bookingId: booking.id,
        courtName: booking.court?.name ?? 'Court Booking',
        city: booking.court?.city ?? '',
        startTime,
        endTime,
        amount: booking.totalAmount,
      },
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.visual, { backgroundColor: `${sportColor}24` }]}>
        <Text style={styles.visualEmoji}>{SPORT_EMOJI[sport]}</Text>
        <Badge
          label={booking.status === BookingStatus.CONFIRMED ? 'Confirmed' : booking.status}
          variant={booking.status === BookingStatus.CONFIRMED ? 'success' : 'default'}
        />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.court, { color: colors.foreground }]} numberOfLines={2}>
            {booking.court?.name ?? 'Court Booking'}
          </Text>
          <View style={[styles.sportPill, { backgroundColor: `${sportColor}18` }]}>
            <Text style={[styles.sportPillText, { color: sportColor }]}>{SPORT_LABELS[sport]}</Text>
          </View>
        </View>

        <View style={styles.metaStack}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{formatDate(startTime)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={18} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {formatTime(startTime)} - {formatTime(endTime)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="wallet-outline" size={18} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {formatCurrency(Number(booking.totalAmount))}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {tab === 'upcoming' ? (
            <>
              <ActionButton
                icon="qr-code-outline"
                label="Check-in QR"
                filled
                onPress={openCheckIn}
              />
              <ActionButton label="Reschedule" />
              <ActionButton label="Cancel" danger />
            </>
          ) : (
            <>
              <ActionButton label="View Pass" filled onPress={openCheckIn} />
              <ActionButton label="Book Again" onPress={() => router.push('/search')} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  danger,
  filled,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  filled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const color = filled ? '#fff' : danger ? colors.danger : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: filled ? colors.primary : 'transparent',
          borderColor: danger ? colors.danger : colors.border,
          borderWidth: filled ? 0 : 1.5,
        },
        pressed && styles.pressed,
      ]}
    >
      {icon && <Ionicons name={icon} size={17} color={color} />}
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ config }: { config: TabConfig }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.mutedBg }]}>
        <Ionicons name={config.emptyIcon} size={42} color={colors.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{config.emptyTitle}</Text>
      <Text style={[styles.emptyText, { color: colors.muted }]}>{config.emptyText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  brand: { fontSize: FontSize.xxl, fontWeight: '900' },
  tabs: { borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: Spacing.xl },
  tabButton: { alignItems: 'center', flex: 1, gap: Spacing.sm, paddingTop: Spacing.md },
  tabText: { fontSize: FontSize.md, fontWeight: '900' },
  tabIndicator: { borderRadius: Radius.full, height: 2, width: '100%' },
  list: { gap: Spacing.lg, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: FontSize.xl, fontWeight: '900' },
  countPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  countText: { fontSize: FontSize.xs, fontWeight: '900' },
  card: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  visual: { minHeight: 150, justifyContent: 'space-between', padding: Spacing.md },
  visualEmoji: { fontSize: 62 },
  cardBody: { gap: Spacing.lg, padding: Spacing.lg },
  cardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  court: { flex: 1, fontSize: FontSize.xl, fontWeight: '900', lineHeight: 26 },
  sportPill: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  sportPillText: { fontSize: FontSize.xs, fontWeight: '900' },
  metaStack: { gap: Spacing.sm },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  metaText: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  actionText: { fontSize: FontSize.sm, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: 70 },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 96,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    width: 96,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.sm, textAlign: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
