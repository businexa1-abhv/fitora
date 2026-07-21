import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { sendFriendRequest } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function FindFriendsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [userId, setUserId] = useState('');
  const [sent, setSent] = useState(false);

  const requestMutation = useMutation({
    mutationFn: () => sendFriendRequest(token!, userId.trim()),
    onSuccess: () => {
      setSent(true);
      setUserId('');
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Find Friends" showBack />
      <View style={styles.content}>
        <Text style={[styles.help, { color: colors.muted }]}>
          Enter a player user ID to send a friend request.
        </Text>
        <TextInput
          value={userId}
          onChangeText={setUserId}
          placeholder="User ID"
          autoCapitalize="none"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
          ]}
        />
        <Button
          label={requestMutation.isPending ? 'Sending...' : 'Send Request'}
          fullWidth
          disabled={!userId.trim() || requestMutation.isPending}
          onPress={() => requestMutation.mutate()}
        />
        {sent ? (
          <Text style={[styles.success, { color: colors.primary }]}>Friend request sent!</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.lg, padding: Spacing.xl },
  help: { fontSize: FontSize.sm, lineHeight: 20 },
  input: { borderRadius: Radius.lg, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md },
  success: { fontSize: FontSize.sm, fontWeight: '800', textAlign: 'center' },
});
