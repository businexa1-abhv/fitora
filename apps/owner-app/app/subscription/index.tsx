import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@fitora/auth';

export default function SubscriptionGateScreen() {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Renew Subscription</Text>
      <Text style={{ marginTop: 10, maxWidth: 280, textAlign: 'center' }}>
        Owner actions are blocked until an active subscription is available.
      </Text>
      <Pressable
        onPress={signOut}
        style={{
          marginTop: 16,
          backgroundColor: '#1f2937',
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
