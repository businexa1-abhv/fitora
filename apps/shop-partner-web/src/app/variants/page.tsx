'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { ShopShell, primaryBtnClass, secondaryBtnClass } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type ProductVariant, type ShopProduct } from '@/lib/api';
import { formatInr } from '@/lib/format';

export default function VariantsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [colorFilter, setColorFilter] = useState('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});

  const selectedProduct = products.find((p) => p.id === productId);

  const refreshProducts = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    shopPartnerApi
      .listProducts(token)
      .then((items) => {
        setProducts(items);
        if (!productId && items[0]) setProductId(items[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, [productId]);

  const refreshVariants = useCallback(() => {
    if (!productId) {
      setVariants([]);
      return;
    }
    shopPartnerApi
      .listVariants(productId)
      .then((items) => {
        setVariants(items);
        const stocks: Record<string, string> = {};
        for (const v of items) stocks[v.id] = String(v.stock);
        setDraftStock(stocks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load variants'));
  }, [productId]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    refreshVariants();
  }, [refreshVariants]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    for (const v of variants) {
      const c = v.attributes?.color || v.attributes?.Color;
      if (c) set.add(c);
    }
    return ['All', ...Array.from(set)];
  }, [variants]);

  const filtered = variants.filter((v) => {
    if (colorFilter === 'All') return true;
    return (v.attributes?.color || v.attributes?.Color) === colorFilter;
  });

  const skuCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) {
      const sku = (v.sku || '').trim().toLowerCase();
      if (!sku) continue;
      map.set(sku, (map.get(sku) ?? 0) + 1);
    }
    return map;
  }, [variants]);

  const missingDims = variants.filter(
    (v) =>
      !(v.attributes?.size || v.attributes?.Size) || !(v.attributes?.color || v.attributes?.Color),
  ).length;
  const health = variants.length
    ? Math.max(
        0,
        Math.round(
          100 -
            (missingDims / variants.length) * 40 -
            Array.from(skuCounts.values()).filter((n) => n > 1).length * 5,
        ),
      )
    : 100;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  async function saveStock(variant: ProductVariant) {
    const token = getAccessToken();
    if (!token || !productId) return;
    const next = Number(draftStock[variant.id] ?? variant.stock);
    if (Number.isNaN(next)) return;
    const delta = next - variant.stock;
    if (delta === 0) return;
    try {
      await shopPartnerApi.adjustInventory(token, {
        productId,
        variantId: variant.id,
        quantityChange: delta,
        type: 'ADJUSTMENT',
        reason: 'Variant manager stock update',
      });
      refreshVariants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock update failed');
    }
  }

  async function addVariant() {
    const token = getAccessToken();
    if (!token || !productId) return;
    try {
      await shopPartnerApi.createVariant(token, productId, {
        name: `Variant ${variants.length + 1}`,
        sku: `${selectedProduct?.sku || 'SKU'}-${variants.length + 1}`,
        stock: 0,
        price: Number(selectedProduct?.price ?? 0) || undefined,
        attributes: { color: 'Default', size: 'M' },
      });
      refreshVariants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create variant failed');
    }
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map((v) => v.id)) : new Set());
  }

  return (
    <ShopShell>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Catalog · Apparel · {selectedProduct?.name ?? 'Product'}
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Product Variant Manager</h1>
          <p className="mt-1 text-sm text-muted">
            Product ID: {selectedProduct?.sku || selectedProduct?.id?.slice(0, 8) || '—'} · Manage
            SKUs, pricing, and stock.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondaryBtnClass}>
            CSV Import
          </button>
          <button type="button" className={primaryBtnClass} onClick={() => void addVariant()}>
            <Plus className="h-4 w-4" /> Add Variant
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-muted">In Stock</p>
          <p className="text-xl font-bold">{totalStock}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-muted">Active Variants</p>
          <p className="text-xl font-bold">{variants.filter((v) => v.isActive).length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-muted">Variant Health</p>
          <p className="text-xl font-bold text-primary">{health}%</p>
          {missingDims > 0 && (
            <p className="text-[11px] text-warning">{missingDims} SKUs missing dimensions</p>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted">Filter by:</span>
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColorFilter(c)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              colorFilter === c
                ? 'bg-primary-container text-white'
                : 'border border-border bg-white text-muted'
            }`}
          >
            {c}
          </button>
        ))}
        {selected.size > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {selected.size} selected · Bulk Pricing / Update Stock
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  onChange={(e) => toggleAll(e.target.checked)}
                  checked={filtered.length > 0 && filtered.every((v) => selected.has(v.id))}
                />
              </th>
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-muted">
                  No variants for this product yet.
                </td>
              </tr>
            )}
            {filtered.map((variant) => {
              const sku = (variant.sku || '').trim().toLowerCase();
              const duplicate = sku && (skuCounts.get(sku) ?? 0) > 1;
              const color = variant.attributes?.color || variant.attributes?.Color || '—';
              const size = variant.attributes?.size || variant.attributes?.Size || '—';
              return (
                <tr key={variant.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(variant.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(variant.id);
                          else next.delete(variant.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">{variant.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{variant.sku ?? '—'}</span>
                      {duplicate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Duplicate SKU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{color}</td>
                  <td className="px-4 py-3">{size}</td>
                  <td className="px-4 py-3">
                    {variant.price != null
                      ? formatInr(variant.price)
                      : formatInr(Number(selectedProduct?.price ?? 0))}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-20 rounded-lg border border-border px-2 py-1 text-sm"
                      value={draftStock[variant.id] ?? String(variant.stock)}
                      onChange={(e) =>
                        setDraftStock((prev) => ({ ...prev, [variant.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs font-bold text-primary"
                      onClick={() => void saveStock(variant)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Showing {filtered.length} of {variants.length} variants
      </p>
    </ShopShell>
  );
}
