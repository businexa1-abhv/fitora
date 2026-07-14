'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PaymentInvoice } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { getAccessToken } from '@/lib/auth';
import { getPaymentInvoice } from '@/lib/payment-history';

export default function PaymentInvoicePage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !id) {
      router.replace('/login');
      return;
    }
    getPaymentInvoice(token, id).then(setInvoice).catch(() => router.replace('/payments'));
  }, [id, router]);

  if (!invoice) {
    return (
      <PageShell>
        <Navbar />
        <div className="flex justify-center py-32">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <Link href="/payments" className="text-sm text-muted hover:text-primary mb-6 inline-block">← Payment history</Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm text-muted uppercase tracking-wider">Invoice</p>
              <h1 className="text-2xl font-extrabold mt-1">{invoice.invoiceNumber}</h1>
            </div>
            <p className="text-sm text-muted">{new Date(invoice.issuedAt).toLocaleDateString()}</p>
          </div>
          <p className="font-semibold mb-6">{invoice.description ?? invoice.entityLabel}</p>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>{formatPrice(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tax</span>
              <span>{formatPrice(Number(invoice.tax))}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">{formatPrice(Number(invoice.total))}</span>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
