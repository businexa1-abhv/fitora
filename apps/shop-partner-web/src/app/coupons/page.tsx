'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type CouponItem } from '@/lib/api';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    shopPartnerApi
      .listCoupons(token)
      .then((res) => setCoupons(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ShopShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Coupons</h1>
        <p className="mt-1 text-sm text-muted">
          Promo and corporate codes scoped to your courts via{' '}
          <code className="text-xs">/memberships/coupons</code>.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Discount</th>
              <th className="px-5 py-4">Usage</th>
              <th className="px-5 py-4">Court</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  Loading coupons…
                </td>
              </tr>
            )}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  No coupons for your courts yet.
                </td>
              </tr>
            )}
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4">
                  <p className="font-semibold">{coupon.code}</p>
                  {coupon.description && <p className="text-xs text-muted">{coupon.description}</p>}
                </td>
                <td className="px-5 py-4">{coupon.codeType}</td>
                <td className="px-5 py-4">
                  {coupon.discountType === 'PERCENTAGE'
                    ? `${coupon.discountValue}%`
                    : `₹${coupon.discountValue}`}
                </td>
                <td className="px-5 py-4">
                  {coupon.usageCount}
                  {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ''}
                </td>
                <td className="px-5 py-4">{coupon.court?.name ?? 'Platform'}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      coupon.isActive ? 'bg-secondary/10 text-secondary' : 'bg-muted/10 text-muted'
                    }`}
                  >
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ShopShell>
  );
}
