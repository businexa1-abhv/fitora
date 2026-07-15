import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@fitora/auth';

export default function OwnerLoginScreen() {
  const { signIn } = useAuth();

  function signInOwner(activeSubscription: boolean) {
    signIn({
      accessToken: 'owner-demo-token',
      userId: 'owner-1',
      roles: ['OWNER'],
      subscriptionActive: activeSubscription,
    });
  }

  function signInCoach() {
    signIn({
      accessToken: 'coach-demo-token',
      userId: 'coach-1',
      roles: ['COACH'],
    });
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>FitOra Owner/Coach Login</Text>
      <Pressable
        onPress={() => signInOwner(true)}
        style={{
          marginTop: 16,
          backgroundColor: '#111827',
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Continue as Owner</Text>
      </Pressable>
      <Pressable
        onPress={() => signInOwner(false)}
        style={{
          marginTop: 10,
          backgroundColor: '#7c2d12',
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Continue as Expired Owner</Text>
      </Pressable>
      <Pressable
        onPress={signInCoach}
        style={{
          marginTop: 10,
          backgroundColor: '#1d4ed8',
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Continue as Coach</Text>
      </Pressable>
    </View>
  );
}
