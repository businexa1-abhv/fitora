'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAccessToken } from '@/lib/auth';
import { createCoupon, getCoupons } from '@/lib/shop';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ShopCouponsPage() {
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [code, setCode] = useState('');
  const [discountValue, setDiscountValue] = useState('10');
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    const data = await getCoupons(token);
    setCoupons(data.items);
  }

  useEffect(() => {
    load()
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    await createCoupon(token, {
      code,
      codeType: 'PROMO',
      discountType: 'PERCENTAGE',
      discountValue: Number(discountValue),
      appliesTo: 'SHOP_ORDER',
      usageLimit: 100,
    });
    setCode('');
    await load();
  }

  return (
    <div>
      <PageHeader title="Shop coupons" description="Promo codes for the e-commerce store" />

      <Card className="p-6 mb-6">
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium">Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SAVE10" required />
          </div>
          <div>
            <label className="text-xs font-medium">Discount %</label>
            <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>
          <Button type="submit">Create coupon</Button>
        </form>
      </Card>

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={String(c.id)}>
                  <TableCell className="font-medium">{String(c.code)}</TableCell>
                  <TableCell>{String(c.discountValue)}{String(c.discountType) === 'PERCENTAGE' ? '%' : ' ₹'}</TableCell>
                  <TableCell><Badge variant="secondary">{String(c.appliesTo)}</Badge></TableCell>
                  <TableCell>{String(c.usageCount)}/{String(c.usageLimit ?? '∞')}</TableCell>
                  <TableCell><Badge>{c.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
