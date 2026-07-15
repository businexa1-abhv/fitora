import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@fitora/auth';

export default function OwnerDashboardScreen() {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>FitOra Owner Dashboard</Text>
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
