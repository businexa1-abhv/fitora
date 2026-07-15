import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const QR_CELLS = Array.from(
  { length: 100 },
  (_, index) => (index * 7 + Math.floor(index / 3)) % 5 < 2,
);

function formatDate(value?: string) {
  if (!value) return 'Today';
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value?: string) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function BookingSuccessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    courtName?: string;
    city?: string;
    startTime?: string;
    endTime?: string;
    amount?: string;
  }>();

  const bookingId = params.bookingId
    ? `#${params.bookingId.slice(0, 8).toUpperCase()}`
    : '#FO987654';
  const amount = Number(params.amount ?? 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xxxl, paddingBottom: insets.bottom + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successBlock}>
          <View style={[styles.pulse, { backgroundColor: `${colors.accent}18` }]} />
          <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={56} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Booking Confirmed!</Text>
          <Text style={[styles.bookingId, { color: colors.muted }]}>
            Booking ID: <Text style={{ color: colors.accent }}>{bookingId}</Text>
          </Text>
        </View>

        <View style={styles.receiptGrid}>
          <View
            style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.kicker, { color: colors.muted }]}>Check-in Pass</Text>
            <Text style={[styles.courtName, { color: colors.foreground }]}>
              {params.courtName ?? 'Premium Court'}
            </Text>
            <View style={[styles.qrShell, { backgroundColor: colors.mutedBg }]}>
              <View style={styles.qrGrid}>
                {QR_CELLS.map((filled, index) => (
                  <View
                    key={index}
                    style={[styles.qrCell, { backgroundColor: filled ? '#171A26' : 'transparent' }]}
                  />
                ))}
              </View>
            </View>
            <View style={[styles.passMeta, { borderTopColor: colors.border }]}>
              <DetailColumn label="Date" value={formatDate(params.startTime)} />
              <DetailColumn
                label="Time"
                value={`${formatTime(params.startTime)} - ${formatTime(params.endTime)}`}
              />
              <DetailColumn
                label="Paid"
                value={formatCurrency(Number.isFinite(amount) ? amount : 0)}
              />
            </View>
          </View>

          <View style={styles.actionStack}>
            <ActionCard
              icon="location"
              title="Get Directions"
              subtitle={params.city || 'Open maps to the venue'}
              tint={colors.accent}
            />
            <ActionCard
              icon="calendar-outline"
              title="Add to Calendar"
              subtitle="Sync this slot with your calendar"
              tint={colors.primary}
            />
            <ActionCard
              icon="download-outline"
              title="Download Invoice"
              subtitle="Receipt will be available in bookings"
              tint={colors.muted}
            />
            <View style={styles.nextCard}>
              <Text style={styles.nextTitle}>Next Step</Text>
              <Text style={styles.nextText}>
                Show this check-in pass at the venue reception before your slot starts.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttons}>
          <Button label="View My Bookings" fullWidth onPress={() => router.replace('/bookings')} />
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.homeLink, pressed && styles.pressed]}
          >
            <Text style={[styles.homeLinkText, { color: colors.primary }]}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailColumn({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.detailColumn}>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tint: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.mutedBg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.actionSubtitle, { color: colors.muted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  successBlock: { alignItems: 'center', marginBottom: Spacing.xxxl },
  pulse: { borderRadius: Radius.full, height: 118, position: 'absolute', top: -10, width: 118 },
  checkCircle: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 96,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 96,
  },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  bookingId: { fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.sm },
  receiptGrid: { gap: Spacing.lg },
  qrCard: { alignItems: 'center', borderRadius: 24, borderWidth: 1, padding: Spacing.xl },
  kicker: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  courtName: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  qrShell: { borderRadius: Radius.lg, marginVertical: Spacing.xl, padding: Spacing.lg },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, height: 190, width: 190 },
  qrCell: { borderRadius: 2, height: 16.3, width: 16.3 },
  passMeta: { borderTopWidth: 1, flexDirection: 'row', paddingTop: Spacing.lg, width: '100%' },
  detailColumn: { alignItems: 'center', flex: 1, gap: 3 },
  detailLabel: { fontSize: FontSize.xs, fontWeight: '800' },
  detailValue: { fontSize: FontSize.sm, fontWeight: '900', textAlign: 'center' },
  actionStack: { gap: Spacing.md },
  actionCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: FontSize.md, fontWeight: '900' },
  actionSubtitle: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  nextCard: { backgroundColor: '#ff6b00', borderRadius: Radius.xl, padding: Spacing.xl },
  nextTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '900' },
  nextText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  buttons: { gap: Spacing.md, marginTop: Spacing.xxxl },
  homeLink: { alignItems: 'center', paddingVertical: Spacing.md },
  homeLinkText: { fontSize: FontSize.md, fontWeight: '900' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
