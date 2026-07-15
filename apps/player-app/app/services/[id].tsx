import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { SERVICE_CATEGORY_LABELS, type ServiceCategory, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { bookService, getServiceListing } from '@/lib/shop';
import { completePayment } from '@/lib/payments';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    pickupAddress: '',
    pickupPhone: '',
    pickupCity: '',
    customerNotes: '',
    equipmentDetails: '',
  });

  const listingQuery = useQuery({
    queryKey: ['services', 'listing', id],
    queryFn: () => getServiceListing(id!),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!token || !user || !id) throw new Error('Sign in required');
      const { payment } = await bookService(token, id, {
        ...form,
        customerNotes: form.customerNotes || undefined,
        equipmentDetails: form.equipmentDetails || undefined,
      });
      await completePayment(token, payment, user.email, `${user.firstName} ${user.lastName}`);
    },
    onSuccess: () => {
      Alert.alert('Booked', 'Service booking confirmed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert('Booking failed', err.message),
  });

  const listing = listingQuery.data;
  const category = listing?.category as ServiceCategory | undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Book service" showBack />

      <QueryState
        isLoading={listingQuery.isLoading}
        isError={listingQuery.isError}
        error={listingQuery.error as Error}
        onRetry={() => listingQuery.refetch()}
      >
        {listing ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.xxxl },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: colors.foreground }]}>{listing.title}</Text>
            <Badge
              label={category ? SERVICE_CATEGORY_LABELS[category] : listing.category}
              variant="primary"
            />
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(Number(listing.price))}
            </Text>
            {listing.description ? (
              <Text style={[styles.description, { color: colors.muted }]}>
                {listing.description}
              </Text>
            ) : null}

            {(
              [
                'pickupAddress',
                'pickupPhone',
                'pickupCity',
                'equipmentDetails',
                'customerNotes',
              ] as const
            ).map((field) => (
              <View key={field}>
                <Text style={[styles.label, { color: colors.muted }]}>
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <TextInput
                  value={form[field]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [field]: v }))}
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                  placeholderTextColor={colors.muted}
                  multiline={field === 'customerNotes'}
                />
              </View>
            ))}

            <Button
              label={bookMutation.isPending ? 'Processing…' : 'Book & pay'}
              disabled={bookMutation.isPending}
              onPress={() => bookMutation.mutate()}
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
  price: { fontSize: FontSize.xl, fontWeight: '800' },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4, textTransform: 'capitalize' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
});
