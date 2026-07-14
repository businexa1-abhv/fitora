import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function BookingConfirmedScreen() {
  const { bookingId, venue, court, date, time, amount } = useLocalSearchParams<{
    bookingId: string;
    venue: string;
    court: string;
    date: string;
    time: string;
    amount: string;
  }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const shortId = bookingId ? `#FIT-${bookingId.slice(0, 8).toUpperCase()}` : '#FIT-XXXXXXXX';

  async function handleShare() {
    await Share.share({
      message: `I just booked ${venue ?? 'a court'} on FitOra!\n${date ?? ''} · ${time ?? ''}\nBooking: ${shortId}`,
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xxxl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Success icon */}
      <View style={styles.successSection}>
        <View style={[styles.successCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="checkmark" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.primary }]}>Booking Confirmed!</Text>
        <Text style={[styles.successSub, { color: colors.muted }]}>
          Your court is reserved. See you on the court!
        </Text>
      </View>

      {/* Booking details card */}
      <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.bookingId, { color: colors.primary }]}>{shortId}</Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Venue</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{venue ?? 'Court'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="tennisball-outline" size={16} color={colors.muted} />
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Court</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{court ?? 'Court 1'}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Date</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{date ?? '—'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={colors.muted} />
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Time</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{time ?? '—'}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.amountRow}>
          <Text style={[styles.amountLabel, { color: colors.muted }]}>Amount Paid</Text>
          <View style={styles.amountRight}>
            <Text style={[styles.amountValue, { color: colors.foreground }]}>{amount ?? '—'}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
          </View>
        </View>
      </View>

      {/* QR Code section */}
      <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.qrLabel, { color: colors.muted }]}>Show this at the venue</Text>
        <View style={[styles.qrBox, { borderColor: colors.border }]}>
          {/* QR placeholder grid */}
          <View style={styles.qrGrid}>
            {Array.from({ length: 100 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.qrCell,
                  { backgroundColor: Math.random() > 0.4 ? colors.foreground : 'transparent' },
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={[styles.bookingIdSmall, { color: colors.muted }]}>{shortId}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={[styles.outlineBtn, { borderColor: colors.primary }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Add to Calendar</Text>
        </Pressable>
        <Pressable style={[styles.tonalBtn, { backgroundColor: colors.primaryLight }]} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color={colors.primary} />
          <Text style={[styles.tonalBtnText, { color: colors.primary }]}>Share Booking</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.replace('/bookings')} style={styles.linkBtn}>
        <Text style={[styles.linkBtnText, { color: colors.primary }]}>View All Bookings →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, alignItems: 'center' },

  successSection: { alignItems: 'center', marginBottom: Spacing.xxl },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: { fontSize: FontSize.hero, fontWeight: '800', textAlign: 'center' },
  successSub: { fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 280 },

  detailCard: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  bookingId: { fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.md, letterSpacing: 1 },
  divider: { height: 1, marginVertical: Spacing.md },
  detailRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  detailItem: { flex: 1, gap: 4 },
  detailLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: FontSize.md, fontWeight: '700' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  amountRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  amountValue: { fontSize: FontSize.lg, fontWeight: '800' },

  qrCard: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  qrLabel: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  qrBox: {
    width: 200,
    height: 200,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 168, height: 168 },
  qrCell: { width: 16.8, height: 16.8 },
  bookingIdSmall: { fontSize: FontSize.xs, letterSpacing: 1 },

  actions: { width: '100%', flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  tonalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.md,
  },
  tonalBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  linkBtn: { paddingVertical: Spacing.sm },
  linkBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});
