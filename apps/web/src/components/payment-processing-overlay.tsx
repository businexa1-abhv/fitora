'use client';

/**
 * P0-10: Payment processing overlay — shown during Razorpay verify call.
 * Usage: <PaymentProcessingOverlay visible={submitting} />
 */
export function PaymentProcessingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg font-bold text-foreground">Confirming your payment…</p>
        <p className="mt-2 text-sm text-muted">
          Please wait and do not close or refresh this page.
        </p>
        <p className="mt-4 text-xs text-muted/70">
          This usually takes a few seconds. You will be redirected automatically.
        </p>
      </div>
    </div>
  );
}
