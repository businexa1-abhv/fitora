'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MembershipDuration, DURATION_LABELS } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { createMembershipPlan } from '@/lib/memberships';

export default function CourtPlansPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration: MembershipDuration.MONTHLY,
    price: 999,
    maxBookings: '' as number | '',
    bookingDiscountPercent: 10,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await createMembershipPlan(token, id, {
        ...form,
        maxBookings: form.maxBookings ? Number(form.maxBookings) : undefined,
        benefits: { bookingDiscountPercent: form.bookingDiscountPercent },
      });
      setSuccess('Membership plan created!');
      setForm({
        name: '',
        description: '',
        duration: MembershipDuration.MONTHLY,
        price: 999,
        maxBookings: '',
        bookingDiscountPercent: 10,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/owner/courts" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to courts
      </Link>

      <OwnerPageHeader
        title="Create membership plan"
        description="Offer recurring plans with booking discounts for members"
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5"
      >
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-primary-light border border-primary/20 px-4 py-3 text-sm text-primary font-medium">
            ✓ {success}
          </div>
        )}

        <FormField label="Plan name" id="name">
          <input
            id="name"
            required
            placeholder="e.g. Monthly Unlimited"
            className={inputClassName}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormField>

        <FormField label="Duration" id="duration">
          <select
            id="duration"
            className={inputClassName}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value as MembershipDuration })}
          >
            {Object.entries(DURATION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Price (₹)" id="price">
          <input
            id="price"
            type="number"
            min={0}
            required
            className={inputClassName}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </FormField>

        <FormField label="Booking discount (%)" id="discount">
          <input
            id="discount"
            type="number"
            min={0}
            max={100}
            className={inputClassName}
            value={form.bookingDiscountPercent}
            onChange={(e) =>
              setForm({ ...form, bookingDiscountPercent: Number(e.target.value) })
            }
          />
        </FormField>

        <FormField label="Max bookings per period (optional)" id="maxBookings">
          <input
            id="maxBookings"
            type="number"
            min={1}
            placeholder="Leave empty for unlimited"
            className={inputClassName}
            value={form.maxBookings}
            onChange={(e) =>
              setForm({
                ...form,
                maxBookings: e.target.value ? Number(e.target.value) : '',
              })
            }
          />
        </FormField>

        <FormField label="Description" id="desc">
          <textarea
            id="desc"
            rows={2}
            placeholder="What's included in this plan?"
            className={inputClassName}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>

        <button type="submit" disabled={loading} className={`${buttonClassName} w-full py-3`}>
          {loading ? 'Creating…' : 'Create plan'}
        </button>
      </form>

      <div className="flex flex-wrap gap-3 text-sm mt-6">
        <Link
          href={`/owner/courts/${id}/training`}
          className="rounded-xl border border-border bg-card px-4 py-2.5 font-semibold hover:border-primary hover:text-primary transition-colors"
        >
          Set up training →
        </Link>
        <Link href="/owner/memberships" className="rounded-xl border border-border bg-card px-4 py-2.5 font-semibold text-muted hover:text-foreground transition-colors">
          View all plans
        </Link>
      </div>
    </div>
  );
}
