import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import { getTrainerProfile } from '@/lib/trainer-api';
import { getUnreadNotificationCount } from '@/lib/owner-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export function CoachProfileSettingsScreen() {
  const { token, user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [available, setAvailable] = useState(true);

  const profileQuery = useQuery({
    queryKey: ['trainer', 'profile'],
    queryFn: () => getTrainerProfile(token!),
    enabled: !!token,
  });

  const unreadQuery = useQuery({
    queryKey: ['coach', 'notifications', 'unread'],
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: !!token,
  });

  const profile = profileQuery.data;
  const name = `Coach ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const initials =
    `${user?.firstName?.[0] ?? 'C'}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'C';
  const specs = profile?.specializations?.length
    ? profile.specializations
    : ['TENNIS', 'FITNESS', 'AGILITY'];
  const rating = profile?.averageRating != null ? profile.averageRating.toFixed(1) : '4.9';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CoachColors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.md,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.topBar}>
        <Ionicons name="menu" size={22} color={CoachColors.brand} />
        <Text style={styles.brand}>FitOra</Text>
        <View style={styles.topRight}>
          <Ionicons name="search" size={18} color={CoachColors.muted} />
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      <QueryState
        isLoading={profileQuery.isLoading}
        isError={profileQuery.isError}
        error={profileQuery.error as Error}
        onRetry={() => profileQuery.refetch()}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#f5b301" />
            <Text style={styles.ratingText}>{rating} (Reviews)</Text>
          </View>
          <Text style={styles.bio}>
            {profile?.bio?.trim() || 'Elite coach helping athletes reach their full potential.'}
          </Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.editBtn}>
              <Text style={styles.editText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={styles.publicBtn}>
              <Text style={styles.publicText}>View Public Bio</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.specsCard}>
          <Ionicons name="fitness-outline" size={18} color={CoachColors.primary} />
          <View style={styles.specPills}>
            {specs.slice(0, 4).map((s) => (
              <View key={s} style={styles.specPill}>
                <Text style={styles.specPillText}>{s.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="medal-outline" size={18} color={CoachColors.primary} />
            <Text style={styles.infoLabel}>CERTS</Text>
            <Text style={styles.infoValue}>
              {profile?.isVerified ? 'Verified Pro' : 'Pending verification'}
              {profile?.yearsExperience != null ? ` · ${profile.yearsExperience}y` : ''}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={18} color={CoachColors.primary} />
            <Text style={styles.infoLabel}>VENUES</Text>
            <Text style={styles.infoValue}>Assigned academy courts</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={styles.statusIcon}>
              <Ionicons name="calendar" size={16} color={CoachColors.success} />
            </View>
            <View>
              <Text style={styles.statusTitle}>Active Status</Text>
              <Text style={styles.muted}>
                {available ? 'Available for bookings today' : 'Unavailable today'}
              </Text>
            </View>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ true: CoachColors.primary, false: CoachColors.border }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.menuCard}>
          <MenuRow
            icon="calendar-outline"
            label="Leave Requests"
            onPress={() => router.push('/coach/leave' as never)}
          />
          <MenuRow
            icon="notifications-outline"
            label="Notifications"
            badge={unreadQuery.data?.count}
            onPress={() => router.push('/coach/notifications' as never)}
          />
          <MenuRow
            icon="cash-outline"
            label="Earnings & Commission"
            onPress={() => router.push('/coach/earnings' as never)}
          />
          <MenuRow
            icon="document-text-outline"
            label="Training Notes"
            onPress={() => router.push('/coach/notes' as never)}
          />
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => undefined} />
        </View>

        <Pressable style={styles.signOut} onPress={() => void signOut()}>
          <Ionicons name="log-out-outline" size={18} color={CoachColors.primary} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </QueryState>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  value,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={CoachColors.brand} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={CoachColors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { color: CoachColors.primary, fontSize: FontSize.xl, fontWeight: '800' },
  topRight: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  smallAvatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.primaryContainer,
    borderRadius: Radius.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  smallAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  hero: { alignItems: 'center', marginTop: Spacing.xl },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarText: { color: CoachColors.primaryContainer, fontSize: 28, fontWeight: '800' },
  name: {
    color: CoachColors.foreground,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 4 },
  ratingText: { color: CoachColors.muted, fontSize: FontSize.sm },
  bio: {
    color: CoachColors.muted,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, width: '100%' },
  editBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flex: 1,
    paddingVertical: Spacing.md,
  },
  editText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  publicBtn: {
    backgroundColor: CoachColors.card,
    borderColor: CoachColors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    paddingVertical: Spacing.md,
  },
  publicText: { color: CoachColors.foreground, fontWeight: '800', textAlign: 'center' },
  specsCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  specPills: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  specPill: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  infoCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flex: 1,
    gap: 4,
    padding: Spacing.md,
  },
  infoLabel: { color: CoachColors.muted, fontSize: 10, fontWeight: '800' },
  infoValue: { color: CoachColors.foreground, fontSize: FontSize.xs, fontWeight: '700' },
  statusCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  statusLeft: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: CoachColors.softGreen,
    borderRadius: Radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  statusTitle: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  muted: { color: CoachColors.muted, fontSize: FontSize.xs },
  menuCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: CoachColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  menuLabel: { color: CoachColors.foreground, flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  menuValue: { color: CoachColors.primary, fontSize: FontSize.sm, fontWeight: '800' },
  badge: {
    backgroundColor: CoachColors.danger,
    borderRadius: Radius.full,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  signOut: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  signOutText: { color: CoachColors.primary, fontSize: FontSize.md, fontWeight: '800' },
});
