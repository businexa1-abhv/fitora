'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgeCheck, Building2, Plus, Tag, Users } from 'lucide-react';
import type { Coupon, MembershipDashboard, MembershipPlan } from '@fitora/shared';
import { DURATION_LABELS } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { OwnerStatusBadge } from '@/components/owner/owner-status-badge';
import { getAccessToken } from '@/lib/auth';
import {
  getMembershipDashboard,
  getMyMembershipPlans,
  listCoupons,
} from '@/lib/memberships';
import { formatCurrency } from '@/lib/owner-utils';

type Tab = 'overview' | 'plans' | 'coupons';

export default function OwnerMembershipsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<MembershipDashboard | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    Promise.all([
      getMembershipDashboard(token),
      getMyMembershipPlans(token),
      listCoupons(token),
    ])
      .then(([dash, planList, couponList]) => {
        setDashboard(dash);
        setPlans(planList);
        setCoupons(couponList.items);
      })
      .catch(() => {
        setDashboard(null);
        setPlans([]);
        setCoupons([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'plans', label: 'Plans' },
    { id: 'coupons', label: 'Promo & Corporate' },
  ];

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Memberships"
        description="Plans, subscribers, promo codes & corporate discounts"
        actions={
          <Link href="/owner/courts" className="btn-outline flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add plan
          </Link>
        }
      />

      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl skeleton" />
          ))}
        </div>
      )}

      {!loading && tab === 'overview' && dashboard && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OwnerStatCard
              label="Active subscribers"
              value={String(dashboard.activeSubscribers)}
              icon={Users}
            />
            <OwnerStatCard
              label="Total revenue"
              value={formatCurrency(dashboard.totalRevenue)}
              icon={BadgeCheck}
            />
            <OwnerStatCard
              label="Expiring soon (7d)"
              value={String(dashboard.expiringSoon)}
              icon={Building2}
            />
            <OwnerStatCard
              label="Active codes"
              value={String(dashboard.promoCodesActive + dashboard.corporateCodesActive)}
              icon={Tag}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
            <h2 className="font-bold mb-4">Top plans by subscribers</h2>
            {dashboard.topPlans.length === 0 ? (
              <p className="text-sm text-muted">No plans yet. Create one from a court page.</p>
            ) : (
              <div className="space-y-3">
                {dashboard.topPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-xs text-muted">
                        {plan.court?.name} · {plan.durationLabel ?? DURATION_LABELS[plan.duration]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(plan.price))}</p>
                      <p className="text-xs text-muted">{plan.activeSubscribers ?? 0} active</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
            <h2 className="font-bold mb-3">Supported durations</h2>
            <div className="flex flex-wrap gap-2">
              {dashboard.durationOptions.map((d) => (
                <span
                  key={d.value}
                  className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary"
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && tab === 'plans' && (
        <>
          {plans.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <BadgeCheck className="h-10 w-10 mx-auto text-muted opacity-50" />
              <p className="text-lg font-semibold mt-4">No membership plans yet</p>
              <Link href="/owner/courts" className="btn-primary mt-6 inline-flex">
                Go to courts
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-primary-light/40 border-b border-border">
                    <tr>
                      <th className="text-left px-5 py-3.5 font-semibold">Plan</th>
                      <th className="text-left px-5 py-3.5 font-semibold">Court</th>
                      <th className="text-left px-5 py-3.5 font-semibold">Duration</th>
                      <th className="text-left px-5 py-3.5 font-semibold">Discount</th>
                      <th className="text-left px-5 py-3.5 font-semibold">Max bookings</th>
                      <th className="text-left px-5 py-3.5 font-semibold">Price</th>
                      <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="border-b border-border last:border-0 hover:bg-primary-light/10"
                      >
                        <td className="px-5 py-4 font-medium">{plan.name}</td>
                        <td className="px-5 py-4 text-muted">{plan.court?.name ?? '—'}</td>
                        <td className="px-5 py-4">
                          {plan.durationLabel ?? DURATION_LABELS[plan.duration]}
                        </td>
                        <td className="px-5 py-4">
                          {plan.benefits?.bookingDiscountPercent ?? 10}%
                        </td>
                        <td className="px-5 py-4">{plan.maxBookings ?? 'Unlimited'}</td>
                        <td className="px-5 py-4 font-semibold">
                          {formatCurrency(Number(plan.price))}
                        </td>
                        <td className="px-5 py-4">
                          <OwnerStatusBadge status={plan.isActive ? 'ACTIVE' : 'CANCELLED'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && tab === 'coupons' && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">
              No promo or corporate codes yet. Create them via the API or admin tools.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary-light/40 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold">Code</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Type</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Discount</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Usage</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Court</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-primary-light/10"
                    >
                      <td className="px-5 py-4 font-mono font-semibold">{c.code}</td>
                      <td className="px-5 py-4">
                        {c.codeType === 'CORPORATE' ? (
                          <span className="text-xs font-semibold text-blue-600">
                            Corporate{c.companyName ? ` · ${c.companyName}` : ''}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">Promo</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {c.discountType === 'PERCENTAGE'
                          ? `${c.discountValue}%`
                          : formatCurrency(Number(c.discountValue))}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {c.usageCount}
                        {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      </td>
                      <td className="px-5 py-4 text-muted">{c.court?.name ?? 'All courts'}</td>
                      <td className="px-5 py-4">
                        <OwnerStatusBadge status={c.isActive ? 'ACTIVE' : 'CANCELLED'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
