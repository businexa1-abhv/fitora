import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getBookingQr } from '@/lib/courts';
import { FontSize, Radius, Spacing } from '@/constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string) {
  if (!value) return 'Today';
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailColumn({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={dcStyles.col}>
      <Text style={[dcStyles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[dcStyles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const dcStyles = StyleSheet.create({
  col: { alignItems: 'center', flex: 1 },
  label: { fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2 },
  value: { fontSize: FontSize.sm, fontWeight: '900', textAlign: 'center' },
});

function ActionCard({
  icon,
  title,
  subtitle,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tint: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        acStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      <View style={[acStyles.iconWrap, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[acStyles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[acStyles.subtitle, { color: colors.muted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const acStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: { fontSize: FontSize.sm, fontWeight: '800' },
  subtitle: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingSuccessScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    courtName?: string;
    city?: string;
    startTime?: string;
    endTime?: string;
    amount?: string;
    checkInCode?: string;
  }>();

  // ── Entrance animations ───────────────────────────────────────────────────────
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Pulse ring grows
    Animated.spring(pulseScale, { toValue: 1, useNativeDriver: true, bounciness: 8 }).start();

    // 2. Check circle pops in
    Animated.sequence([
      Animated.delay(150),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
    ]).start();

    // 3. Content fades up
    Animated.sequence([
      Animated.delay(350),
      Animated.timing(contentFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // 4. Ongoing subtle pulse on the ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [checkScale, contentFade, pulseScale]);

  // ── QR code ────────────────────────────────────────────────────────────────────
  const qrQuery = useQuery({
    queryKey: ['booking-qr', params.bookingId],
    queryFn: () => getBookingQr(token!, params.bookingId!),
    enabled: !!token && !!params.bookingId,
    retry: 1,
  });

  const checkInCode = params.checkInCode ?? qrQuery.data?.checkInCode;
  const qrDataUrl = qrQuery.data?.qrCodeDataUrl;
  const bookingIdStr = params.bookingId
    ? `#${params.bookingId.slice(0, 8).toUpperCase()}`
    : '#FO987654';
  const amount = Number(params.amount ?? 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Animated success indicator ── */}
        <View style={styles.successBlock}>
          <Animated.View
            style={[
              styles.pulse,
              { backgroundColor: `${colors.accent}18`, transform: [{ scale: pulseScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.checkCircle,
              { backgroundColor: colors.accent, transform: [{ scale: checkScale }] },
            ]}
          >
            <Ionicons name="checkmark" size={52} color="#fff" />
          </Animated.View>
          <Text style={[styles.title, { color: colors.foreground }]}>Booking Confirmed! 🎉</Text>
          <Text style={[styles.bookingIdText, { color: colors.muted }]}>
            Booking ID:{' '}
            <Text style={{ color: colors.accent, fontWeight: '900' }}>{bookingIdStr}</Text>
          </Text>
        </View>

        {/* ── Animated content ── */}
        <Animated.View style={{ opacity: contentFade }}>
          {/* ── Check-in pass card ── */}
          <View
            style={[styles.passCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.passKicker, { color: colors.muted }]}>CHECK-IN PASS</Text>
            <Text style={[styles.passCourtName, { color: colors.foreground }]}>
              {params.courtName ?? 'Premium Court'}
            </Text>

            {/* QR code — real base64 if available, placeholder grid otherwise */}
            {qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <View style={[styles.qrShell, { backgroundColor: colors.mutedBg }]}>
                <View style={styles.qrGrid}>
                  {Array.from({ length: 100 }, (_, i) => (i * 7 + Math.floor(i / 3)) % 5 < 2).map(
                    (filled, i) => (
                      <View
                        key={i}
                        style={[
                          styles.qrCell,
                          { backgroundColor: filled ? '#171A26' : 'transparent' },
                        ]}
                      />
                    ),
                  )}
                </View>
              </View>
            )}

            {/* Check-in code */}
            {checkInCode && (
              <View style={[styles.codeRow, { backgroundColor: `${colors.accent}12` }]}>
                <Text style={[styles.codeLabel, { color: colors.muted }]}>Check-in code</Text>
                <Text style={[styles.codeValue, { color: colors.accent }]}>{checkInCode}</Text>
              </View>
            )}

            {/* Pass metadata */}
            <View style={[styles.passMeta, { borderTopColor: colors.border }]}>
              <DetailColumn label="Date" value={formatDate(params.startTime)} />
              <DetailColumn
                label="Time"
                value={`${formatTime(params.startTime)} – ${formatTime(params.endTime)}`}
              />
              <DetailColumn
                label="Paid"
                value={formatCurrency(Number.isFinite(amount) ? amount : 0)}
              />
            </View>
          </View>

          {/* ── Action cards ── */}
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
              subtitle="Receipt available in My Bookings"
              tint={colors.muted}
            />
            <ActionCard
              icon="share-outline"
              title="Share Booking"
              subtitle="Share details with co-players"
              tint="#7c3aed"
            />

            {/* Create community match CTA */}
            <View
              style={[
                styles.matchCard,
                { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}40` },
              ]}
            >
              <View style={styles.matchTop}>
                <Text style={styles.matchEmoji}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchTitle, { color: colors.foreground }]}>
                    Create a Community Match?
                  </Text>
                  <Text style={[styles.matchSub, { color: colors.muted }]}>
                    Invite players from your groups to fill this court.
                  </Text>
                </View>
              </View>
              <View style={styles.matchBtns}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/community/match/create',
                      params: {
                        bookingId: params.bookingId,
                        courtName: params.courtName,
                        startTime: params.startTime,
                        endTime: params.endTime,
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.matchYes,
                    { backgroundColor: colors.accent, opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  <Text style={styles.matchYesText}>Create Match</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.replace('/(tabs)/bookings')}
                  style={({ pressed }) => [styles.matchNo, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.matchNoText, { color: colors.muted }]}>Not now</Text>
                </Pressable>
              </View>
            </View>

            {/* Next step */}
            <View
              style={[
                styles.nextCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
              <Text style={[styles.nextText, { color: colors.muted }]}>
                Show this check-in pass at the venue reception before your slot starts.
              </Text>
            </View>
          </View>

          {/* ── Footer buttons ── */}
          <View style={styles.buttons}>
            <Button
              label="View My Bookings"
              fullWidth
              onPress={() => router.replace('/(tabs)/bookings')}
            />
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => [styles.homeLink, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.homeLinkText, { color: colors.primary }]}>Back to Home</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },

  // Success block
  successBlock: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    paddingTop: Spacing.xl,
    position: 'relative',
  },
  pulse: {
    borderRadius: Radius.full,
    height: 160,
    position: 'absolute',
    top: Spacing.xl - 20,
    width: 160,
  },
  checkCircle: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 100,
    justifyContent: 'center',
    width: 100,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    textAlign: 'center',
  },
  bookingIdText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // Check-in pass card
  passCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  passKicker: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  passCourtName: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    textAlign: 'center',
  },
  qrImage: {
    height: 192,
    width: 192,
    borderRadius: Radius.md,
  },
  qrShell: {
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 160,
    width: 160,
  },
  qrCell: {
    height: 16,
    width: 16,
  },
  codeRow: {
    alignItems: 'center',
    borderRadius: Radius.full,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  codeLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  codeValue: {
    fontFamily: 'Courier',
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: 4,
  },
  passMeta: {
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: Spacing.md,
    width: '100%',
  },

  // Action stack
  actionStack: { gap: Spacing.sm, marginBottom: Spacing.xl },

  // Match card
  matchCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  matchTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  matchEmoji: { fontSize: 28 },
  matchTitle: { fontSize: FontSize.md, fontWeight: '900' },
  matchSub: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  matchBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  matchYes: {
    borderRadius: Radius.full,
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  matchYesText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  matchNo: {
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  matchNoText: { fontSize: FontSize.sm, fontWeight: '700' },

  // Next step card
  nextCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  nextText: { flex: 1, fontSize: FontSize.xs, fontWeight: '600' },

  // Buttons
  buttons: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  homeLink: {
    paddingVertical: Spacing.sm,
  },
  homeLinkText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
