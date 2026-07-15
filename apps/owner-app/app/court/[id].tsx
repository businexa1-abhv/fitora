import { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, type Court } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { courtPrimaryImage, getCourt, getOwnerBookings, getOwnerDashboard } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';

function formatTime(iso?: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const AMENITY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; detail: string }> = {
  Floodlights: { icon: 'bulb-outline', detail: 'Night play ready' },
  AC: { icon: 'snow-outline', detail: 'Climate controlled' },
  WiFi: { icon: 'wifi-outline', detail: 'Guest network' },
  Lockers: { icon: 'lock-closed-outline', detail: 'Secure storage' },
  Showers: { icon: 'water-outline', detail: 'Changing area' },
  Parking: { icon: 'car-outline', detail: 'On-site parking' },
  CCTV: { icon: 'videocam-outline', detail: 'Live monitoring' },
};

export default function CourtDetailScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dayOffset, setDayOffset] = useState(0);

  const courtQuery = useQuery({
    queryKey: ['owner', 'court', id],
    queryFn: () => getCourt(token!, id!),
    enabled: !!token && !!id,
  });

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: () => getOwnerBookings(token!),
    enabled: !!token,
  });

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  const court = courtQuery.data;
  const imageUrl = court ? courtPrimaryImage(court) : null;
  const selectedDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const dayBookings = useMemo(() => {
    const items = bookingsQuery.data?.items ?? [];
    const start = selectedDay.getTime();
    const end = start + 24 * 60 * 60 * 1000 - 1;
    return items
      .filter((b) => b.court?.id === id)
      .filter((b) => {
        const t = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
        return t >= start && t <= end;
      })
      .sort((a, b) => {
        const ta = a.slot?.startTime ? new Date(a.slot.startTime).getTime() : 0;
        const tb = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
        return ta - tb;
      });
  }, [bookingsQuery.data, id, selectedDay]);

  const revenue = dashboardQuery.data?.stats.revenueMtd ?? 0;
  const utilization =
    court?.isActive && court.approvalStatus === 'APPROVED'
      ? Math.min(98, 62 + dayBookings.length * 8)
      : 28;

  const amenityRows = (court?.amenities ?? []).slice(0, 4).map((name) => ({
    name,
    ...(AMENITY_META[name] ?? { icon: 'checkmark-circle-outline' as const, detail: 'Available' }),
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
          <View style={styles.topActions}>
            <Pressable onPress={() => router.push('/(tabs)/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'O').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <QueryState
          isLoading={courtQuery.isLoading}
          isError={courtQuery.isError}
          error={courtQuery.error as Error}
          onRetry={() => courtQuery.refetch()}
        >
          {court ? (
            <>
              <View style={styles.heroWrap}>
                {imageUrl ? (
                  <ImageBackground
                    source={{ uri: imageUrl }}
                    style={styles.hero}
                    imageStyle={styles.heroImg}
                  >
                    <View style={styles.heroOverlay} />
                    <HeroContent
                      court={court}
                      colors={colors}
                      onEdit={() => router.push(`/court/form?id=${court.id}`)}
                      onSchedule={() => router.push(`/court/availability?courtId=${court.id}`)}
                    />
                  </ImageBackground>
                ) : (
                  <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
                    <HeroContent
                      court={court}
                      colors={colors}
                      onEdit={() => router.push(`/court/form?id=${court.id}`)}
                      onSchedule={() => router.push(`/court/availability?courtId=${court.id}`)}
                    />
                  </View>
                )}
              </View>

              <View style={styles.body}>
                <View style={styles.metrics}>
                  <MetricCard
                    label="Utilization"
                    value={`${utilization}%`}
                    hint="+5.2% vs last week"
                    icon="trending-up"
                  />
                  <MetricCard
                    label="Monthly Revenue"
                    value={formatCurrency(revenue)}
                    hint="Academy share"
                    icon="cash-outline"
                  />
                  <MetricCard
                    label="Peak Hour"
                    value="18:00"
                    hint="Mon – Fri average"
                    icon="time-outline"
                  />
                  <MetricCard
                    label="Maint. Score"
                    value={court.isActive ? '98/100' : '72/100'}
                    hint={court.isActive ? 'Next check in 4d' : 'Needs attention'}
                    icon="construct-outline"
                  />
                </View>

                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Court Amenities
                </Text>
                <Card style={{ padding: Spacing.md, gap: Spacing.md }}>
                  {amenityRows.length === 0 ? (
                    <Text style={{ color: colors.muted }}>No amenities listed</Text>
                  ) : (
                    amenityRows.map((item) => (
                      <View key={item.name} style={styles.amenityRow}>
                        <View
                          style={[styles.amenityIcon, { backgroundColor: colors.surfaceContainer }]}
                        >
                          <Ionicons name={item.icon} size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                            {item.name}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                            {item.detail}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </Card>

                <Card style={[styles.qualityCard, { backgroundColor: colors.primary }]}>
                  <View style={styles.qualityHeader}>
                    <Ionicons name="shield-checkmark" size={16} color="#fff" />
                    <Text style={styles.qualityTitle}>Quality Insight</Text>
                  </View>
                  <Text style={styles.qualityBody}>
                    {court.approvalStatus === 'APPROVED'
                      ? 'Court is approved and live for player bookings. Traction and surface condition look strong for competitive play.'
                      : `Approval status: ${court.approvalStatus}. Complete details and await review before public bookings.`}
                  </Text>
                  <View style={styles.qualityTrack}>
                    <View
                      style={[
                        styles.qualityFill,
                        {
                          width: court.approvalStatus === 'APPROVED' ? '88%' : '42%',
                        },
                      ]}
                    />
                  </View>
                </Card>

                <View style={styles.scheduleHeader}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}
                  >
                    Today&apos;s Schedule
                  </Text>
                  <View style={styles.dateNav}>
                    <Pressable onPress={() => setDayOffset((d) => d - 1)} hitSlop={8}>
                      <Ionicons name="chevron-back" size={18} color={colors.primary} />
                    </Pressable>
                    <Text
                      style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}
                    >
                      {formatDateLabel(selectedDay)}
                    </Text>
                    <Pressable onPress={() => setDayOffset((d) => d + 1)} hitSlop={8}>
                      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>

                {dayBookings.length === 0 ? (
                  <Card style={{ padding: Spacing.lg }}>
                    <Text style={{ color: colors.muted }}>
                      No bookings for this day. Court is open for walk-ins.
                    </Text>
                    <Pressable
                      style={[
                        styles.bookBtn,
                        { backgroundColor: colors.primary, marginTop: Spacing.md },
                      ]}
                      onPress={() => router.push(`/court/availability?courtId=${court.id}`)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800' }}>View Full Schedule</Text>
                    </Pressable>
                  </Card>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    {dayBookings.map((booking) => {
                      const now = Date.now();
                      const start = booking.slot?.startTime
                        ? new Date(booking.slot.startTime).getTime()
                        : 0;
                      const end = booking.slot?.endTime
                        ? new Date(booking.slot.endTime).getTime()
                        : 0;
                      const inProgress = now >= start && now <= end;
                      const player =
                        `${booking.user?.firstName ?? ''} ${booking.user?.lastName ?? ''}`.trim() ||
                        'Player';
                      return (
                        <Card
                          key={booking.id}
                          style={[
                            styles.bookingCard,
                            inProgress && { backgroundColor: colors.surfaceContainer },
                          ]}
                        >
                          <Text style={[styles.bookingTime, { color: colors.primary }]}>
                            {formatTime(booking.slot?.startTime)}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                              Private Booking
                            </Text>
                            <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                              Client: {player}
                            </Text>
                          </View>
                          {inProgress ? (
                            <View style={[styles.pill, { backgroundColor: colors.primary }]}>
                              <Text style={styles.pillText}>IN PROGRESS</Text>
                            </View>
                          ) : (
                            <View style={[styles.pill, { backgroundColor: colors.mutedBg }]}>
                              <Text
                                style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}
                              >
                                {booking.status}
                              </Text>
                            </View>
                          )}
                        </Card>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          ) : null}
        </QueryState>
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => id && router.push(`/court/form?id=${id}`)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function HeroContent({
  court,
  colors,
  onEdit,
  onSchedule,
}: {
  court: Court;
  colors: ThemeColors;
  onEdit: () => void;
  onSchedule: () => void;
}) {
  const active = court.isActive && court.approvalStatus === 'APPROVED';
  return (
    <View style={styles.heroContent}>
      <View style={styles.badgeRow}>
        <View style={[styles.statusPill, { backgroundColor: active ? '#d1fae5' : '#ffedd5' }]}>
          <Text
            style={{
              color: active ? '#006c49' : '#5a3700',
              fontSize: 10,
              fontWeight: '800',
            }}
          >
            {active ? 'ACTIVE' : court.approvalStatus}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
            Court · {(court.sport?.name ?? 'Facility').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.heroTitle}>{court.name}</Text>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color="#fff" />
        <Text style={styles.heroLocation} numberOfLines={1}>
          {court.address}, {court.city}
        </Text>
      </View>
      <View style={styles.heroActions}>
        <Pressable style={styles.heroBtnGhost} onPress={onEdit}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.heroBtnText}>Edit Court</Text>
        </Pressable>
        <Pressable
          style={[styles.heroBtnSolid, { backgroundColor: colors.primary }]}
          onPress={onSchedule}
        >
          <Ionicons name="calendar-outline" size={16} color="#fff" />
          <Text style={styles.heroBtnText}>View Full Schedule</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={{ color: colors.foreground, fontSize: FontSize.lg, fontWeight: '800' }}>
        {value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '600' }}>{hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroWrap: { paddingHorizontal: Spacing.lg },
  hero: {
    borderRadius: Radius.lg,
    height: 220,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImg: { borderRadius: Radius.lg },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,28,45,0.45)',
  },
  heroContent: { gap: 6, padding: Spacing.lg },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm },
  statusPill: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  heroTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  heroLocation: { color: 'rgba(255,255,255,0.9)', flex: 1, fontSize: FontSize.sm },
  heroActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  heroBtnGhost: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  heroBtnSolid: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  heroBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  body: { gap: Spacing.md, padding: Spacing.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricCard: { flexBasis: '47%', flexGrow: 1, gap: 4, padding: Spacing.md },
  metricTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.sm },
  amenityRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  amenityIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  qualityCard: { gap: Spacing.sm, padding: Spacing.lg },
  qualityHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  qualityTitle: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 0.4 },
  qualityBody: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, lineHeight: 20 },
  qualityTrack: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    height: 6,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  qualityFill: { backgroundColor: '#6cf8bb', height: '100%' },
  scheduleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  dateNav: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  bookingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  bookingTime: { fontSize: FontSize.sm, fontWeight: '800', width: 72 },
  pill: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  pillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bookBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
  },
  fab: {
    alignItems: 'center',
    borderRadius: Radius.full,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 56,
  },
});
