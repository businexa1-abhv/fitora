'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAccessToken } from '@/lib/auth';
import { adjustInventory, getLowStock } from '@/lib/shop';

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<{ products: Product[]; variants: unknown[] }>({ products: [], variants: [] });
  const [adjustQty, setAdjustQty] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setLowStock(await getLowStock(token));
  }

  useEffect(() => {
    load()
      .catch(() => setLowStock({ products: [], variants: [] }))
      .finally(() => setLoading(false));
  }, []);

  async function restock(productId: string) {
    const token = getAccessToken();
    if (!token) return;
    const qty = Number(adjustQty[productId] ?? 10);
    await adjustInventory(token, {
      productId,
      quantityChange: qty,
      type: 'RESTOCK',
      reason: 'Admin restock',
    });
    await load();
  }

  return (
    <div>
      <PageHeader title="Inventory" description="Low stock alerts and stock adjustments" />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid gap-4">
        {lowStock.products.map((p) => (
          <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                Stock: {p.stock} · Threshold: {p.lowStockThreshold ?? 5}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24 h-9"
                placeholder="Qty"
                value={adjustQty[p.id] ?? '10'}
                onChange={(e) => setAdjustQty({ ...adjustQty, [p.id]: e.target.value })}
              />
              <Button size="sm" onClick={() => restock(p.id)}>Restock</Button>
            </div>
          </Card>
        ))}
        {!loading && lowStock.products.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">All products adequately stocked</Card>
        )}
      </div>
    </div>
  );
}
