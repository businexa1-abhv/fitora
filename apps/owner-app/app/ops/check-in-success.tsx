import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CheckInSuccessDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    name?: string;
    court?: string;
    time?: string;
  }>();

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
        <Ionicons name="checkmark-circle" size={48} color={colors.secondary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Checked In</Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>
        Player access granted for this session.
      </Text>

      <Card style={{ width: '100%', gap: Spacing.md, marginTop: Spacing.xl }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
          CHECK-IN DETAIL
        </Text>
        <Row label="Player" value={params.name ?? 'Player'} colors={colors} />
        <Row label="Court" value={params.court ?? 'Court'} colors={colors} />
        <Row label="Slot" value={params.time ?? '—'} colors={colors} />
        <Row
          label="Booking"
          value={`#${(params.bookingId ?? '—').slice(0, 10).toUpperCase()}`}
          colors={colors}
        />
      </Card>

      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary, width: '100%' }]}
        onPress={() => router.replace('/ops/check-in-scanner')}
      >
        <Text style={styles.btnText}>Next check-in</Text>
        <Ionicons name="qr-code-outline" size={18} color="#fff" />
      </Pressable>
      <Pressable
        style={[styles.outline, { borderColor: colors.border, width: '100%' }]}
        onPress={() => router.replace('/ops/check-in')}
      >
        <Text style={{ color: colors.primary, fontWeight: '800' }}>View history</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { muted: string; foreground: string };
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: colors.foreground, flex: 1, fontWeight: '800', textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  check: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  btnText: { color: '#fff', fontWeight: '800' },
  outline: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
});
