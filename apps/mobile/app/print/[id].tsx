import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { TSHIRT_COLOR_OPTIONS, TSHIRT_SIZE_OPTIONS, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { createPrintOrder, getPrintListing, uploadPrintDesign } from '@/lib/shop';
import { compressBase64Image } from '@/lib/image-compression';
import { completePayment } from '@/lib/payments';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PrintOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [designUrl, setDesignUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    tshirtSize: 'M',
    tshirtColor: 'White',
    quantity: '1',
    pickupAddress: '',
    pickupPhone: '',
    pickupCity: '',
    customerNotes: '',
  });

  const listingQuery = useQuery({
    queryKey: ['print', 'listing', id],
    queryFn: () => getPrintListing(id!),
    enabled: !!id,
  });

  async function pickDesign() {
    if (!token) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.65,
      allowsEditing: true,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const compressed = compressBase64Image(asset.base64!, mimeType);
      const fileName = asset.fileName ?? `design.${mimeType.split('/')[1] ?? 'jpg'}`;
      const design = await uploadPrintDesign(token, {
        fileName,
        mimeType: compressed.mimeType,
        dataBase64: compressed.base64,
      });
      setDesignUrl(design.url);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload design');
    } finally {
      setUploading(false);
    }
  }

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!token || !user || !id) throw new Error('Sign in required');
      if (!designUrl) throw new Error('Upload a design first');
      const { order, payment } = await createPrintOrder(token, id, {
        designUrl,
        tshirtSize: form.tshirtSize,
        tshirtColor: form.tshirtColor,
        quantity: Number(form.quantity) || 1,
        pickupAddress: form.pickupAddress,
        pickupPhone: form.pickupPhone,
        pickupCity: form.pickupCity,
        customerNotes: form.customerNotes || undefined,
      });
      await completePayment(
        token,
        payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
      );
      return order;
    },
    onSuccess: () => {
      Alert.alert('Order placed', 'Your print order is confirmed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert('Order failed', err.message),
  });

  const listing = listingQuery.data;
  const qty = Number(form.quantity) || 1;
  const total = listing ? Number(listing.price) * qty : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Custom print" showBack />

      <QueryState
        isLoading={listingQuery.isLoading}
        isError={listingQuery.isError}
        error={listingQuery.error as Error}
        onRetry={() => listingQuery.refetch()}
      >
        {listing ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: colors.foreground }]}>{listing.title}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(Number(listing.price))} each · Total {formatCurrency(total)}
            </Text>

            <Button
              label={uploading ? 'Uploading…' : designUrl ? 'Design uploaded ✓' : 'Upload design'}
              variant="outline"
              disabled={uploading}
              onPress={pickDesign}
            />

            <View style={styles.row}>
              {TSHIRT_SIZE_OPTIONS.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => setForm((prev) => ({ ...prev, tshirtSize: size }))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: form.tshirtSize === size ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: form.tshirtSize === size ? colors.primaryForeground : colors.foreground }}>
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              {TSHIRT_COLOR_OPTIONS.slice(0, 6).map((color) => (
                <Pressable
                  key={color.name}
                  onPress={() => setForm((prev) => ({ ...prev, tshirtColor: color.name }))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: form.tshirtColor === color.name ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: form.tshirtColor === color.name ? colors.primaryForeground : colors.foreground,
                      fontSize: FontSize.xs,
                    }}
                  >
                    {color.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {(['quantity', 'pickupAddress', 'pickupPhone', 'pickupCity', 'customerNotes'] as const).map((field) => (
              <View key={field}>
                <Text style={[styles.label, { color: colors.muted }]}>
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <TextInput
                  value={form[field]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [field]: v }))}
                  keyboardType={field === 'quantity' ? 'number-pad' : 'default'}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  placeholderTextColor={colors.muted}
                />
              </View>
            ))}

            <Button
              label={orderMutation.isPending ? 'Processing…' : 'Place order & pay'}
              disabled={orderMutation.isPending || !designUrl}
              onPress={() => orderMutation.mutate()}
            />
          </ScrollView>
        ) : null}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  price: { fontSize: FontSize.lg, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4, textTransform: 'capitalize' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
});
