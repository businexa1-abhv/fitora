'use client';

import { useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import type { Product, ShopCategory } from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAccessToken } from '@/lib/auth';
import {
  createProduct,
  getAdminCategories,
  getAdminProducts,
  updateProduct,
} from '@/lib/shop';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    stock: '10',
    description: '',
  });

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    const [prods, cats] = await Promise.all([
      getAdminProducts(token),
      getAdminCategories(token),
    ]);
    setProducts(prods);
    setCategories(cats);
    if (cats[0] && !form.categoryId) setForm((f) => ({ ...f, categoryId: cats[0].id }));
  }

  useEffect(() => {
    load()
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.category).toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    await createProduct(token, {
      name: form.name,
      categoryId: form.categoryId,
      price: Number(form.price),
      stock: Number(form.stock),
      description: form.description || undefined,
    });
    setShowForm(false);
    setForm({ name: '', categoryId: categories[0]?.id ?? '', price: '', stock: '10', description: '' });
    await load();
  }

  async function toggleActive(product: Product) {
    const token = getAccessToken();
    if (!token) return;
    await updateProduct(token, product.id, { isActive: !product.isActive });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="E-commerce catalog management"
        searchPlaceholder="Search products…"
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add product
          </Button>
        }
      />

      {showForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button type="submit">Create product</Button>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.categoryDetail?.name ?? p.category}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(p.price))}</TableCell>
                  <TableCell>
                    <span className={p.stock === 0 ? 'text-destructive font-medium' : ''}>{p.stock}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
