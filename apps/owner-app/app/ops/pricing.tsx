import { useEffect, useState } from 'react';
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
  createPricingRule,
  deletePricingRule,
  listPricingRules,
  updateCourt,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function TennisSetupPricingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { courtId, court, token, courtsQuery } = useDefaultCourt();

  const [hourly, setHourly] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [peakName, setPeakName] = useState('Evening Peak');
  const [peakMult, setPeakMult] = useState('1.5');
  const [peakStart, setPeakStart] = useState('17');
  const [peakEnd, setPeakEnd] = useState('22');

  useEffect(() => {
    if (court?.defaultSlotPrice) setHourly(String(Number(court.defaultSlotPrice)));
    const maxMatch = court?.rules?.match(/Max\s+(\d+)\s+players/i);
    if (maxMatch) setMaxPlayers(maxMatch[1]);
  }, [court]);

  const rulesQuery = useQuery({
    queryKey: ['owner', 'pricing', courtId],
    queryFn: () => listPricingRules(token!, courtId!),
    enabled: !!token && !!courtId,
  });

  const saveCourtMutation = useMutation({
    mutationFn: () => {
      if (!courtId) throw new Error('No court selected');
      return updateCourt(token!, courtId, {
        defaultSlotPrice: hourly ? Number(hourly) : undefined,
        rules: maxPlayers ? `Max ${maxPlayers} players per court.` : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'courts'] });
      Alert.alert('Saved', 'Court pricing updated.');
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  const addPeakMutation = useMutation({
    mutationFn: () => {
      if (!courtId) throw new Error('No court selected');
      return createPricingRule(token!, courtId, {
        type: 'PEAK',
        name: peakName.trim() || 'Peak',
        multiplier: Number(peakMult) || 1.5,
        startHour: Number(peakStart) || 17,
        endHour: Number(peakEnd) || 22,
        daysOfWeek: [1, 2, 3, 4, 5],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'pricing', courtId] });
    },
    onError: (e: Error) => Alert.alert('Could not add rule', e.message),
  });

  const rules = rulesQuery.data ?? [];

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
        <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {court?.sport?.name ?? 'Court'} Setup
      </Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Configure facility capacity and pricing for {court?.name ?? 'your court'}.
      </Text>

      {!courtId && !courtsQuery.isLoading ? (
        <Card style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: colors.muted }}>Add a court first to configure pricing.</Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
            <Text style={[styles.section, { color: colors.muted }]}>Court Capacity</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>Total Courts</Text>
                <Text
                  style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.xl }}
                >
                  {courtsQuery.data?.items?.length ?? 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>Max Players/Court</Text>
                <TextInput
                  value={maxPlayers}
                  onChangeText={setMaxPlayers}
                  keyboardType="number-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
            </View>

            <Text style={[styles.section, { color: colors.muted }]}>Pricing</Text>
            <Text style={[styles.label, { color: colors.muted }]}>Hourly Price (₹)</Text>
            <TextInput
              value={hourly}
              onChangeText={setHourly}
              keyboardType="decimal-pad"
              placeholder="500"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              disabled={saveCourtMutation.isPending}
              onPress={() => saveCourtMutation.mutate()}
            >
              {saveCourtMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Save Game Configuration</Text>
                </>
              )}
            </Pressable>
          </Card>

          <Text style={[styles.titleSm, { color: colors.foreground }]}>Peak Pricing Rules</Text>
          <Card style={{ gap: Spacing.sm }}>
            <TextInput
              value={peakName}
              onChangeText={setPeakName}
              placeholder="Rule name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <View style={styles.row}>
              <TextInput
                value={peakMult}
                onChangeText={setPeakMult}
                keyboardType="decimal-pad"
                placeholder="Multiplier"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  { flex: 1, borderColor: colors.border, color: colors.foreground },
                ]}
              />
              <TextInput
                value={peakStart}
                onChangeText={setPeakStart}
                keyboardType="number-pad"
                placeholder="Start hr"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  { flex: 1, borderColor: colors.border, color: colors.foreground },
                ]}
              />
              <TextInput
                value={peakEnd}
                onChangeText={setPeakEnd}
                keyboardType="number-pad"
                placeholder="End hr"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  { flex: 1, borderColor: colors.border, color: colors.foreground },
                ]}
              />
            </View>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
              disabled={addPeakMutation.isPending}
              onPress={() => addPeakMutation.mutate()}
            >
              <Text style={styles.primaryText}>Add Peak Rule</Text>
            </Pressable>
          </Card>

          <QueryState
            isLoading={rulesQuery.isLoading}
            isError={rulesQuery.isError}
            error={rulesQuery.error as Error}
            onRetry={() => rulesQuery.refetch()}
            empty={rules.length === 0}
          >
            <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
              {rules.map((rule) => (
                <Card key={rule.id} style={styles.ruleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>{rule.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {rule.type}
                      {rule.multiplier ? ` · ${rule.multiplier}x` : ''}
                      {rule.fixedPrice ? ` · ${formatCurrency(Number(rule.fixedPrice))}` : ''}
                      {rule.startHour != null ? ` · ${rule.startHour}:00–${rule.endHour}:00` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      courtId &&
                      Alert.alert('Delete rule?', rule.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await deletePricingRule(token!, courtId, rule.id);
                            await queryClient.invalidateQueries({
                              queryKey: ['owner', 'pricing', courtId],
                            });
                          },
                        },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </Card>
              ))}
            </View>
          </QueryState>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  titleSm: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', gap: Spacing.md },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  ruleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
});
