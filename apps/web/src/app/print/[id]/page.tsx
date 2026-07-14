'use client';

import React from 'react';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TSHIRT_COLOR_OPTIONS, TSHIRT_SIZE_OPTIONS, type PrintListing } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { TshirtPreview } from '@/components/print/tshirt-preview';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { completePayment } from '@/lib/payments';
import { colorHex } from '@/lib/printer-utils';
import { fileToBase64, getPrintListing, placePrintOrder, uploadDesign } from '@/lib/print';

export default function PrintOrderPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [listing, setListing] = useState<PrintListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [designUrl, setDesignUrl] = useState('');
  const [form, setForm] = useState({
    tshirtSize: 'M',
    tshirtColor: 'White',
    quantity: '1',
    customText: '',
    pickupAddress: '',
    pickupPhone: '',
    pickupCity: '',
    customerNotes: '',
  });

  useEffect(() => {
    if (!id) return;
    getPrintListing(id).then(setListing).catch(() => router.replace('/print')).finally(() => setLoading(false));
  }, [id, router]);

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const payload = await fileToBase64(file);
      const design = await uploadDesign(token, payload);
      setDesignUrl(design.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user || !listing || !designUrl) {
      if (!designUrl) setError('Please upload a design first');
      else router.push('/login');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { order, payment } = await placePrintOrder(token, listing.id, {
        designUrl,
        tshirtSize: form.tshirtSize,
        tshirtColor: form.tshirtColor,
        quantity: Number(form.quantity) || 1,
        customText: form.customText || undefined,
        pickupAddress: form.pickupAddress,
        pickupPhone: form.pickupPhone,
        pickupCity: form.pickupCity,
        customerNotes: form.customerNotes || undefined,
      });
      await completePayment(token, payment, user.email, `${user.firstName} ${user.lastName}`, `Print order ${order.orderNumber}`);
      router.push('/print/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  const qty = Number(form.quantity) || 1;
  const total = listing ? Number(listing.price) * qty : 0;

  if (loading || !listing) {
    return (
      <PageShell>
        <Navbar />
        <div className="flex items-center justify-center py-32"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <Link href="/print" className="text-sm text-muted hover:text-primary">← Back to print shop</Link>
        <h1 className="text-2xl font-extrabold mt-4">{listing.title}</h1>
        <p className="text-muted text-sm mt-1">{listing.city} · {formatPrice(listing.price)} per shirt · min {listing.minQuantity}</p>

        <div className="grid gap-8 lg:grid-cols-2 mt-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <TshirtPreview
              designUrl={designUrl}
              colorHex={colorHex(form.tshirtColor)}
              customText={form.customText}
              size="lg"
            />
          </div>

          <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
            {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

            <FormField label="Upload design" id="design">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border py-8 text-sm font-semibold hover:border-primary">
                {uploading ? 'Uploading…' : designUrl ? '✓ Design uploaded — click to replace' : 'Choose image (PNG, JPG)'}
              </button>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Size" id="size">
                <select id="size" className={inputClassName} value={form.tshirtSize} onChange={(e) => setForm({ ...form, tshirtSize: e.target.value })}>
                  {TSHIRT_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Quantity" id="qty">
                <input id="qty" type="number" min={listing.minQuantity} className={inputClassName} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </FormField>
            </div>

            <FormField label="T-shirt color" id="color">
              <div className="flex flex-wrap gap-2 mt-1">
                {TSHIRT_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setForm({ ...form, tshirtColor: c.name })}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${form.tshirtColor === c.name ? 'border-primary bg-primary-light' : 'border-border'}`}
                  >
                    <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Custom text (optional)" id="text">
              <input id="text" className={inputClassName} value={form.customText} onChange={(e) => setForm({ ...form, customText: e.target.value })} placeholder="Team name" />
            </FormField>

            <FormField label="Pickup address" id="addr">
              <textarea id="addr" required rows={2} className={inputClassName} value={form.pickupAddress} onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Phone" id="phone">
                <input id="phone" required className={inputClassName} value={form.pickupPhone} onChange={(e) => setForm({ ...form, pickupPhone: e.target.value })} />
              </FormField>
              <FormField label="City" id="city">
                <input id="city" required className={inputClassName} value={form.pickupCity} onChange={(e) => setForm({ ...form, pickupCity: e.target.value })} />
              </FormField>
            </div>

            <div className="rounded-xl bg-primary-light/50 p-4 flex justify-between font-semibold">
              <span>Total ({qty} shirts)</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>

            <button type="submit" disabled={submitting || !designUrl} className={`${buttonClassName} w-full py-3 disabled:opacity-60`}>
              {submitting ? 'Processing…' : `Pay ${formatPrice(total)}`}
            </button>
          </motion.form>
        </div>
      </main>
    </PageShell>
  );
}
