import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function InvoiceSharePaymentReminderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    court?: string;
    amount?: string;
    status?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const id = (params.id ?? 'invoice').slice(0, 10).toUpperCase();
  const summary = `FitOra Invoice #${id}\n${params.name ?? 'Player'} · ${params.court ?? 'Court'}\nAmount due: ${formatCurrency(amount)}\nStatus: ${params.status ?? 'PENDING'}`;

  const share = async () => {
    try {
      await Share.share({ message: summary, title: `Invoice #${id}` });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Invoice Actions" />
      <Text style={[styles.title, { color: colors.foreground }]}>Share & Remind</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Send payment reminders or mark this invoice as paid.
      </Text>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>INVOICE #{id}</Text>
        <Text style={{ color: colors.foreground, fontSize: FontSize.xl, fontWeight: '800' }}>
          {formatCurrency(amount)}
        </Text>
        <Text style={{ color: colors.muted }}>
          {params.name ?? 'Player'} · {params.court ?? 'Court'}
        </Text>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>
          {params.status ?? 'PENDING'}
        </Text>
      </Card>

      <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Action
          icon="share-outline"
          label="Share invoice"
          subtitle="PDF / text via system share"
          colors={colors}
          onPress={() => void share()}
        />
        <Action
          icon="logo-whatsapp"
          label="WhatsApp reminder"
          subtitle="Open share sheet with invoice text"
          colors={colors}
          onPress={() => void share()}
        />
        <Action
          icon="mail-outline"
          label="Email reminder"
          subtitle="Copy prepared message"
          colors={colors}
          onPress={() => Alert.alert('Email reminder', summary, [{ text: 'OK' }])}
        />
        <Action
          icon="chatbubble-outline"
          label="SMS reminder"
          subtitle="Notify player of outstanding amount"
          colors={colors}
          onPress={() => Alert.alert('SMS', 'Reminder queued for player (demo).')}
        />
        <Action
          icon="checkmark-circle-outline"
          label="Mark as paid"
          subtitle="Update local status for this view"
          colors={colors}
          onPress={() =>
            Alert.alert('Marked paid', 'Invoice marked paid in this session.', [
              { text: 'OK', onPress: () => router.back() },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}

function Action({
  icon,
  label,
  subtitle,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  colors: {
    card: string;
    border: string;
    foreground: string;
    muted: string;
    primary: string;
    surfaceContainer: string;
  };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.surfaceContainer }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  row: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
