import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import type { SportSummary } from '@fitora/shared';
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
  { key: 'AC', icon: 'home-outline' as const, label: 'Indoor' },
  { key: 'Lockers', icon: 'lock-closed-outline' as const, label: 'Locker Rooms' },
  { key: 'Showers', icon: 'water-outline' as const, label: 'Showers' },
  { key: 'Parking', icon: 'car-outline' as const, label: 'Parking' },
];

const FALLBACK_AMENITY_KEYS = FORM_AMENITIES.map((a) => a.key);

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: unknown[] }).items.filter(
      (item): item is string => typeof item === 'string',
    );
  }
  return [];
}

function asSportList(value: unknown): SportSummary[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is SportSummary =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as SportSummary).id === 'string' &&
        typeof (item as SportSummary).slug === 'string' &&
        typeof (item as SportSummary).name === 'string',
    );
  }
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return asSportList((value as { items: unknown }).items);
  }
  return [];
}

export default function CourtFormScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const courtIdParam = params.id;
  const courtId = Array.isArray(courtIdParam) ? courtIdParam[0] : courtIdParam;
  const isEdit = Boolean(courtId);

  const [name, setName] = useState('');
  const [sportSlug, setSportSlug] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPhotoUrl, setShowPhotoUrl] = useState(false);
  const [sportPickerOpen, setSportPickerOpen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['Lockers']);
  const [error, setError] = useState<string | null>(null);
  const [seededLocation, setSeededLocation] = useState(false);

  const sportsQuery = useQuery({
    queryKey: ['sports'],
    queryFn: () => listSports(token ?? undefined),
    enabled: !!token,
  });

  const amenitiesQuery = useQuery({
    queryKey: ['amenities'],
    queryFn: () => listAmenities(token ?? undefined),
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

  const sports = useMemo(() => asSportList(sportsQuery.data), [sportsQuery.data]);
  const selectedSport = sports.find((s) => s.slug === sportSlug);

  const validAmenitySet = useMemo(() => {
    const fromApi = asStringArray(amenitiesQuery.data);
    return new Set(fromApi.length > 0 ? fromApi : FALLBACK_AMENITY_KEYS);
  }, [amenitiesQuery.data]);

  useEffect(() => {
    if (!sportSlug && sports.length > 0) {
      setSportSlug(sports[0].slug);
    }
  }, [sports, sportSlug]);

  useEffect(() => {
    if (isEdit || seededLocation) return;
    const seed = courtsQuery.data?.items?.[0];
    if (!seed) return;
    if (typeof seed.address === 'string' && seed.address) setAddress(seed.address);
    if (typeof seed.city === 'string' && seed.city) setCity(seed.city);
    if (typeof seed.state === 'string' && seed.state) setStateValue(seed.state);
    setSeededLocation(true);
  }, [isEdit, seededLocation, courtsQuery.data]);

  useEffect(() => {
    const court = courtQuery.data;
    if (!court) return;
    setName(typeof court.name === 'string' ? court.name : '');
    setSportSlug(court.sport?.slug ?? '');
    setPrice(court.defaultSlotPrice ? String(Number(court.defaultSlotPrice)) : '');
    setAddress(typeof court.address === 'string' ? court.address : '');
    setCity(typeof court.city === 'string' ? court.city : '');
    setStateValue(typeof court.state === 'string' ? court.state : '');
    setSelectedAmenities(asStringArray(court.amenities));
    const imgs = Array.isArray(court.images) ? court.images : [];
    if (imgs.length > 0) {
      const first = imgs[0];
      setPhotoUrl(typeof first === 'string' ? first : (first?.url ?? ''));
    }
    const maxMatch =
      typeof court.rules === 'string' ? court.rules.match(/Max\s+(\d+)\s+players/i) : null;
    if (maxMatch?.[1]) setMaxPlayers(maxMatch[1]);
  }, [courtQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Please sign in again');
      const amenities = selectedAmenities.filter((a) => validAmenitySet.has(a));
      const payload = {
        name: name.trim(),
        sportSlug: sportSlug || undefined,
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim() || undefined,
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
      if (price && !Number.isFinite(Number(price))) {
        throw new Error('Enter a valid hourly price');
      }
      if (isEdit) {
        if (!courtId) throw new Error('Missing court id');
        return updateCourt(token, courtId, payload);
      }
      return createCourt(token, payload);
    },
    onSuccess: async (court) => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'courts'] });
      if (court?.id) {
        await queryClient.invalidateQueries({ queryKey: ['owner', 'court', court.id] });
        router.replace(`/court/${court.id}`);
        return;
      }
      router.replace('/(tabs)/courts');
    },
    onError: (err: Error) => setError(err.message || 'Could not save court'),
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
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.primary }]}>
            {isEdit ? 'Edit Court' : 'Add New Court'}
          </Text>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'O').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>Court Photos</Text>
        <View style={styles.photoRow}>
          <Pressable
            onPress={() => setShowPhotoUrl((v) => !v)}
            style={[
              styles.uploadBox,
              { borderColor: '#9da1ff', backgroundColor: colors.surfaceContainer },
            ]}
          >
            <Ionicons name="camera" size={26} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
              Upload Photo
            </Text>
          </Pressable>

          {photoUrl.trim() ? (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: photoUrl.trim() }} style={styles.thumb} />
              <Pressable
                style={[styles.thumbClose, { backgroundColor: colors.card }]}
                onPress={() => setPhotoUrl('')}
                hitSlop={6}
              >
                <Ionicons name="close" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.thumbPlaceholder,
                { backgroundColor: colors.mutedBg, borderColor: colors.border },
              ]}
            >
              <Ionicons name="image-outline" size={28} color={colors.muted} />
            </View>
          )}
        </View>

        {showPhotoUrl ? (
          <TextInput
            value={photoUrl}
            onChangeText={setPhotoUrl}
            placeholder="Paste image URL (https://…)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.foreground,
                backgroundColor: colors.card,
                marginBottom: Spacing.lg,
              },
            ]}
          />
        ) : null}

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

          <View style={styles.row}>
            <View style={{ flex: 1.2 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Sport Type</Text>
              <Pressable
                onPress={() => setSportPickerOpen(true)}
                style={[
                  styles.input,
                  styles.dropdown,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <Text
                  style={{
                    color: selectedSport ? colors.foreground : colors.muted,
                    fontSize: FontSize.md,
                    fontWeight: '600',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {selectedSport?.name ?? (sportsQuery.isLoading ? 'Loading…' : 'Select sport')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Max Players</Text>
              <TextInput
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Base Hourly Price</Text>
          <View
            style={[
              styles.priceField,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={{ color: colors.muted, fontWeight: '800', fontSize: FontSize.md }}>₹</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="Base Hourly Price"
              placeholderTextColor={colors.muted}
              style={[styles.priceInput, { color: colors.foreground }]}
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
                {active ? <Ionicons name="checkmark" size={14} color={colors.secondary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: Spacing.xl }]}>
          Venue Location
        </Text>
        <View
          style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
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
              value={stateValue}
              onChangeText={setStateValue}
              placeholder="State"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { flex: 1, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>
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
            can manage specific maintenance blackout periods in the{' '}
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

      <Modal
        visible={sportPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSportPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSportPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Sport Type</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {sports.length === 0 ? (
                <Text style={{ color: colors.muted, padding: Spacing.md }}>
                  {sportsQuery.isError ? 'Could not load sports' : 'No sports available'}
                </Text>
              ) : (
                sports.map((sport) => {
                  const active = sport.slug === sportSlug;
                  return (
                    <Pressable
                      key={sport.id}
                      onPress={() => {
                        setSportSlug(sport.slug);
                        setSportPickerOpen(false);
                      }}
                      style={[
                        styles.modalRow,
                        active && { backgroundColor: colors.surfaceContainer },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.foreground,
                          fontWeight: active ? '800' : '600',
                          fontSize: FontSize.md,
                        }}
                      >
                        {sport.name}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  iconBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  photoRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  uploadBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 4,
    height: 96,
    justifyContent: 'center',
    width: 110,
  },
  thumbWrap: {
    borderRadius: Radius.lg,
    height: 96,
    overflow: 'hidden',
    width: 110,
  },
  thumb: { height: '100%', width: '100%' },
  thumbClose: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    width: 110,
  },
  formCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  dropdown: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  priceField: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  priceInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  amenityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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
  modalBackdrop: {
    backgroundColor: 'rgba(17,28,45,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  modalRow: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
