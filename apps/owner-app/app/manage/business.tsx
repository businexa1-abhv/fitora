import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getTenantMe, updateTenant, updateTenantBranding } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function BusinessInformationScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');

  const tenantQuery = useQuery({
    queryKey: ['owner', 'tenant'],
    queryFn: () => getTenantMe(token!),
    enabled: !!token,
  });

  useEffect(() => {
    const t = tenantQuery.data;
    if (!t) return;
    setName(t.name ?? '');
    setBrandName(t.brandName ?? '');
    setLogoUrl(t.logoUrl ?? '');
    setPrimaryColor(t.primaryColor ?? '');
    setSecondaryColor(t.secondaryColor ?? '');
  }, [tenantQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = tenantQuery.data?.id;
      if (!id) throw new Error('Tenant not loaded');
      await updateTenant(token!, id, {
        name: name.trim(),
        brandName: brandName.trim() || undefined,
      });
      await updateTenantBranding(token!, id, {
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
        brandName: brandName.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'tenant'] });
      Alert.alert('Saved', 'Business information updated.');
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <ManageHeader title="Business Information" />
      <Text style={[styles.title, { color: colors.foreground }]}>Business Information</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Academy name, branding, and public identity.
      </Text>

      <QueryState
        isLoading={tenantQuery.isLoading}
        isError={tenantQuery.isError}
        error={tenantQuery.error as Error}
        onRetry={() => tenantQuery.refetch()}
      >
        <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Text style={[styles.label, { color: colors.muted }]}>Academy name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Brand name</Text>
          <TextInput
            value={brandName}
            onChangeText={setBrandName}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Logo URL</Text>
          <TextInput
            value={logoUrl}
            onChangeText={setLogoUrl}
            autoCapitalize="none"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Primary color</Text>
          <TextInput
            value={primaryColor}
            onChangeText={setPrimaryColor}
            autoCapitalize="none"
            placeholder="#1E3A5F"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Secondary color</Text>
          <TextInput
            value={secondaryColor}
            onChangeText={setSecondaryColor}
            autoCapitalize="none"
            placeholder="#10B981"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          {tenantQuery.data?.slug ? (
            <Text style={{ color: colors.muted, marginTop: Spacing.sm }}>
              Slug: {tenantQuery.data.slug}
            </Text>
          ) : null}
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Save Business Info</Text>
            )}
          </Pressable>
        </Card>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '800' },
});
