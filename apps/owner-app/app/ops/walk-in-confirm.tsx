import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function WalkInBookingConfirmationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    name?: string;
    phone?: string;
    court?: string;
    timing?: string;
    amount?: string;
    method?: string;
    registered?: string;
    checkInCode?: string;
    invoiceNumber?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const bookingId = params.bookingId ?? '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
      }}
    >
      <View style={[styles.check, { backgroundColor: '#d1fae5' }]}>
        <Ionicons name="checkmark" size={40} color={colors.secondary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Booking Confirmed!</Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>
        Booking saved. Check-in code ready for the player.
      </Text>

      <Card style={{ width: '100%', gap: Spacing.md, marginTop: Spacing.xl }}>
        <View style={styles.receiptHead}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
            BOOKING RECEIPT
          </Text>
          <View style={[styles.idPill, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
              #{bookingId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>
        {params.checkInCode ? (
          <Detail
            icon="key-outline"
            label="Check-in code"
            value={params.checkInCode}
            colors={colors}
          />
        ) : null}
        {params.invoiceNumber ? (
          <Detail
            icon="document-text-outline"
            label="Invoice"
            value={params.invoiceNumber}
            colors={colors}
          />
        ) : null}

        <Detail
          icon="person-outline"
          label="Player"
          value={params.name ?? 'Guest'}
          colors={colors}
          badge={params.registered === '1' ? 'Registered' : 'Guest'}
        />
        <Detail
          icon="tennisball-outline"
          label="Court"
          value={params.court ?? 'Court'}
          colors={colors}
        />
        <Detail
          icon="time-outline"
          label="Timing"
          value={params.timing ?? 'Today'}
          colors={colors}
        />

        <View style={[styles.payBox, { backgroundColor: colors.surfaceContainer }]}>
          <View>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Payment Status</Text>
            <Text style={{ color: colors.primary, fontSize: FontSize.xl, fontWeight: '800' }}>
              {formatCurrency(amount)}
            </Text>
          </View>
          <View style={[styles.method, { backgroundColor: colors.card }]}>
            <Ionicons name="cash-outline" size={14} color={colors.secondary} />
            <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 12 }}>
              {params.method ?? 'UPI'}
            </Text>
          </View>
        </View>
      </Card>

      <Pressable
        style={[styles.primary, { backgroundColor: colors.primary, width: '100%' }]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.primaryText}>Done</Text>
        <Ionicons name="checkmark" size={18} color="#fff" />
      </Pressable>
      <Pressable
        style={[styles.secondary, { borderColor: colors.border, width: '100%' }]}
        onPress={() => router.replace('/ops/walk-in-guest')}
      >
        <Text style={{ color: colors.primary, fontWeight: '800' }}>Book Another</Text>
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
      <Text style={{ color: colors.muted, marginTop: Spacing.lg }}>
        Need help with this booking?{' '}
        <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
          Contact Support
        </Text>
      </Text>
    </ScrollView>
  );
}

function Detail({
  icon,
  label,
  value,
  colors,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: { muted: string; foreground: string; surfaceContainer: string; secondary: string };
  badge?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainer }]}>
        <Ionicons name={icon} size={18} color={colors.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.foreground, fontWeight: '800' }}>{value}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
              <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '800' }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  check: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  receiptHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idPill: { borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  iconBox: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  payBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  method: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  primary: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
});
