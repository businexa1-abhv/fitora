'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SERVICE_CATEGORY_LABELS, ServiceCategory, type ServiceListing } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { createListing, getMyListings } from '@/lib/marketplace';
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace-constants';

export default function ProviderListingsPage() {
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: ServiceCategory.STRINGING,
    title: '',
    description: '',
    price: '',
    city: '',
    sportSlug: '',
    turnaroundDays: '3',
  });

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setListings(await getMyListings(token));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    await createListing(token, {
      category: form.category,
      title: form.title,
      description: form.description || undefined,
      price: Number(form.price),
      city: form.city,
      sportSlug: form.sportSlug || undefined,
      turnaroundDays: Number(form.turnaroundDays) || 3,
    });
    setShowForm(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Service listings"
        description="Offer stringing, repairs, grip replacement, and equipment rental"
        actions={<button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add listing</button>}
      />

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 grid gap-4 sm:grid-cols-2">
          <select
            required
            className="rounded-xl border border-border px-3 py-2 text-sm sm:col-span-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}
          >
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{SERVICE_CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <input required placeholder="Title" className="rounded-xl border border-border px-3 py-2 text-sm sm:col-span-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input required type="number" placeholder="Price (₹)" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input required placeholder="City" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input placeholder="Sport slug (optional)" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.sportSlug} onChange={(e) => setForm({ ...form, sportSlug: e.target.value })} />
          <textarea placeholder="Description" className="sm:col-span-2 rounded-xl border border-border px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className="btn-primary sm:col-span-2">Create listing</button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-primary uppercase">{SERVICE_CATEGORY_LABELS[l.category]}</p>
            <p className="font-bold mt-1">{l.title}</p>
            <p className="text-sm text-muted mt-1">{l.city} · ₹{l.price} · {l.turnaroundDays}d</p>
            {l.averageRating && <p className="text-xs mt-1">★ {Number(l.averageRating).toFixed(1)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
