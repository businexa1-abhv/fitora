import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import { ManageHeader } from '@/components/manage-header';
import { listStaffShifts, type VenueStaffShift } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

const ROLE_COLOR: Record<VenueStaffShift['role'], string> = {
  Coach: '#d1fae5',
  'Front Desk': '#e0e7ff',
  Maintenance: '#fef3c7',
};

export default function StaffShiftWeekViewScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [selected, setSelected] = useState(0);

  const days = useMemo(
    () => DAYS.map((label, i) => ({ label, date: iso(addDays(weekStart, i)) })),
    [weekStart],
  );
  const from = days[0]?.date;
  const to = days[6]?.date;

  const query = useQuery({
    queryKey: ['owner', 'staff-shifts', from, to],
    queryFn: () => listStaffShifts(token!, from, to),
    enabled: !!token && !!from && !!to,
  });

  const shifts = query.data ?? [];
  const dayShifts = shifts.filter((s) => s.date.slice(0, 10) === days[selected]?.date);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Week Roster" />
      <View style={styles.top}>
        <Text style={[styles.title, { color: colors.foreground }]}>Staff Week View</Text>
        <Pressable
          style={[styles.add, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/manage/staff-edit')}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.weekNav}>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))}>
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>
          {from} – {to}
        </Text>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: Spacing.md }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {days.map((d, i) => (
            <Pressable
              key={d.date}
              onPress={() => setSelected(i)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selected === i ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected === i ? '#fff' : colors.muted,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {d.label}
              </Text>
              <Text
                style={{
                  color: selected === i ? '#fff' : colors.foreground,
                  fontWeight: '800',
                }}
              >
                {d.date.slice(8)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {dayShifts.length === 0 ? (
          <View style={{ marginTop: Spacing.lg }}>
            <EmptyState
              icon="people-outline"
              title="No shifts this day"
              message="Add a staff shift to fill the roster."
              ctaLabel="Add shift"
              onCta={() => router.push('/manage/staff-edit')}
            />
          </View>
        ) : (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            {dayShifts.map((s) => (
              <Pressable
                key={s.id}
                onPress={() =>
                  router.push({ pathname: '/manage/staff-edit', params: { id: s.id } })
                }
              >
                <Card style={styles.row}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: ROLE_COLOR[s.role] ?? colors.mutedBg },
                    ]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800' }}>{s.role}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                      {s.staffName}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {s.startTime}–{s.endTime} · {s.area}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  add: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  weekNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  dayChip: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 2,
    minWidth: 52,
    padding: Spacing.sm,
  },
  row: { gap: Spacing.sm, padding: Spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
});
