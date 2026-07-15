import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@fitora/auth';

export default function StitchLoginScreen() {
  const { signIn } = useAuth();

  function handleSignIn() {
    signIn({
      accessToken: 'player-demo-token',
      userId: 'player-1',
      roles: ['PLAYER'],
    });
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>FitOra Player Login (Stitch)</Text>
      <Pressable
        onPress={handleSignIn}
        style={{
          marginTop: 16,
          backgroundColor: '#111827',
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Continue as Player</Text>
      </Pressable>
    </View>
  );
}
