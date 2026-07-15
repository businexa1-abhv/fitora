'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, partnerApi } from '@/lib/api';
import { useOnboarding } from '@/components/onboarding-provider';
import {
  PartnerFooter,
  RegisterHeader,
  RegisterStepper,
  fieldClass,
  labelClass,
  primaryBtnClass,
} from '@/components/partner-ui';

const SPORTS = ['cricket', 'badminton', 'football', 'basketball', 'swimming', 'tennis'];
const AMENITIES = [
  'Ample Parking',
  'Fully Air Conditioned',
  'Showers & Changing Rooms',
  'Drinking Water',
  'Free Wi-Fi',
  'First Aid Support',
];

export default function VenueStepPage() {
  const router = useRouter();
  const { application, ensureDraft, setApplication } = useOnboarding();
  const [sports, setSports] = useState<string[]>(['badminton', 'cricket']);
  const [courtType, setCourtType] = useState('Synthetic Turf');
  const [courtCount, setCourtCount] = useState(4);
  const [amenities, setAmenities] = useState<string[]>([
    'Ample Parking',
    'Fully Air Conditioned',
    'Drinking Water',
  ]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureDraft().then((app) => {
      const venue = (app.venue ?? {}) as {
        sports?: string[];
        courtType?: string;
        courtCount?: number;
        amenities?: string[];
      };
      if (venue.sports?.length) setSports(venue.sports);
      if (venue.courtType) setCourtType(venue.courtType);
      if (venue.courtCount) setCourtCount(venue.courtCount);
      if (venue.amenities) setAmenities(venue.amenities);
    });
  }, [ensureDraft]);

  function toggleSport(slug: string) {
    setSports((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function toggleAmenity(name: string) {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const draft = application ?? (await ensureDraft());
      const saved = await partnerApi.saveVenue(draft.id, {
        sports,
        courtType,
        courtCount,
        amenities,
        latitude: 12.9716,
        longitude: 77.5946,
        operationalHours: { openTime: '06:00', closeTime: '22:00', days: [0, 1, 2, 3, 4, 5, 6] },
      });
      setApplication(saved);
      router.push('/register/sports');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save venue details');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[260px_1fr] sm:px-6">
        <RegisterStepper active="venue" />
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <h1 className="font-display text-3xl font-bold">Venue Details & Facilities</h1>
          <p className="mt-2 text-sm text-muted">
            Provide information about your sports facility and the amenities available to athletes.
          </p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface-low">
            <div className="flex h-48 items-center justify-center bg-[linear-gradient(135deg,#fce3d9,#fff8f6)] text-sm text-muted">
              Map pin ready — entrance will use your saved venue address
            </div>
            <p className="px-4 py-3 text-xs text-muted">
              Pin your exact entrance on the map for easy navigation.
            </p>
          </div>

          <div className="mt-8">
            <p className={labelClass}>Sports Offered</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleSport(sport)}
                  className={`rounded-2xl border px-3 py-4 text-sm font-medium capitalize ${
                    sports.includes(sport)
                      ? 'border-primary-container bg-surface-low text-primary'
                      : 'border-border bg-white text-muted'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Court Type</label>
              <select
                className={fieldClass}
                value={courtType}
                onChange={(e) => setCourtType(e.target.value)}
              >
                {['Synthetic Turf', 'Wooden Floor', 'Clay', 'Acrylic'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Number of Courts</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-border"
                  onClick={() => setCourtCount((n) => Math.max(1, n - 1))}
                >
                  -
                </button>
                <span className="min-w-8 text-center font-semibold">{courtCount}</span>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-border"
                  onClick={() => setCourtCount((n) => n + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className={labelClass}>Amenities</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="accent-primary-container"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between gap-4">
            <Link href="/register/business" className="text-sm font-medium text-muted">
              ← Back to Business Info
            </Link>
            <button type="submit" disabled={busy} className={primaryBtnClass}>
              Next: Sports Config
            </button>
          </div>
        </form>
      </div>
      <PartnerFooter />
    </div>
  );
}
