import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  createCourt,
  getCourt,
  getMyCourts,
  listAmenities,
  listSports,
  updateCourt,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const FORM_AMENITIES = [
  { key: 'Floodlights', icon: 'bulb-outline' as const, label: 'Floodlights' },
  { key: 'AC', icon: 'home-outline' as const, label: 'Indoor / AC' },
  { key: 'Lockers', icon: 'shirt-outline' as const, label: 'Locker Rooms' },
  { key: 'Showers', icon: 'water-outline' as const, label: 'Showers' },
  { key: 'Parking', icon: 'car-outline' as const, label: 'Parking' },
];

export default function CourtFormScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const courtId = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = Boolean(courtId);

  const [name, setName] = useState('');
  const [sportSlug, setSportSlug] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['Lockers']);
  const [error, setError] = useState<string | null>(null);

  const sportsQuery = useQuery({
    queryKey: ['sports'],
    queryFn: () => listSports(token!),
    enabled: !!token,
  });

  const amenitiesQuery = useQuery({
    queryKey: ['amenities'],
    queryFn: () => listAmenities(token!),
    enabled: !!token,
  });

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token && !isEdit,
  });

  const courtQuery = useQuery({
    queryKey: ['owner', 'court', courtId],
    queryFn: () => getCourt(token!, courtId!),
    enabled: !!token && !!courtId,
  });

  useEffect(() => {
    const sports = sportsQuery.data ?? [];
    if (!sportSlug && sports.length > 0) {
      setSportSlug(sports[0].slug);
    }
  }, [sportsQuery.data, sportSlug]);

  useEffect(() => {
    if (!isEdit && courtsQuery.data?.items?.[0]) {
      const seed = courtsQuery.data.items[0];
      if (!address) setAddress(seed.address);
      if (!city) setCity(seed.city);
      if (!state && seed.state) setState(seed.state);
    }
  }, [isEdit, courtsQuery.data, address, city, state]);

  useEffect(() => {
    const court = courtQuery.data;
    if (!court) return;
    setName(court.name);
    setSportSlug(court.sport?.slug ?? '');
    setPrice(court.defaultSlotPrice ? String(Number(court.defaultSlotPrice)) : '');
    setAddress(court.address);
    setCity(court.city);
    setState(court.state ?? '');
    setSelectedAmenities(court.amenities ?? []);
    const imgs = court.images ?? [];
    if (imgs.length > 0) {
      const first = imgs[0];
      setPhotoUrl(typeof first === 'string' ? first : first.url);
    }
    const maxMatch = court.rules?.match(/Max\s+(\d+)\s+players/i);
    if (maxMatch) setMaxPlayers(maxMatch[1]);
  }, [courtQuery.data]);

  const validAmenitySet = useMemo(
    () => new Set(amenitiesQuery.data ?? FORM_AMENITIES.map((a) => a.key)),
    [amenitiesQuery.data],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const amenities = selectedAmenities.filter((a) => validAmenitySet.has(a));
      const payload = {
        name: name.trim(),
        sportSlug: sportSlug || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim() || undefined,
        amenities,
        defaultSlotPrice: price ? Number(price) : undefined,
        rules: maxPlayers ? `Max ${maxPlayers} players per court.` : undefined,
        images: photoUrl.trim()
          ? [{ url: photoUrl.trim(), isPrimary: true, altText: name.trim() || 'Court photo' }]
          : undefined,
      };
      if (!payload.name) throw new Error('Court name is required');
      if (!payload.address) throw new Error('Address is required');
      if (!payload.city) throw new Error('City is required');
      if (isEdit) return updateCourt(token!, courtId!, payload);
      return createCourt(token!, payload);
    },
    onSuccess: async (court) => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'courts'] });
      await queryClient.invalidateQueries({ queryKey: ['owner', 'court', court.id] });
      router.replace(`/court/${court.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  function toggleAmenity(key: string) {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key],
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xxxl,
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isEdit ? 'Edit Court' : 'Add New Court'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>Court Photos</Text>
        <View style={styles.photoRow}>
          <View
            style={[
              styles.uploadBox,
              { borderColor: colors.primary, backgroundColor: colors.surfaceContainer },
            ]}
          >
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
              Photo URL
            </Text>
          </View>
          <TextInput
            value={photoUrl}
            onChangeText={setPhotoUrl}
            placeholder="https://…"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              styles.photoInput,
              {
                borderColor: colors.border,
                color: colors.foreground,
                backgroundColor: colors.card,
              },
            ]}
            autoCapitalize="none"
          />
        </View>

        <View
          style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Court Name (e.g., Center Court 01)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Sport Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: Spacing.md }}
          >
            <View style={styles.chipRow}>
              {(sportsQuery.data ?? []).map((sport) => {
                const active = sport.slug === sportSlug;
                return (
                  <Pressable
                    key={sport.id}
                    onPress={() => setSportSlug(sport.slug)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.mutedBg,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : colors.foreground,
                        fontWeight: '700',
                        fontSize: FontSize.sm,
                      }}
                    >
                      {sport.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Max Players</Text>
              <TextInput
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Base Hourly Price</Text>
              <View style={styles.priceRow}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>₹</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="500"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.input,
                    styles.priceInput,
                    { borderColor: colors.border, color: colors.foreground },
                  ]}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <View style={styles.row}>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { flex: 1, borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="State"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { flex: 1, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>
        </View>

        <View style={styles.amenityHeader}>
          <Text style={[styles.sectionLabel, { color: colors.muted, marginBottom: 0 }]}>
            Amenities
          </Text>
          <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
            Select all that apply
          </Text>
        </View>
        <View style={styles.chipRow}>
          {FORM_AMENITIES.map((item) => {
            const active = selectedAmenities.includes(item.key);
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleAmenity(item.key)}
                style={[
                  styles.amenityChip,
                  {
                    backgroundColor: active ? colors.secondaryContainer : colors.card,
                    borderColor: active ? colors.secondary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={active ? colors.secondary : colors.muted}
                />
                <Text
                  style={{
                    color: active ? colors.secondary : colors.foreground,
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.infoBox,
            { backgroundColor: '#d1fae5', borderColor: colors.secondaryContainer },
          ]}
        >
          <Ionicons name="information-circle" size={18} color={colors.secondary} />
          <Text
            style={{ color: colors.foreground, flex: 1, fontSize: FontSize.sm, lineHeight: 18 }}
          >
            Courts are set to <Text style={{ fontWeight: '800' }}>Available</Text> by default. You
            can manage maintenance blackout periods in{' '}
            <Text
              style={{ fontWeight: '700', textDecorationLine: 'underline' }}
              onPress={() => {
                if (courtId) router.push(`/court/availability?courtId=${courtId}`);
                else
                  Alert.alert('Save court first', 'Schedule maintenance after creating the court.');
              }}
            >
              Calendar Settings
            </Text>
            .
          </Text>
        </View>

        {error ? (
          <Text style={{ color: colors.danger, marginTop: Spacing.md, fontSize: FontSize.sm }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: mutation.isPending ? 0.7 : 1 },
          ]}
          disabled={mutation.isPending || (isEdit && courtQuery.isLoading)}
          onPress={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>Save Court</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  photoRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  uploadBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 4,
    height: 88,
    justifyContent: 'center',
    width: 96,
  },
  photoInput: { flex: 1, height: 88, textAlignVertical: 'top' },
  formCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  priceRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  priceInput: { flex: 1 },
  amenityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  amenityChip: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  saveBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  saveText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
