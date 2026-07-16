'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type ShopProduct } from '@/lib/api';
import { formatInr } from '@/lib/format';

export default function ProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    shopPartnerApi
      .listProducts(token)
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ShopShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted">Catalog items scoped to your tenant shop.</p>
        </div>
        <p className="text-sm text-muted">{products.length} products</p>
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
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">SKU</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  Loading products…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  No products yet. Add catalog items via admin or API.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-muted">{product.slug}</p>
                </td>
                <td className="px-5 py-4 text-muted">{product.sku ?? '—'}</td>
                <td className="px-5 py-4">{product.category?.name ?? '—'}</td>
                <td className="px-5 py-4">{formatInr(Number(product.price))}</td>
                <td className="px-5 py-4">
                  <span
                    className={
                      product.stock <= product.lowStockThreshold ? 'font-semibold text-warning' : ''
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      product.isActive ? 'bg-secondary/10 text-secondary' : 'bg-muted/10 text-muted'
                    }`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
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
