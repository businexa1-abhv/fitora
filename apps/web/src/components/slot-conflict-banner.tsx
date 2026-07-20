'use client';

import Link from 'next/link';

interface SlotConflictBannerProps {
  onRefresh: () => void;
  courtId?: string;
}

/**
 * P0-7: Slot conflict error — shown when POST /bookings returns 409 (slot already booked).
 */
export function SlotConflictBanner({ onRefresh, courtId }: SlotConflictBannerProps) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
      <span className="text-3xl">⚡</span>
      <h3 className="mt-3 text-lg font-bold text-red-800">Slot just got booked</h3>
      <p className="mt-1 text-sm text-red-700">
        Someone else confirmed this slot milliseconds before you. Choose another time.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          ↻ Refresh availability
        </button>
        {courtId && (
          <Link
            href={`/courts/${courtId}/waitlist`}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Join waitlist
          </Link>
        )}
      </div>
    </div>
  );
}
