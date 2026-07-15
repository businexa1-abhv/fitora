import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@fitora/auth';

export default function PlayerHomeScreen() {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>FitOra Player Home</Text>
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
