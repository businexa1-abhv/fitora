import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency, type Court } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { courtPrimaryImage, getMyCourts } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function statusMeta(court: Court) {
  if (!court.isActive) {
    return { label: 'Inactive', color: '#777683', bg: '#e7eeff', icon: 'pause-circle' as const };
  }
  if (court.approvalStatus === 'APPROVED') {
    return {
      label: 'Available',
      color: '#006c49',
      bg: '#d1fae5',
      icon: 'checkmark-circle' as const,
    };
  }
  if (court.approvalStatus === 'PENDING') {
    return { label: 'Pending', color: '#5a3700', bg: '#ffedd5', icon: 'time' as const };
  }
  if (court.approvalStatus === 'REJECTED') {
    return { label: 'Rejected', color: '#ba1a1a', bg: '#fee2e2', icon: 'close-circle' as const };
  }
  return { label: court.approvalStatus, color: '#464652', bg: '#f0f3ff', icon: 'ellipse' as const };
}

function priceOrFallback(value?: string | null) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function CourtsInventoryScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sportFilter, setSportFilter] = useState<string>('all');

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const courts = courtsQuery.data?.items ?? [];
  const sportTabs = useMemo(() => {
    const names = new Set<string>();
    for (const court of courts) {
      if (court.sport?.name) names.add(court.sport.name);
    }
    return ['all', ...Array.from(names).sort()];
  }, [courts]);

  const filtered = useMemo(() => {
    if (sportFilter === 'all') return courts;
    return courts.filter((c) => c.sport?.name === sportFilter);
  }, [courts, sportFilter]);

  const activeCount = courts.filter((c) => c.isActive && c.approvalStatus === 'APPROVED').length;
  const maintenanceCount = courts.filter((c) => !c.isActive).length;
  const occupancy = courts.length > 0 ? Math.round((activeCount / courts.length) * 45) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="karate" size={22} color={colors.primary} />
            <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
          </View>
          <View style={styles.headerActions}>
            <Ionicons name="search-outline" size={22} color={colors.foreground} />
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'O').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Court Inventory</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Manage and monitor academy facilities
        </Text>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryChip, { color: colors.secondary }]}>
            {activeCount} Active
          </Text>
          <Text style={[styles.summaryChip, { color: colors.warning }]}>
            {maintenanceCount} Maintenance
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {sportTabs.map((tab) => {
            const active = sportFilter === tab;
            const label = tab === 'all' ? 'All Courts' : tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setSportFilter(tab)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.primary,
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <QueryState
          isLoading={courtsQuery.isLoading}
          isError={courtsQuery.isError}
          error={courtsQuery.error as Error}
          onRetry={() => courtsQuery.refetch()}
          empty={filtered.length === 0}
        >
          <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
            {filtered.map((court) => {
              const status = statusMeta(court);
              const imageUrl = courtPrimaryImage(court);
              return (
                <Pressable key={court.id} onPress={() => router.push(`/court/${court.id}`)}>
                  <Card style={styles.courtCard}>
                    <View
                      style={[styles.courtVisual, { backgroundColor: colors.surfaceContainer }]}
                    >
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.courtImage} />
                      ) : (
                        <Text style={styles.courtEmoji}>🏸</Text>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon} size={12} color={status.color} />
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
                          <Text style={[styles.sportLabel, { color: colors.muted }]}>
                            {(court.sport?.name ?? 'Court').toUpperCase()}
                          </Text>
                        </View>
                        <Pressable
                          hitSlop={8}
                          onPress={() => router.push(`/court/form?id=${court.id}`)}
                        >
                          <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
                        </Pressable>
                      </View>
                      <View style={styles.metaGrid}>
                        <MetaCell
                          label="Capacity"
                          value="4 Players"
                          muted={colors.muted}
                          fg={colors.foreground}
                        />
                        <MetaCell
                          label="Surface"
                          value={court.city}
                          muted={colors.muted}
                          fg={colors.foreground}
                        />
                      </View>
                      <View style={styles.metaGrid}>
                        <MetaCell
                          label="Price"
                          value={`${formatCurrency(priceOrFallback(court.defaultSlotPrice))}/hr`}
                          muted={colors.muted}
                          fg={colors.foreground}
                        />
                        <MetaCell
                          label="Status"
                          value={court.approvalStatus}
                          muted={colors.muted}
                          fg={colors.foreground}
                        />
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </QueryState>

        <Card style={[styles.insightCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.insightTitle}>Capacity Insight</Text>
          <Text style={styles.insightBody}>
            Current occupancy is at {occupancy}%. You have {activeCount} courts available for
            short-term rental bookings this evening.
          </Text>
          <Pressable style={styles.insightBtn} onPress={() => router.push('/(tabs)/analytics')}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: FontSize.sm }}>
              View Analytics
            </Text>
          </Pressable>
        </Card>
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 76 }]}
        onPress={() => router.push('/court/form')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function MetaCell({
  label,
  value,
  muted,
  fg,
}: {
  label: string;
  value: string;
  muted: string;
  fg: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: fg, fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  subtitle: { fontSize: FontSize.sm, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  summaryChip: { fontSize: FontSize.sm, fontWeight: '800' },
  tabs: { gap: Spacing.sm, marginTop: Spacing.lg, paddingRight: Spacing.lg },
  tab: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  courtCard: { overflow: 'hidden', padding: 0 },
  courtVisual: {
    alignItems: 'center',
    height: 150,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  courtImage: { height: '100%', width: '100%' },
  courtEmoji: { fontSize: 48 },
  statusBadge: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
  },
  courtTitleRow: { flexDirection: 'row', gap: Spacing.sm },
  courtName: { fontSize: FontSize.lg, fontWeight: '800' },
  sportLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  metaGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  insightCard: { gap: Spacing.sm, marginTop: Spacing.xl, padding: Spacing.lg },
  insightTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  insightBody: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, lineHeight: 20 },
  insightBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
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
