import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getTenantMe, listTenantTrainers } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CoachProfileDetailScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const tenantQuery = useQuery({
    queryKey: ['owner', 'tenant'],
    queryFn: () => getTenantMe(token!),
    enabled: !!token,
  });

  const trainersQuery = useQuery({
    queryKey: ['owner', 'trainers', tenantQuery.data?.id],
    queryFn: () => listTenantTrainers(token!, tenantQuery.data!.id),
    enabled: !!token && !!tenantQuery.data?.id,
  });

  const coach = (trainersQuery.data ?? []).find((t) => t.id === id);
  const name = coach
    ? `${coach.firstName ?? ''} ${coach.lastName ?? ''}`.trim() || coach.email
    : 'Coach';
  const profile = coach?.trainerProfile;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Coach Profile" />
      <QueryState
        isLoading={trainersQuery.isLoading || tenantQuery.isLoading}
        isError={trainersQuery.isError}
        error={trainersQuery.error as Error}
        onRetry={() => trainersQuery.refetch()}
      >
        <Card style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
          <Text style={{ color: colors.muted }}>
            {profile?.specializations?.[0] ?? 'Academy Coach'}
          </Text>
          {profile?.isVerified ? (
            <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="shield-checkmark" size={12} color={colors.secondary} />
              <Text style={{ color: colors.secondary, fontWeight: '800', fontSize: 11 }}>
                VERIFIED
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.stats}>
          <Stat
            label="Experience"
            value={`${profile?.yearsExperience ?? '—'} yrs`}
            colors={colors}
          />
          <Stat
            label="Rating"
            value={profile?.averageRating ? Number(profile.averageRating).toFixed(1) : '—'}
            colors={colors}
          />
          <Stat
            label="Specs"
            value={String(profile?.specializations?.length ?? 0)}
            colors={colors}
          />
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>About</Text>
        <Card>
          <Text style={{ color: colors.foreground, lineHeight: 20 }}>
            {profile?.bio || 'No biography provided yet.'}
          </Text>
        </Card>

        <Text style={[styles.section, { color: colors.foreground }]}>Specializations</Text>
        <View style={styles.chips}>
          {(profile?.specializations?.length ? profile.specializations : ['General coaching']).map(
            (s) => (
              <View key={s} style={[styles.chip, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{s}</Text>
              </View>
            ),
          )}
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Contact</Text>
        <Card style={{ gap: Spacing.sm }}>
          <Text style={{ color: colors.muted }}>Email</Text>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>{coach?.email ?? '—'}</Text>
        </Card>
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
  colors: { card: string; border: string; muted: string; foreground: string };
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, padding: Spacing.xl },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: FontSize.xxl, fontWeight: '800' },
  badge: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  stat: { borderRadius: Radius.lg, borderWidth: 1, flex: 1, gap: 2, padding: Spacing.md },
  section: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
});
