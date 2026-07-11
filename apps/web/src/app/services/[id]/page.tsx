'use client';

import { useRouter, useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  SERVICE_CATEGORY_LABELS,
  ServiceCategory,
  type ServiceListing,
  type ServiceReview,
} from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { completePayment } from '@/lib/payments';
import { bookService, getListing, getListingReviews } from '@/lib/marketplace';
import { SERVICE_EMOJIS, SERVICE_GRADIENTS } from '@/lib/marketplace-constants';

export default function ServiceDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ServiceListing | null>(null);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    pickupAddress: '',
    pickupPhone: '',
    pickupCity: '',
    customerNotes: '',
    equipmentDetails: '',
    rentalStartDate: '',
    rentalEndDate: '',
  });

  const isRental = listing?.category === ServiceCategory.EQUIPMENT_RENTAL;

  useEffect(() => {
    if (!id) return;
    Promise.all([getListing(id), getListingReviews(id)])
      .then(([l, r]) => {
        setListing(l);
        setReviews(r);
      })
      .catch(() => router.replace('/services'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user || !listing) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { payment } = await bookService(token, listing.id, {
        pickupAddress: form.pickupAddress,
        pickupPhone: form.pickupPhone,
        pickupCity: form.pickupCity,
        customerNotes: form.customerNotes || undefined,
        equipmentDetails: form.equipmentDetails || undefined,
        rentalStartDate: form.rentalStartDate || undefined,
        rentalEndDate: form.rentalEndDate || undefined,
      });

      await completePayment(
        token,
        payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
        `${listing.title} — service booking`,
      );
      router.push('/services/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !listing) {
    return (
      <PageShell>
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  const emoji = SERVICE_EMOJIS[listing.category as ServiceCategory] ?? '⚙️';
  const gradient = SERVICE_GRADIENTS[listing.category as ServiceCategory] ?? 'from-primary to-emerald-600';

  return (
    <PageShell>
      <Navbar />

      <section className={`bg-gradient-to-br ${gradient} text-white py-10 sm:py-12`}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link href="/services" className="text-white/70 text-sm hover:text-white mb-4 inline-block">
            ← Back to services
          </Link>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-5xl">{emoji}</span>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mt-4">
              {SERVICE_CATEGORY_LABELS[listing.category as ServiceCategory]}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{listing.title}</h1>
            <p className="text-white/80 mt-2">{listing.description}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <span className="rounded-full bg-white/20 px-3 py-1">
                {formatPrice(Number(listing.price))}
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1">
                {listing.turnaroundDays} day turnaround
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1">{listing.city}</span>
              {listing.averageRating && (
                <span className="rounded-full bg-white/20 px-3 py-1">
                  ★ {Number(listing.averageRating).toFixed(1)}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 -mt-4 space-y-8">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5"
        >
          <h2 className="text-lg font-bold">Book this service</h2>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isRental ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Rental start" id="rentalStartDate">
                <input
                  id="rentalStartDate"
                  type="date"
                  required
                  className={inputClassName}
                  value={form.rentalStartDate}
                  onChange={(e) => update('rentalStartDate', e.target.value)}
                />
              </FormField>
              <FormField label="Rental end" id="rentalEndDate">
                <input
                  id="rentalEndDate"
                  type="date"
                  required
                  className={inputClassName}
                  value={form.rentalEndDate}
                  onChange={(e) => update('rentalEndDate', e.target.value)}
                />
              </FormField>
            </div>
          ) : (
            <FormField label="Equipment details" id="equipmentDetails">
              <textarea
                id="equipmentDetails"
                rows={3}
                className={inputClassName}
                placeholder="Racket model, bat type, issue description…"
                value={form.equipmentDetails}
                onChange={(e) => update('equipmentDetails', e.target.value)}
              />
            </FormField>
          )}

          <FormField label="Pickup address" id="pickupAddress">
            <textarea
              id="pickupAddress"
              required
              rows={2}
              className={inputClassName}
              value={form.pickupAddress}
              onChange={(e) => update('pickupAddress', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone" id="pickupPhone">
              <input
                id="pickupPhone"
                type="tel"
                required
                className={inputClassName}
                value={form.pickupPhone}
                onChange={(e) => update('pickupPhone', e.target.value)}
              />
            </FormField>
            <FormField label="City" id="pickupCity">
              <input
                id="pickupCity"
                required
                className={inputClassName}
                value={form.pickupCity}
                onChange={(e) => update('pickupCity', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Notes (optional)" id="customerNotes">
            <textarea
              id="customerNotes"
              rows={2}
              className={inputClassName}
              value={form.customerNotes}
              onChange={(e) => update('customerNotes', e.target.value)}
            />
          </FormField>

          <div className="rounded-xl bg-primary-light/50 p-4 flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-extrabold text-primary">{formatPrice(Number(listing.price))}</span>
          </div>

          <button type="submit" disabled={submitting} className={`${buttonClassName} w-full py-3`}>
            {submitting ? 'Processing payment…' : `Pay ${formatPrice(Number(listing.price))}`}
          </button>
        </motion.form>

        {reviews.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-bold mb-4">Ratings & reviews</h3>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-border pb-4 last:border-0">
                  <p className="text-sm font-semibold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                  {r.title && <p className="font-medium text-sm mt-1">{r.title}</p>}
                  {r.comment && <p className="text-sm text-muted mt-1">{r.comment}</p>}
                  <p className="text-xs text-muted mt-1">
                    {r.user?.firstName} {r.user?.lastName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}
