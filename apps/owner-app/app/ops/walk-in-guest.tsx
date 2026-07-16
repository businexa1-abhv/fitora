import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const SPORTS = ['Badminton', 'Tennis', 'Pickleball'];

export default function WalkInGuestCaptureScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sport, setSport] = useState('Badminton');

  const continueNext = () => {
    if (!name.trim() || phone.trim().length < 10) {
      Alert.alert('Missing details', 'Enter guest name and a valid phone number.');
      return;
    }
    router.push({
      pathname: '/ops/walk-in',
      params: {
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim(),
        guestSport: sport,
      },
    });
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.brand, { color: colors.primary }]}>Walk-in Guest</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Guest Capture</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Create a walk-in guest profile before selecting a court slot.
      </Text>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Text style={[styles.label, { color: colors.muted }]}>Full name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Rahul Sharma"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="10-digit mobile"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Email (optional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="guest@email.com"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Sport preference</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {SPORTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSport(s)}
              style={[
                styles.chip,
                { backgroundColor: sport === s ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={{ color: sport === s ? '#fff' : colors.foreground, fontWeight: '800' }}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={continueNext}>
        <Text style={styles.btnText}>Continue to slot</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  label: { fontSize: 11, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: { borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  btnText: { color: '#fff', fontWeight: '800' },
});
