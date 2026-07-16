import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { createSlotType, deleteSlotType, listSlotTypes } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function SlotTypeConfiguratorScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [multiplier, setMultiplier] = useState('1.25');
  const [color, setColor] = useState('Indigo');
  const [showForm, setShowForm] = useState(false);

  const query = useQuery({
    queryKey: ['owner', 'slot-types'],
    queryFn: () => listSlotTypes(token!),
    enabled: !!token,
  });

  const types = query.data ?? [];
  const stats = useMemo(
    () => ({
      total: types.length,
      avg: types.length
        ? Math.round(types.reduce((s, t) => s + t.durationMin, 0) / types.length)
        : 0,
      peak: types.length ? Math.max(...types.map((t) => Number(t.multiplier))) : 0,
    }),
    [types],
  );

  useEffect(() => {
    // ensure seed runs on first open via API GET
  }, []);

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
        <Text style={[styles.brand, { color: colors.primary }]}>Slot Configuration</Text>
        <Pressable onPress={() => setShowForm((v) => !v)} hitSlop={8}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Slot Categories</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Configure session types, pricing multipliers, and calendar colors.
      </Text>

      <View style={styles.stats}>
        <Stat label="Total Types" value={String(stats.total).padStart(2, '0')} colors={colors} />
        <Stat label="Avg Duration" value={`${stats.avg}m`} colors={colors} />
        <Stat label="Peak Mult." value={`${stats.peak}x`} colors={colors} />
      </View>

      {showForm ? (
        <Card style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          <Text style={{ color: colors.foreground, fontWeight: '800' }}>Create New Type</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category Name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <View style={styles.row}>
            <TextInput
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="number-pad"
              placeholder="Duration"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { flex: 1, borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <TextInput
              value={multiplier}
              onChangeText={setMultiplier}
              keyboardType="decimal-pad"
              placeholder="Multiplier"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { flex: 1, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>
          <TextInput
            value={color}
            onChangeText={setColor}
            placeholder="Calendar Color"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              if (!token || !name.trim()) {
                Alert.alert('Name required');
                return;
              }
              try {
                await createSlotType(token, {
                  name: name.trim(),
                  description: description.trim() || 'Custom session type',
                  durationMin: Number(durationMin) || 60,
                  multiplier: Number(multiplier) || 1,
                  color: color.trim() || 'Indigo',
                });
                await queryClient.invalidateQueries({ queryKey: ['owner', 'slot-types'] });
                setShowForm(false);
                setName('');
                setDescription('');
              } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>Save Category</Text>
          </Pressable>
        </Card>
      ) : null}

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          {types.map((type) => (
            <Card key={type.id} style={{ padding: Spacing.lg, gap: Spacing.sm }}>
              <View style={styles.cardHeader}>
                <Text
                  style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}
                >
                  {type.name}
                </Text>
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete type?', type.name, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                          void deleteSlotType(token!, type.id).then(() =>
                            queryClient.invalidateQueries({ queryKey: ['owner', 'slot-types'] }),
                          ),
                      },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
              <Text style={{ color: colors.muted, lineHeight: 18 }}>{type.description}</Text>
              <View style={styles.metaRow}>
                <Meta label="Duration" value={`${type.durationMin} MIN`} colors={colors} />
                <Meta label="Multiplier" value={`${type.multiplier}X`} colors={colors} />
                <Meta label="Color" value={type.color} colors={colors} />
              </View>
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
      <Text style={{ color: colors.foreground, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

function Meta({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { muted: string; foreground: string };
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: '800', marginTop: 2 }}>{value}</Text>
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
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
