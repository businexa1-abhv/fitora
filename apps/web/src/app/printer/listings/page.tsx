'use client';

import React from 'react';

import { FormEvent, useEffect, useState } from 'react';
import type { PrintListing } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { createPrintListing, getMyPrintListings } from '@/lib/print';

export default function PrinterListingsPage(): React.JSX.Element {
  const [listings, setListings] = useState<PrintListing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '', city: '', minQuantity: '1', turnaroundDays: '5' });

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setListings(await getMyPrintListings(token));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    await createPrintListing(token, {
      title: form.title,
      description: form.description || undefined,
      price: Number(form.price),
      city: form.city,
      minQuantity: Number(form.minQuantity) || 1,
      turnaroundDays: Number(form.turnaroundDays) || 5,
    });
    setShowForm(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Print listings"
        description="Services you offer for t-shirt printing"
        actions={<button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add listing</button>}
      />

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 grid gap-4 sm:grid-cols-2">
          <input required placeholder="Title" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input required type="number" placeholder="Price per shirt" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input required placeholder="City" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input type="number" placeholder="Min quantity" className="rounded-xl border border-border px-3 py-2 text-sm" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
          <textarea placeholder="Description" className="sm:col-span-2 rounded-xl border border-border px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className="btn-primary sm:col-span-2">Create listing</button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-bold">{l.title}</p>
            <p className="text-sm text-muted mt-1">{l.city} · ₹{l.price}/shirt · min {l.minQuantity}</p>
            <p className="text-xs mt-2">{l.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
