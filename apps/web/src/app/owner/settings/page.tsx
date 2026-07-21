'use client';

import { useEffect, useState } from 'react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { FormField, inputClassName, buttonClassName } from '@/components/auth-layout';
import { OwnerStatusBadge } from '@/components/owner/owner-status-badge';
import { getStoredUser, getAccessToken } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/owner-utils';
import {
  getMySubscription,
  getSubscriptionPlans,
  purchaseSubscription,
  getTenantMe,
  type OwnerSubscription,
  type SubscriptionPlan,
  type TenantInfo,
} from '@/lib/owner-api';
import { completePayment } from '@/lib/payments';

// ─── helpers ────────────────────────────────────────────────────────────────

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function gstPercent(rate: number): string {
  return `${Math.round(rate <= 1 ? rate * 100 : rate)}%`;
}

// ─── Subscription skeleton ───────────────────────────────────────────────────

function SubscriptionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-40 rounded bg-border" />
      <div className="h-4 w-56 rounded bg-border" />
      <div className="h-4 w-32 rounded bg-border" />
    </div>
  );
}

// ─── Subscription section ────────────────────────────────────────────────────

function SubscriptionSection() {
  const user = getStoredUser();
  const token = getAccessToken();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // purchase state
  const [purchasing, setPurchasing] = useState<string | null>(null); // planId being purchased
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    Promise.all([getMySubscription(token), getSubscriptionPlans(token), getTenantMe(token)])
      .then(([sub, ps, t]) => {
        setSubscription(sub);
        setPlans(ps ?? []);
        setTenant(t);
      })
      .catch(() => setError('Failed to load subscription info.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handlePurchase(plan: SubscriptionPlan) {
    if (!token || !tenant) return;
    setPurchaseError(null);
    setPurchasing(plan.id);
    try {
      const { payment } = await purchaseSubscription(token, plan.id, tenant.id);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Owner';
      const userEmail = user?.email ?? '';
      await completePayment(token, payment, userEmail, userName, `FitOra — ${plan.name}`);
      // Refresh subscription
      const updated = await getMySubscription(token);
      setSubscription(updated);
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (msg !== 'Payment cancelled') {
        setPurchaseError(msg);
      }
    } finally {
      setPurchasing(null);
    }
  }

  if (!token) {
    return <p className="text-sm text-muted">Sign in to view subscription details.</p>;
  }

  if (loading) {
    return <SubscriptionSkeleton />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const days = subscription ? daysRemaining(subscription.endDate) : null;
  const isGrace = subscription?.status === 'GRACE';
  const isExpired =
    subscription?.status === 'EXPIRED' || subscription?.status === 'PENDING_PAYMENT';

  return (
    <div className="space-y-5">
      {/* ── Status card ── */}
      {subscription ? (
        <div
          className={`rounded-xl border p-4 ${
            isExpired
              ? 'border-red-200 bg-red-50'
              : isGrace
                ? 'border-amber-200 bg-amber-50'
                : 'border-border bg-background'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {subscription.plan?.name ?? 'Current plan'}
              </p>
              {subscription.endDate && (
                <p className="text-xs text-muted">
                  Expires {formatDate(subscription.endDate)}
                  {days !== null && (
                    <span
                      className={`ml-2 font-semibold ${
                        days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-primary'
                      }`}
                    >
                      ({days === 0 ? 'today' : `${days}d left`})
                    </span>
                  )}
                </p>
              )}
              {isGrace && subscription.graceEndsAt && (
                <p className="text-xs text-amber-700 font-medium">
                  Grace period ends {formatDate(subscription.graceEndsAt)}
                </p>
              )}
            </div>
            <OwnerStatusBadge status={subscription.status} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted">No active subscription found.</p>
        </div>
      )}

      {/* ── Plans ── */}
      {plans.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Available plans</p>

          {plans.map((plan) => {
            const isCurrent = subscription?.plan?.id === plan.id && !isExpired;
            const isLoading = purchasing === plan.id;

            return (
              <div
                key={plan.id}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                  isCurrent ? 'border-primary/40 bg-primary-light' : 'border-border'
                }`}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted">
                    {plan.durationDays} days validity
                    {plan.gstRate ? ` · incl. ${gstPercent(plan.gstRate)} GST` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-base font-extrabold text-primary">
                    {formatCurrency(plan.total)}
                  </p>
                  {isCurrent ? (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!!purchasing}
                      onClick={() => handlePurchase(plan)}
                      className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? 'Processing…' : isExpired || !subscription ? 'Renew' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Feedback ── */}
      {purchaseError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {purchaseError}
        </div>
      )}
      {purchaseSuccess && (
        <div className="rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-sm text-primary font-medium">
          Subscription activated successfully!
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OwnerSettingsPage() {
  const user = getStoredUser();
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl">
      <OwnerPageHeader
        title="Settings"
        description="Manage your court owner account and preferences"
      />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="font-bold">Business profile</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First name" id="firstName">
              <input id="firstName" className={inputClassName} defaultValue={user?.firstName} />
            </FormField>
            <FormField label="Last name" id="lastName">
              <input id="lastName" className={inputClassName} defaultValue={user?.lastName} />
            </FormField>
          </div>

          <FormField label="Email" id="email">
            <input
              id="email"
              type="email"
              className={inputClassName}
              defaultValue={user?.email}
              disabled
            />
          </FormField>

          <FormField label="Business name" id="business">
            <input
              id="business"
              className={inputClassName}
              placeholder="Your sports business name"
            />
          </FormField>

          <FormField label="Payout UPI / Bank" id="payout">
            <input id="payout" className={inputClassName} placeholder="UPI ID or account number" />
          </FormField>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="font-bold">Notifications</h2>

          {[
            { label: 'New booking alerts', desc: 'Email when a player books a slot' },
            { label: 'Payment confirmations', desc: 'Notify on successful payments' },
            { label: 'Membership renewals', desc: 'Alert when memberships are expiring' },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between gap-4 cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5 rounded accent-primary" />
            </label>
          ))}
        </div>

        {saved && (
          <div className="rounded-xl bg-primary-light border border-primary/20 px-4 py-3 text-sm text-primary font-medium">
            Settings saved successfully
          </div>
        )}

        <button type="submit" className={buttonClassName}>
          Save settings
        </button>
      </form>

      {/* Subscription section — outside form so its buttons don't trigger form submit */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="font-bold">Subscription</h2>
        <SubscriptionSection />
      </div>
    </div>
  );
}
