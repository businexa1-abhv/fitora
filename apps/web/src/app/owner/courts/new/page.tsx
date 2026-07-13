'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SPORT_LABELS, SportType } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { createCourt } from '@/lib/courts';
import { CitySelect } from '@/components/city-select';

export default function NewCourtPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    sportType: SportType.BADMINTON,
    address: '',
    city: '',
    amenities: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    if (!form.city) {
      setError('Please select a city');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createCourt(token, {
        name: form.name,
        description: form.description || undefined,
        sportType: form.sportType,
        address: form.address,
        city: form.city,
        amenities: form.amenities
          ? form.amenities
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
      });
      router.push('/owner/courts');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create court');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        href="/owner/courts"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courts
      </Link>

      <OwnerPageHeader
        title="Add a court"
        description="List your venue for players to discover and book"
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

        <FormField label="Court name" id="name">
          <input
            id="name"
            required
            placeholder="e.g. Smash Badminton Arena"
            className={inputClassName}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </FormField>

        <FormField label="Sport" id="sportType">
          <select
            id="sportType"
            className={inputClassName}
            value={form.sportType}
            onChange={(e) => update('sportType', e.target.value)}
          >
            {Object.entries(SPORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Address" id="address">
          <input
            id="address"
            required
            placeholder="Street address"
            className={inputClassName}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
          />
        </FormField>

        <FormField label="City" id="city">
          <CitySelect
            value={form.city}
            onChange={(city) => update('city', city)}
            placeholder="Search city in India…"
            allowClear={false}
          />
        </FormField>

        <FormField label="Description" id="description">
          <textarea
            id="description"
            rows={3}
            placeholder="Tell players about your venue…"
            className={inputClassName}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </FormField>

        <FormField label="Amenities (comma-separated)" id="amenities">
          <input
            id="amenities"
            placeholder="Parking, AC, Changing rooms"
            className={inputClassName}
            value={form.amenities}
            onChange={(e) => update('amenities', e.target.value)}
          />
        </FormField>

        <div className="rounded-xl bg-primary-light border border-primary/20 px-4 py-3 text-sm text-primary">
          Courts require admin approval before they appear in public search.
        </div>

        <button type="submit" disabled={loading} className={`${buttonClassName} w-full py-3`}>
          {loading ? 'Creating…' : 'Create court'}
        </button>
      </form>
    </div>
  );
}
