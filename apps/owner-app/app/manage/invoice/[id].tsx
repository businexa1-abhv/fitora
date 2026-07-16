import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function InvoiceDetailViewScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    court?: string;
    amount?: string;
    status?: string;
    time?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const tax = Math.round(amount * 0.18);
  const subtotal = Math.max(0, amount - tax);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Invoice Detail" />
      <Card style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>INVOICE</Text>
        <Text style={{ color: colors.foreground, fontSize: FontSize.xl, fontWeight: '800' }}>
          #{(params.id ?? '—').slice(0, 10).toUpperCase()}
        </Text>
        <Text style={{ color: colors.muted }}>
          Status: <Text style={{ color: colors.primary, fontWeight: '800' }}>{params.status}</Text>
        </Text>
      </Card>

      <Card style={{ gap: Spacing.md, marginTop: Spacing.md }}>
        <Row label="Player" value={params.name ?? '—'} colors={colors} />
        <Row label="Court / Service" value={params.court ?? '—'} colors={colors} />
        <Row
          label="Session"
          value={params.time ? new Date(params.time).toLocaleString('en-IN') : '—'}
          colors={colors}
        />
      </Card>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        <Row label="Subtotal" value={formatCurrency(subtotal)} colors={colors} />
        <Row label="Tax (est. 18%)" value={formatCurrency(tax)} colors={colors} />
        <View style={[styles.total, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}>
            Total
          </Text>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: FontSize.lg }}>
            {formatCurrency(amount)}
          </Text>
        </View>
      </Card>

      <Pressable
        style={[styles.shareBtn, { backgroundColor: colors.primary }]}
        onPress={() =>
          router.push({
            pathname: '/manage/invoice-share',
            params: {
              id: params.id,
              name: params.name,
              court: params.court,
              amount: params.amount,
              status: params.status,
            },
          })
        }
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Share / Remind</Text>
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
      <Text style={{ color: colors.foreground, flex: 1, fontWeight: '700', textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  total: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  shareBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});
