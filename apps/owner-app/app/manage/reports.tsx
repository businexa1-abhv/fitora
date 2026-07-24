import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { exportOwnerReport } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface ReportConfig {
  metric: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  period: string;
}

const REPORTS: ReportConfig[] = [
  {
    metric: 'bookings',
    title: 'Booking Report',
    description: 'All bookings with status, player info, and amounts (last 30 days)',
    icon: 'calendar-outline',
    period: 'monthly',
  },
  {
    metric: 'revenue',
    title: 'Revenue Report',
    description: 'Revenue breakdown by source and court (last 30 days)',
    icon: 'cash-outline',
    period: 'monthly',
  },
  {
    metric: 'memberships',
    title: 'Membership Report',
    description: 'Active memberships, plan details, and subscriber list (last 30 days)',
    icon: 'card-outline',
    period: 'monthly',
  },
  {
    metric: 'training',
    title: 'Training Report',
    description: 'Batch attendance, enrollments, and progress (last 30 days)',
    icon: 'fitness-outline',
    period: 'monthly',
  },
  {
    metric: 'utilization',
    title: 'Slot Utilization',
    description: 'Court occupancy and slot fill rates (last 7 days)',
    icon: 'speedometer-outline',
    period: 'weekly',
  },
  {
    metric: 'payouts',
    title: 'Payout Summary',
    description: 'Coach commissions and staff payroll breakdown (this month)',
    icon: 'wallet-outline',
    period: 'monthly',
  },
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleExport(report: ReportConfig) {
    if (!token) return;
    setLoading(report.metric);
    try {
      const csv = await exportOwnerReport(token, report.metric, report.period);
      await Share.share({
        message: csv,
        title: `${report.title}.csv`,
      });
    } catch (err) {
      Alert.alert(
        'Export Failed',
        err instanceof Error ? err.message : 'Could not export the report. Please try again.',
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Reports" />
      <Text style={[styles.title, { color: colors.foreground }]}>Reports & Exports</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Download CSV reports for bookings, revenue, memberships, and more.
      </Text>

      <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
        {REPORTS.map((report) => {
          const busy = loading === report.metric;
          return (
            <Card key={report.metric} style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainer }]}>
                <Ionicons name={report.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: '800' }}>{report.title}</Text>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 2 }}>
                  {report.description}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.exportBtn,
                  { backgroundColor: busy ? colors.mutedBg : colors.primary },
                ]}
                onPress={() => void handleExport(report)}
                disabled={busy || !!loading}
              >
                <Ionicons
                  name={busy ? 'hourglass-outline' : 'download-outline'}
                  size={16}
                  color={busy ? colors.muted : '#fff'}
                />
                <Text
                  style={{
                    color: busy ? colors.muted : '#fff',
                    fontSize: FontSize.xs,
                    fontWeight: '700',
                  }}
                >
                  {busy ? 'Exporting…' : 'Export'}
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </View>

      <Card style={[styles.note, { marginTop: Spacing.xl }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={{ color: colors.muted, fontSize: FontSize.sm, flex: 1 }}>
          Reports are exported as CSV files you can open in Excel or Google Sheets.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  row: {
    alignItems: 'center',
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
  exportBtn: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  note: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
});
