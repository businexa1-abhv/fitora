import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { getTrainerDashboard } from '@/lib/trainer-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export function CoachDashboardScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const dashboardQuery = useQuery({
    queryKey: ['trainer', 'dashboard'],
    queryFn: () => getTrainerDashboard(token!),
    enabled: !!token,
  });

  const dashboard = dashboardQuery.data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="whistle-outline" size={22} color={colors.primary} />
            <Text style={[styles.brand, { color: colors.primary }]}>FitOra Coach</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] ?? 'C').toUpperCase()}
              {(user?.lastName?.[0] ?? '').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.overview, { color: colors.foreground }]}>Coach Dashboard</Text>
        <Text style={[styles.welcome, { color: colors.muted }]}>
          Welcome back, {user?.firstName || 'Coach'}. Your batches and daily tasks at a glance.
        </Text>

        <QueryState
          isLoading={dashboardQuery.isLoading}
          isError={dashboardQuery.isError}
          error={dashboardQuery.error as Error}
          onRetry={() => dashboardQuery.refetch()}
        >
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>BATCHES</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {dashboard?.batchCount ?? 0}
              </Text>
            </Card>
            <Card style={[styles.statCard, { flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>STUDENTS</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {dashboard?.activeStudents ?? 0}
              </Text>
            </Card>
          </View>

          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>MARKED TODAY</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {dashboard?.attendanceMarkedToday ?? 0}
              </Text>
            </Card>
            <Card style={[styles.statCard, { flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>PENDING</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {dashboard?.pendingAttendance ?? 0}
              </Text>
              {(dashboard?.pendingAttendance ?? 0) > 0 ? (
                <Text style={{ color: colors.tertiary, fontSize: 10, fontWeight: '700' }}>
                  Needs attention
                </Text>
              ) : (
                <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '700' }}>
                  All caught up
                </Text>
              )}
            </Card>
          </View>

          <Pressable
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/attendance' as never)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <View>
              <Text style={styles.primaryActionTitle}>Mark Attendance</Text>
              <Text style={styles.primaryActionSub}>Present or absent for today</Text>
            </View>
          </Pressable>

          <View style={styles.quickRow}>
            <Pressable
              style={[
                styles.quickCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push('/(tabs)/schedule' as never)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.quickTitle, { color: colors.foreground }]}>Schedule</Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push('/(tabs)/profile' as never)}
            >
              <Ionicons name="airplane-outline" size={20} color={colors.primary} />
              <Text style={[styles.quickTitle, { color: colors.foreground }]}>Leave</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Batches</Text>
            <Pressable onPress={() => router.push('/(tabs)/training' as never)}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>
                View all
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: Spacing.sm }}>
            {(dashboard?.batches ?? []).length === 0 ? (
              <Card>
                <Text style={{ color: colors.muted }}>No batches assigned yet.</Text>
              </Card>
            ) : (
              (dashboard?.batches ?? []).slice(0, 5).map((batch) => (
                <Card key={batch.id} style={styles.batchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.batchName, { color: colors.foreground }]}>
                      {batch.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {batch.program?.name} · {batch.schedule}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: 2 }}>
                      {batch.enrollments?.length ?? 0} active students
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Card>
              ))
            )}
          </View>
        </QueryState>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  overview: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.xl },
  welcome: { fontSize: FontSize.sm, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statCard: { gap: 4, padding: Spacing.md },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statValue: { fontSize: FontSize.xxl, fontWeight: '800' },
  primaryAction: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  primaryActionTitle: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  primaryActionSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  quickCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  quickTitle: { fontSize: FontSize.sm, fontWeight: '800' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  batchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  batchName: { fontSize: FontSize.md, fontWeight: '800' },
});
