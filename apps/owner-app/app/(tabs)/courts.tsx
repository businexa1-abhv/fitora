import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, type Court } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { getMyCourts, getOwnerDashboard } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function statusMeta(court: Court) {
  if (!court.isActive) {
    return { label: 'INACTIVE', color: '#777683', bg: '#e7eeff' };
  }
  if (court.approvalStatus === 'APPROVED') {
    return { label: 'ACTIVE', color: '#006c49', bg: '#d1fae5' };
  }
  if (court.approvalStatus === 'PENDING') {
    return { label: 'PENDING', color: '#5a3700', bg: '#ffedd5' };
  }
  if (court.approvalStatus === 'REJECTED') {
    return { label: 'REJECTED', color: '#ba1a1a', bg: '#fee2e2' };
  }
  return { label: court.approvalStatus, color: '#464652', bg: '#f0f3ff' };
}

function priceOrFallback(value?: string | null) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function CourtsInventoryScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  const courts = courtsQuery.data?.items ?? [];
  const activeCount = courts.filter((c) => c.isActive && c.approvalStatus === 'APPROVED').length;
  const stats = dashboardQuery.data?.stats;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.primary }]}>FitOra Owner</Text>
        <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Court Inventory</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Real-time status of all athletic facilities.
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="filter-outline" size={16} color={colors.primary} />
          <Text style={[styles.filterText, { color: colors.primary }]}>Filter</Text>
        </Pressable>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add-circle" size={16} color="#fff" />
          <Text style={styles.addText}>Add Facility</Text>
        </Pressable>
      </View>

      <View style={styles.metrics}>
        <Metric label="Total Courts" value={String(courts.length)} hint="Facilities" />
        <Metric
          label="Active Now"
          value={String(activeCount).padStart(2, '0')}
          hint="Live"
          tone="success"
        />
        <Metric
          label="Daily Revenue"
          value={formatCurrency(stats?.bookingsToday ? stats.revenueMtd / 30 : 0)}
          hint="Projected"
        />
        <Metric label="Bookings MTD" value={String(stats?.bookingsMtd ?? 0)} hint="Confirmed" />
      </View>

      <QueryState
        isLoading={courtsQuery.isLoading}
        isError={courtsQuery.isError}
        error={courtsQuery.error as Error}
        onRetry={() => courtsQuery.refetch()}
        empty={courts.length === 0}
      >
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          {courts.map((court) => {
            const status = statusMeta(court);
            return (
              <Card key={court.id} style={{ padding: 0, overflow: 'hidden' }}>
                <View style={[styles.courtVisual, { backgroundColor: colors.surfaceContainer }]}>
                  <Text style={styles.courtEmoji}>🏸</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={{ color: status.color, fontSize: 10, fontWeight: '800' }}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <View style={{ padding: Spacing.lg }}>
                  <View style={styles.courtTitleRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.courtName, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {court.name}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 2 }}>
                        {court.city} · from{' '}
                        {formatCurrency(priceOrFallback(court.defaultSlotPrice))}/hr
                      </Text>
                    </View>
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
                  </View>
                  <Text style={[styles.metaLine, { color: colors.muted }]} numberOfLines={2}>
                    {court.address}
                  </Text>
                  <Pressable
                    style={[
                      styles.courtAction,
                      {
                        backgroundColor:
                          court.approvalStatus === 'APPROVED' ? colors.primary : colors.card,
                        borderColor: colors.primary,
                        borderWidth: court.approvalStatus === 'APPROVED' ? 0 : 1.5,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: court.approvalStatus === 'APPROVED' ? '#fff' : colors.primary,
                        fontWeight: '800',
                        fontSize: FontSize.sm,
                      }}
                    >
                      {court.approvalStatus === 'APPROVED' ? 'Manage Bookings' : 'View Details'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      </QueryState>
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'success';
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.metricCard}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          { color: tone === 'success' ? colors.secondary : colors.foreground },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '600' }}>{hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  subtitle: { fontSize: FontSize.sm, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  filterBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterText: { fontSize: FontSize.sm, fontWeight: '700' },
  addBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  addText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  metricCard: { flexBasis: '47%', flexGrow: 1, gap: 2, padding: Spacing.md },
  metricLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { fontSize: FontSize.lg, fontWeight: '800' },
  courtVisual: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
  },
  courtEmoji: { fontSize: 48 },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
  },
  courtTitleRow: { flexDirection: 'row', gap: Spacing.sm },
  courtName: { fontSize: FontSize.lg, fontWeight: '800' },
  metaLine: { fontSize: FontSize.xs, marginTop: Spacing.sm },
  courtAction: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
