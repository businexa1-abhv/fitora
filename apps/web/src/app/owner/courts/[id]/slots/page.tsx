'use client';

import React from 'react';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Court, CourtSlot } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatusBadge } from '@/components/owner/owner-status-badge';
import { FormField, inputClassName, buttonClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { generateSlots, getCourt, getCourtSlots } from '@/lib/courts';
import { formatCurrency, formatTime } from '@/lib/owner-utils';
import { SPORT_EMOJI } from '@/lib/constants';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

export default function ManageCourtSlotsPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [court, setCourt] = useState<Court | null>(null);
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: todayString(),
    startHour: 6,
    endHour: 22,
    durationMinutes: 60,
    price: 500,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getCourt(id, token).then(setCourt).catch(() => setCourt(null));
  }, [id, router]);

  useEffect(() => {
    if (form.date && id) {
      getCourtSlots(id, form.date).then(setSlots).catch(() => setSlots([]));
    }
  }, [id, form.date]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await generateSlots(token, id, form);
      setMessage(`Created ${result.created} of ${result.total} slots`);
      const updated = await getCourtSlots(id, form.date);
      setSlots(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate slots');
    } finally {
      setLoading(false);
    }
  }

  if (!court) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link href="/owner/slots" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" />
        All courts
      </Link>

      <OwnerPageHeader
        title={`${court.sportType ? SPORT_EMOJI[court.sportType as keyof typeof SPORT_EMOJI] : '🏟️'} ${court.name}`}
        description="Generate and view booking slots"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleGenerate} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="font-bold">Generate slots</h2>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="rounded-xl bg-primary-light border border-primary/20 px-4 py-3 text-sm text-primary font-medium">
              ✓ {message}
            </div>
          )}

          <FormField label="Date" id="date">
            <input
              id="date"
              type="date"
              required
              min={todayString()}
              className={inputClassName}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Open (hour)" id="startHour">
              <input
                id="startHour"
                type="number"
                min={0}
                max={23}
                required
                className={inputClassName}
                value={form.startHour}
                onChange={(e) => setForm({ ...form, startHour: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Close (hour)" id="endHour">
              <input
                id="endHour"
                type="number"
                min={1}
                max={23}
                required
                className={inputClassName}
                value={form.endHour}
                onChange={(e) => setForm({ ...form, endHour: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration (min)" id="duration">
              <input
                id="duration"
                type="number"
                min={15}
                step={15}
                required
                className={inputClassName}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
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
          </div>

          <button type="submit" disabled={loading} className={`${buttonClassName} w-full py-3`}>
            {loading ? 'Generating…' : 'Generate slots'}
          </button>
        </form>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-bold mb-4">Slots for {form.date}</h2>
          {slots.length === 0 ? (
            <p className="text-sm text-muted">No slots for this date. Generate above.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <span>
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(Number(slot.price))}</span>
                    {slot.isBooked ? (
                      <OwnerStatusBadge status="CONFIRMED" />
                    ) : slot.isBlocked ? (
                      <OwnerStatusBadge status="CANCELLED" />
                    ) : (
                      <OwnerStatusBadge status="PENDING" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
