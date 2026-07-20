'use client';

import { useState } from 'react';
import type { Booking } from '@fitora/shared';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { cancelBooking, getRefundPreview, type RefundPreview } from '@/lib/courts';

interface CancelBookingDialogProps {
  booking: Booking | null;
  onClose: () => void;
  onCancelled: (bookingId: string) => void;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CancelBookingDialog({ booking, onClose, onCancelled }: CancelBookingDialogProps) {
  const [preview, setPreview] = useState<RefundPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');

  if (!booking) return null;

  async function loadPreview() {
    const token = getAccessToken();
    if (!token || !booking) return;
    setLoadingPreview(true);
    setError('');
    try {
      const data = await getRefundPreview(token, booking.id);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  // Load preview on first render when dialog opens
  if (!preview && !loadingPreview && !error) {
    void loadPreview();
  }

  async function handleCancel() {
    const token = getAccessToken();
    if (!token || !booking) return;
    setCancelling(true);
    setError('');
    setStep('processing');
    try {
      await cancelBooking(token, booking.id, 'Cancelled by player');
      setStep('done');
      onCancelled(booking.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel booking');
      setStep('confirm');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== 'processing' ? onClose : undefined}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {step === 'done' ? (
          <div className="p-8 text-center">
            <span className="text-4xl">✅</span>
            <h2 className="mt-4 text-xl font-bold" id="cancel-dialog-title">
              Booking Cancelled
            </h2>
            {preview && preview.refundAmount > 0 && (
              <p className="mt-2 text-sm text-muted">
                A refund of{' '}
                <strong className="text-primary">{formatPrice(preview.refundAmount)}</strong> will
                be processed within 5–7 business days.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        ) : step === 'processing' ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-semibold">Cancelling your booking…</p>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-lg font-bold" id="cancel-dialog-title">
              Cancel booking?
            </h2>
            <p className="mt-1 text-sm text-muted">
              {booking.court?.name} —{' '}
              {booking.slot
                ? new Date(booking.slot.startTime).toLocaleString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </p>

            {/* Refund summary */}
            <div className="mt-5 rounded-xl border border-border bg-background p-4 space-y-2 text-sm">
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-muted">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                  Calculating refund…
                </div>
              ) : preview ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Original amount</span>
                    <span className="font-semibold">{formatPrice(preview.originalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">
                      Refund ({Math.round(preview.refundPercent * 100)}%)
                    </span>
                    <span className="font-bold text-primary">
                      {formatPrice(preview.refundAmount)}
                    </span>
                  </div>
                  {preview.refundPercent < 1 && (
                    <p className="text-xs text-amber-700 border-t border-border pt-2">
                      ⚠ {preview.policy}
                    </p>
                  )}
                  {preview.refundAmount === 0 && (
                    <p className="text-xs text-red-600 border-t border-border pt-2">
                      This booking is non-refundable at this stage.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted text-sm">Refund details unavailable. Contact support.</p>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
