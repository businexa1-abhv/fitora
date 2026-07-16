import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getAuthMe } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function OwnerProfileScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const meQuery = useQuery({
    queryKey: ['owner', 'auth-me'],
    queryFn: () => getAuthMe(token!),
    enabled: !!token,
  });

  useEffect(() => {
    const me = meQuery.data;
    if (!me) return;
    setFirstName(me.firstName ?? user?.firstName ?? '');
    setLastName(me.lastName ?? user?.lastName ?? '');
    setPhone(me.phone ?? '');
  }, [meQuery.data, user]);

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
      <ManageHeader title="Owner Profile" />
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' }}>
            {(firstName || meQuery.data?.email || 'O').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {firstName || lastName
            ? `${firstName} ${lastName}`.trim()
            : (meQuery.data?.email ?? 'Owner')}
        </Text>
        <Text style={{ color: colors.muted }}>{meQuery.data?.email ?? user?.email}</Text>
      </View>

      <QueryState
        isLoading={meQuery.isLoading}
        isError={meQuery.isError}
        error={meQuery.error as Error}
        onRetry={() => meQuery.refetch()}
      >
        <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Text style={[styles.label, { color: colors.muted }]}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Last name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Email</Text>
          <TextInput
            value={meQuery.data?.email ?? ''}
            editable={false}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.muted, backgroundColor: colors.mutedBg },
            ]}
          />
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: '/manage/profile-success',
                params: {
                  name: `${firstName} ${lastName}`.trim() || meQuery.data?.email || 'Owner',
                  email: meQuery.data?.email ?? user?.email ?? '',
                  phone,
                },
              })
            }
          >
            <Text style={styles.btnText}>Save Profile</Text>
          </Pressable>
        </Card>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
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
