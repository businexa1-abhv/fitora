'use client';

import { useParams } from 'next/navigation';
import { BookingWidget } from '@/components/booking-widget/booking-widget';

/**
 * Embeddable booking widget — a standalone public route with no app chrome
 * (no AppHeader/sidebar), suitable for iframing on venue websites.
 */
export default function BookingWidgetPage() {
  const { courtId } = useParams<{ courtId: string }>();

  return (
    <main className="min-h-screen flex items-start justify-center px-3 py-6 sm:px-6 sm:py-10">
      <BookingWidget courtId={courtId} />
    </main>
  );
}
