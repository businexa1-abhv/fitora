import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { listStaffShifts } from '@/lib/owner-api';
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

export default function StaffShiftRosterScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const weekStart = startOfWeek();
  const [dayIdx, setDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  const from = iso(weekStart);
  const to = iso(addDays(weekStart, 6));
  const selectedDate = iso(addDays(weekStart, dayIdx));

  const shiftsQuery = useQuery({
    queryKey: ['owner', 'staff-shifts', from, to],
    queryFn: () => listStaffShifts(token!, from, to),
    enabled: !!token,
  });

  const dayShifts = useMemo(
    () => (shiftsQuery.data ?? []).filter((s) => s.date.slice(0, 10) === selectedDate),
    [shiftsQuery.data, selectedDate],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Staff Roster" />
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Staff Shift Roster</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            Weekly coverage for coaches and front-desk staff.
          </Text>
        </View>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.mutedBg }]}
          onPress={() => router.push('/manage/staff-week')}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/manage/staff-edit')}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: Spacing.lg }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {DAYS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => setDayIdx(i)}
              style={[
                styles.day,
                { backgroundColor: dayIdx === i ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={{ color: dayIdx === i ? '#fff' : colors.foreground, fontWeight: '800' }}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <QueryState
        isLoading={shiftsQuery.isLoading}
        isError={shiftsQuery.isError}
        error={shiftsQuery.error as Error}
        onRetry={() => shiftsQuery.refetch()}
        empty={dayShifts.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {dayShifts.map((row) => (
            <Pressable
              key={row.id}
              onPress={() =>
                router.push({ pathname: '/manage/staff-edit', params: { id: row.id } })
              }
            >
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                    {row.staffName}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                    {row.role} · {row.startTime}–{row.endTime} · {row.area}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                  <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '800' }}>
                    ON DUTY
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  iconBtn: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    marginTop: 4,
    width: 36,
  },
  day: { borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  badge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
});
