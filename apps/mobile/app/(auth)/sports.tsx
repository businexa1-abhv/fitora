import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { QueryState } from '@/components/query-state';
import { getSports, updateFavoriteSports } from '@/lib/players-api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const sportsIcons = require('../../assets/stitch-auth/sports-icons.png');

export default function SportsScreen() {
  const router = useRouter();
  const { token, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sportsQuery = useQuery({
    queryKey: ['sports'],
    queryFn: getSports,
  });

  const sports = useMemo(() => sportsQuery.data ?? [], [sportsQuery.data]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  }

  async function onSave() {
    if (selected.length < 1) {
      setError('Select at least one sport');
      return;
    }
    if (!token) {
      setError('Session expired');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateFavoriteSports(token, selected);
      await refreshUser();
      router.replace('/(auth)/notifications');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save sports');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
    >
      <AuthHero
        title="Choose your sports"
        subtitle="Pick the games you play most, and FitOra will personalize venues, events, and training for you."
        artworkSource={sportsIcons}
        artworkLabel="Set of sports icons"
        stepCurrent={2}
        stepTotal={3}
      >
        <QueryState
          isLoading={sportsQuery.isLoading}
          isError={sportsQuery.isError}
          error={sportsQuery.error instanceof Error ? sportsQuery.error : null}
          onRetry={() => sportsQuery.refetch()}
        >
          <View style={styles.grid}>
            {sports.map((sport) => {
              const active = selected.includes(sport.id);
              return (
                <Pressable
                  key={sport.id}
                  onPress={() => toggle(sport.id)}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    {sport.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </QueryState>

        <Text style={[styles.hint, { color: colors.muted }]}>{selected.length}/10 selected</Text>

        {error ? (
          <Text style={{ color: colors.danger, fontWeight: '600', marginBottom: Spacing.md }}>
            {error}
          </Text>
        ) : null}

        <AuthButton label="Save & continue" fullWidth loading={loading} onPress={onSave} />
      </AuthHero>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tile: {
    width: '48%',
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  hint: { fontSize: FontSize.sm, marginBottom: Spacing.lg, fontWeight: '600' },
});
