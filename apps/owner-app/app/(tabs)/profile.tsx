import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeaveRequestStatus } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { CoachProfileSettingsScreen } from '@/components/coach-profile-settings';
import { Card, MonoLabel, QueryState } from '@/components/ui';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  getTrainerProfile,
  listLeaveRequests,
  updateTrainerProfile,
} from '@/lib/trainer-api';
import { formatDate, todayString } from '@/lib/trainer-utils';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function statusColor(
  status: LeaveRequestStatus,
  colors: { secondary: string; danger: string; muted: string; tertiary: string },
) {
  switch (status) {
    case LeaveRequestStatus.APPROVED:
      return colors.secondary;
    case LeaveRequestStatus.REJECTED:
      return colors.danger;
    case LeaveRequestStatus.PENDING:
      return colors.tertiary;
    default:
      return colors.muted;
  }
}

export default function CoachProfileScreen() {
  const { isCoachMode } = useAuth();
  if (isCoachMode) return <CoachProfileSettingsScreen />;
  return <LegacyCoachProfileScreen />;
}

function LegacyCoachProfileScreen() {
  const { colors } = useTheme();
  const { token, user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(todayString());
  const [reason, setReason] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  const profileQuery = useQuery({
    queryKey: ['trainer', 'profile'],
    queryFn: () => getTrainerProfile(token!),
    enabled: !!token,
  });

  const leaveQuery = useQuery({
    queryKey: ['trainer', 'leave'],
    queryFn: () => listLeaveRequests(token!),
    enabled: !!token,
  });

  const profile = profileQuery.data;

  const leaveMutation = useMutation({
    mutationFn: () => createLeaveRequest(token!, { startDate, endDate, reason }),
    onSuccess: () => {
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['trainer', 'leave'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(token!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trainer', 'leave'] }),
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      updateTrainerProfile(token!, {
        bio,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        specializations: specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setProfileMessage('Profile updated');
      void queryClient.invalidateQueries({ queryKey: ['trainer', 'profile'] });
    },
    onError: (err) => {
      setProfileMessage(err instanceof Error ? err.message : 'Update failed');
    },
  });

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setYearsExperience(profile.yearsExperience != null ? String(profile.yearsExperience) : '');
    setSpecializations(profile.specializations.join(', '));
  }, [profile?.id, profile?.updatedAt]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      <Card style={{ marginTop: Spacing.lg }}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>
        <Text style={{ color: colors.primary, marginTop: Spacing.sm, fontWeight: '700' }}>
          Coach
        </Text>
        {profile?.isVerified ? (
          <View style={[styles.verifiedPill, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Verified trainer</Text>
          </View>
        ) : null}
      </Card>

      <Text style={[styles.section, { color: colors.foreground }]}>Trainer profile</Text>
      <QueryState
        isLoading={profileQuery.isLoading}
        isError={profileQuery.isError}
        error={profileQuery.error as Error}
        onRetry={() => profileQuery.refetch()}
      >
        <Card style={{ gap: Spacing.md }}>
          <View>
            <MonoLabel>Bio</MonoLabel>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              placeholder="Tell owners about your coaching style…"
              placeholderTextColor={colors.muted}
              style={[styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
          <View>
            <MonoLabel>Years of experience</MonoLabel>
            <TextInput
              value={yearsExperience}
              onChangeText={setYearsExperience}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
          <View>
            <MonoLabel>Specializations</MonoLabel>
            <TextInput
              value={specializations}
              onChangeText={setSpecializations}
              placeholder="Badminton, Kids training"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <Text style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: 4 }}>
              Comma-separated
            </Text>
          </View>
          {profileMessage ? (
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' }}>
              {profileMessage}
            </Text>
          ) : null}
          <Pressable
            disabled={profileMutation.isPending}
            onPress={() => profileMutation.mutate()}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: profileMutation.isPending ? 0.6 : 1 },
            ]}
          >
            {profileMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save profile</Text>
            )}
          </Pressable>
        </Card>
      </QueryState>

      <Text style={[styles.section, { color: colors.foreground }]}>Leave requests</Text>
      <Card style={{ gap: Spacing.md }}>
        <Text style={{ color: colors.foreground, fontWeight: '800' }}>Request leave</Text>
        <View style={styles.dateGrid}>
          <View style={{ flex: 1 }}>
            <MonoLabel>Start date</MonoLabel>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <MonoLabel>End date</MonoLabel>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
        </View>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          placeholder="Reason for leave…"
          placeholderTextColor={colors.muted}
          style={[styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
        />
        {leaveMutation.isError ? (
          <Text style={{ color: colors.danger, fontSize: FontSize.sm }}>
            {(leaveMutation.error as Error).message}
          </Text>
        ) : null}
        <Pressable
          disabled={leaveMutation.isPending || !reason.trim()}
          onPress={() => leaveMutation.mutate()}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              opacity: leaveMutation.isPending || !reason.trim() ? 0.6 : 1,
            },
          ]}
        >
          {leaveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Submit request</Text>
          )}
        </Pressable>
      </Card>

      <QueryState
        isLoading={leaveQuery.isLoading}
        isError={leaveQuery.isError}
        error={leaveQuery.error as Error}
        onRetry={() => leaveQuery.refetch()}
      >
        <Card style={{ marginTop: Spacing.sm, padding: 0, overflow: 'hidden' }}>
          <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: '800' }}>Your requests</Text>
          </View>
          {(leaveQuery.data ?? []).length === 0 ? (
            <Text style={{ color: colors.muted, padding: Spacing.lg, textAlign: 'center' }}>
              No leave requests yet
            </Text>
          ) : (
            (leaveQuery.data ?? []).map((req, index) => (
              <View
                key={req.id}
                style={[
                  styles.leaveRow,
                  index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : null,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: colors.foreground, fontWeight: '700', fontSize: FontSize.sm }}
                  >
                    {formatDate(req.startDate)} – {formatDate(req.endDate)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: 4 }}>
                    {req.reason}
                  </Text>
                  {req.reviewNote ? (
                    <Text style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: 2 }}>
                      Review: {req.reviewNote}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
                  <Text
                    style={{
                      color: statusColor(req.status, colors),
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    {req.status}
                  </Text>
                  {req.status === LeaveRequestStatus.PENDING ? (
                    <Pressable onPress={() => cancelMutation.mutate(req.id)}>
                      <Text
                        style={{ color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Card>
      </QueryState>

      <Pressable
        onPress={() => void signOut()}
        style={[styles.signOut, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  name: { fontSize: FontSize.xl, fontWeight: '800' },
  verifiedPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginTop: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  section: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textArea: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    minHeight: 80,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
  },
  primaryBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  dateGrid: { flexDirection: 'row', gap: Spacing.md },
  listHeader: { borderBottomWidth: 1, padding: Spacing.md },
  leaveRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  signOut: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  signOutText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
