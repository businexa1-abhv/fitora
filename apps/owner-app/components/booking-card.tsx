import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { BookingTypeBadge, StatusBadge } from './status-badge';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingCardData {
  id: string;
  status: string;
  bookingType?: string;
  totalAmount?: string | number;
  date?: string;
  court?: { id: string; name: string; sport?: string };
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  slot?: { startTime: string; endTime: string };
  seats?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSlot(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(amount?: string | number) {
  if (amount == null) return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function getInitials(user?: BookingCardData['user']) {
  if (!user) return '?';
  const first = (user.firstName?.[0] ?? '').toUpperCase();
  const last = (user.lastName?.[0] ?? '').toUpperCase();
  return first + last || user.email?.[0]?.toUpperCase() || '?';
}

function getSportIcon(sport?: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (!sport) return 'tennis-ball';
  const map: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    badminton: 'badminton',
    tennis: 'tennis',
    cricket: 'cricket',
    football: 'soccer',
    soccer: 'soccer',
    basketball: 'basketball',
    volleyball: 'volleyball',
    squash: 'tennis-ball',
    swimming: 'swim',
    gym: 'dumbbell',
    yoga: 'yoga',
  };
  return map[sport.toLowerCase()] ?? 'tennis-ball';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingCard({
  booking,
  onPress,
}: {
  booking: BookingCardData;
  onPress: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { id, status, bookingType, totalAmount, date, court, user, slot, seats } = booking;

  const playerName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'Guest'
    : 'Guest';
  const initials = getInitials(user);
  const sportIcon = getSportIcon(court?.sport);
  const slotLabel = slot ? formatSlot(slot.startTime, slot.endTime) : '--:-- – --:--';
  const dateLabel = date ? formatDate(date) : slot ? formatDate(slot.startTime) : '';

  let durationLabel = '';
  if (slot) {
    const mins = Math.round(
      (new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / 60000,
    );
    if (mins > 0) durationLabel = `${mins} min`;
  }

  return (
    <Pressable
      onPress={() => onPress(id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* ── Top row: player + status + amount ── */}
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.playerCol}>
            <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
              {playerName}
            </Text>
            {user?.phone ? (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={10} color={colors.muted} />
                <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
                  {user.phone}
                </Text>
              </View>
            ) : (
              <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
            )}
          </View>
          <View style={styles.rightCol}>
            <StatusBadge status={status} size="sm" />
            <Text style={[styles.amount, { color: colors.foreground }]}>
              {formatMoney(totalAmount)}
            </Text>
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Court + slot ── */}
        <View style={styles.courtRow}>
          <View style={[styles.sportIconWrap, { backgroundColor: colors.mutedBg }]}>
            <MaterialCommunityIcons name={sportIcon} size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courtName, { color: colors.foreground }]} numberOfLines={1}>
              {court?.name ?? 'Court'}
              {court?.sport ? (
                <Text style={{ color: colors.muted, fontWeight: '400' }}>
                  {' · '}
                  {court.sport}
                </Text>
              ) : null}
            </Text>
            <View style={styles.slotRow}>
              <Ionicons name="time-outline" size={12} color={colors.muted} />
              <Text style={[styles.slotTime, { color: colors.primary }]}>{slotLabel}</Text>
              {durationLabel ? (
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {' · '}
                  {durationLabel}
                </Text>
              ) : null}
              {seats && seats > 1 ? (
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {' · '}
                  {seats} seats
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Bottom: booking ID + type badge + date ── */}
        <View style={styles.bottomRow}>
          <Text style={[styles.bookingId, { color: colors.muted }]} numberOfLines={1}>
            #{id.slice(0, 8).toUpperCase()}
          </Text>
          <View style={styles.bottomRight}>
            {bookingType ? <BookingTypeBadge type={bookingType} /> : null}
            {dateLabel ? (
              <Text style={[styles.meta, { color: colors.muted }]}>{dateLabel}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  playerCol: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  meta: {
    fontSize: FontSize.xs,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amount: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  // Divider
  divider: {
    height: 1,
  },
  // Court row
  courtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sportIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  courtName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  slotTime: {
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingId: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
