import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { useDefaultCourt } from '@/lib/use-default-court';
import {
  createMembershipPlan,
  deleteMembershipPlan,
  getMembershipDashboard,
  listMyMembershipPlans,
  type MembershipDuration,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const DURATIONS: { key: MembershipDuration; label: string }[] = [
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'QUARTERLY', label: 'Quarterly' },
  { key: 'HALF_YEARLY', label: 'Half-Yearly' },
  { key: 'ANNUAL', label: 'Yearly' },
];

export default function MembershipPlansSetupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { courtId, court, token } = useDefaultCourt();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState<MembershipDuration>('MONTHLY');
  const [showForm, setShowForm] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['owner', 'memberships', 'plans'],
    queryFn: () => listMyMembershipPlans(token!),
    enabled: !!token,
  });

  const dashQuery = useQuery({
    queryKey: ['owner', 'memberships', 'dashboard', courtId],
    queryFn: () => getMembershipDashboard(token!, courtId),
    enabled: !!token && !!courtId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!courtId) throw new Error('Add a court first');
      if (!name.trim()) throw new Error('Plan name is required');
      if (!price || !Number.isFinite(Number(price))) throw new Error('Enter a valid price');
      return createMembershipPlan(token!, courtId, {
        name: name.trim(),
        duration,
        price: Number(price),
        benefits: { perks: ['Court access', 'Locker room'] },
      });
    },
    onSuccess: async () => {
      setName('');
      setPrice('');
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['owner', 'memberships'] });
    },
    onError: (e: Error) => Alert.alert('Could not create plan', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => deleteMembershipPlan(token!, planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'memberships'] });
    },
  });

  const plans = plansQuery.data ?? [];
  const stats = dashQuery.data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.brand, { color: colors.primary }]}>Setup & Configuration</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {court?.sport?.name ?? 'Academy'} Membership
      </Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Configure subscription tiers and pricing for members.
      </Text>

      <View style={styles.stats}>
        <Stat label="Plans" value={String(stats?.totalPlans ?? plans.length)} colors={colors} />
        <Stat label="Members" value={String(stats?.activeSubscribers ?? 0)} colors={colors} />
        <Stat label="Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)} colors={colors} />
      </View>

      <Pressable
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={() => setShowForm((v) => !v)}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.addText}>{showForm ? 'Hide Form' : 'Create Plan'}</Text>
      </Pressable>

      {showForm ? (
        <Card style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Plan name (e.g., Standard Monthly)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.key}
                  onPress={() => setDuration(d.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: duration === d.key ? colors.primary : colors.mutedBg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: duration === d.key ? '#fff' : colors.foreground,
                      fontWeight: '700',
                    }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="Price (₹)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '800' }}>Save Tier</Text>
            )}
          </Pressable>
        </Card>
      ) : null}

      <QueryState
        isLoading={plansQuery.isLoading}
        isError={plansQuery.isError}
        error={plansQuery.error as Error}
        onRetry={() => plansQuery.refetch()}
        empty={plans.length === 0}
      >
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          {plans.map((plan) => (
            <Card key={plan.id} style={{ padding: Spacing.lg, gap: Spacing.sm }}>
              <View style={styles.planHeader}>
                <Text
                  style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}
                >
                  {plan.name}
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>
                  {formatCurrency(Number(plan.price))}
                </Text>
              </View>
              <Text style={{ color: colors.muted }}>{plan.duration.replace('_', ' ')}</Text>
              {(plan.benefits?.perks ?? []).slice(0, 3).map((perk) => (
                <View key={perk} style={styles.perkRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.secondary} />
                  <Text style={{ color: colors.foreground, fontSize: FontSize.sm }}>{perk}</Text>
                </View>
              ))}
              <Pressable
                onPress={() =>
                  Alert.alert('Delete plan?', plan.name, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate(plan.id),
                    },
                  ])
                }
              >
                <Text style={{ color: colors.danger, fontWeight: '700', marginTop: Spacing.sm }}>
                  Remove tier
                </Text>
              </Pressable>
            </Card>
          ))}
        </View>
      </QueryState>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { muted: string; foreground: string; card: string; border: string };
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.md }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.sm, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  stat: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: Spacing.md,
  },
  addBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  addText: { color: '#fff', fontWeight: '800' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  saveBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  perkRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
});
