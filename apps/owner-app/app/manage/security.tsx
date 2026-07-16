import { useState } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { changePassword, getAuthMe, logoutAllDevices } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function SecurityAccessScreen() {
  const { colors } = useTheme();
  const { token, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const meQuery = useQuery({
    queryKey: ['owner', 'auth-me'],
    queryFn: () => getAuthMe(token!),
    enabled: !!token,
  });

  const changeMutation = useMutation({
    mutationFn: () => changePassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      Alert.alert('Updated', 'Password changed successfully.');
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => logoutAllDevices(token!),
    onSuccess: async () => {
      Alert.alert('Signed out everywhere', 'All sessions have been revoked.');
      await signOut();
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });

  const onChangePassword = () => {
    if (newPassword.length < 8) {
      Alert.alert('Invalid', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert('Invalid', 'New password and confirmation do not match.');
      return;
    }
    changeMutation.mutate();
  };

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
      <ManageHeader title="Security & Access" />
      <Text style={[styles.title, { color: colors.foreground }]}>Security & Access</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Manage password, sessions, and account access.
      </Text>

      <QueryState
        isLoading={meQuery.isLoading}
        isError={meQuery.isError}
        error={meQuery.error as Error}
        onRetry={() => meQuery.refetch()}
      >
        <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>SIGNED IN AS</Text>
          <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}>
            {meQuery.data?.email}
          </Text>
          <Text style={{ color: colors.muted }}>
            Roles: {(meQuery.data?.roles ?? []).join(', ') || '—'}
          </Text>
        </Card>
      </QueryState>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        <Text style={{ color: colors.foreground, fontWeight: '800' }}>Change password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Confirm new password"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary }]}
          disabled={changeMutation.isPending}
          onPress={onChangePassword}
        >
          {changeMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Update Password</Text>
          )}
        </Pressable>
      </Card>

      <Card style={{ gap: Spacing.md, marginTop: Spacing.md }}>
        <Text style={{ color: colors.foreground, fontWeight: '800' }}>Sessions</Text>
        <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
          Sign out of all devices. You will need to log in again on this device.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: '#DC2626' }]}
          disabled={logoutAllMutation.isPending}
          onPress={() =>
            Alert.alert('Logout all devices?', 'This revokes every active session.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout all',
                style: 'destructive',
                onPress: () => logoutAllMutation.mutate(),
              },
            ])
          }
        >
          {logoutAllMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Logout All Devices</Text>
          )}
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
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
