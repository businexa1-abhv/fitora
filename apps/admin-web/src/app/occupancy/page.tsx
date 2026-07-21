'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { AdminShell, secondaryBtnClass } from '@/components/admin-shell';
import { ApiError, adminApi, getAccessToken, type OccupancyMonitor } from '@/lib/api';
import { getRealtimeSocket } from '@/lib/realtime';

const OCCUPANCY_EVENTS = [
  'slot:updated',
  'slot.updated',
  'slot.created',
  'slot.deleted',
  'slot.blocked',
  'slot.unblocked',
  'slot.closed',
  'slot.booked',
  'slot.cancelled',
  'slot.full',
  'slot.available',
  'booking.confirmed',
  'booking.cancelled',
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function OccupancyPage() {
  const [date, setDate] = useState(today);
  const [monitor, setMonitor] = useState<OccupancyMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setMonitor(await adminApi.getOccupancy(token, date));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load occupancy');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const socket = getRealtimeSocket(token);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void load(), 300);
    };
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    for (const event of OCCUPANCY_EVENTS) socket.on(event, refresh);

    return () => {
      clearTimeout(refreshTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      for (const event of OCCUPANCY_EVENTS) socket.off(event, refresh);
    };
  }, [load]);

  const venues = monitor?.venues ?? [];
  const aggregate =
    venues.length === 0
      ? 0
      : Math.round(venues.reduce((sum, venue) => sum + venue.occupancyPercent, 0) / venues.length);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">Live Occupancy</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                connected ? 'bg-success/15 text-secondary' : 'bg-surface-high text-muted'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-muted'}`} />
              {connected ? 'Live' : 'Connecting'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Platform-wide booking load and slot availability.
            {lastUpdated ? ` Updated ${lastUpdated.toLocaleTimeString()}.` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm"
          />
          <button type="button" className={secondaryBtnClass} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Venues monitored', loading ? '…' : String(venues.length)],
          ['Average occupancy', loading ? '…' : `${aggregate}%`],
          [
            'Available slots',
            loading ? '…' : String(venues.reduce((sum, venue) => sum + venue.availableSlots, 0)),
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {venues.map((venue) => (
          <article
            key={venue.venueId}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{venue.venueName}</h2>
                <p className="text-xs text-muted">
                  {venue.bookedSlots} booked · {venue.availableSlots} available ·{' '}
                  {venue.blockedSlots + venue.maintenanceSlots} unavailable
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-display text-2xl font-bold">{venue.occupancyPercent}%</span>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-high">
              <div
                className={`h-full rounded-full ${
                  venue.occupancyPercent >= 85
                    ? 'bg-error'
                    : venue.occupancyPercent >= 60
                      ? 'bg-warning'
                      : 'bg-success'
                }`}
                style={{ width: `${Math.min(venue.occupancyPercent, 100)}%` }}
              />
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Peak hours</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {venue.peakHours.map((peak) => (
                  <span
                    key={peak.hour}
                    className="rounded-full bg-surface-low px-3 py-1 text-xs font-medium"
                  >
                    {String(peak.hour).padStart(2, '0')}:00 · {peak.occupancyPercent}%
                  </span>
                ))}
                {venue.peakHours.length === 0 && (
                  <span className="text-xs text-muted">No slot activity for this date.</span>
                )}
              </div>
            </div>
          </article>
        ))}
        {!loading && venues.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface-low p-8 text-sm text-muted xl:col-span-2">
            No active venues have slots for this date.
          </div>
        )}
      </div>
    </AdminShell>
  );
}
