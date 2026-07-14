'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Wishlist } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { getAccessToken } from '@/lib/auth';
import { addToCart, getWishlist, removeWishlistItem } from '@/lib/shop';

export default function WishlistPage(): React.JSX.Element {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getWishlist(token)
      .then(setWishlist)
      .catch(() => setWishlist(null))
      .finally(() => setLoading(false));
  }, [router]);

  async function moveToCart(productId: string, variantId?: string | null) {
    const token = getAccessToken();
    if (!token) return;
    await addToCart(token, productId, 1, variantId ?? undefined);
    router.push('/shop/cart');
  }

  async function remove(itemId: string) {
    const token = getAccessToken();
    if (!token) return;
    const updated = await removeWishlistItem(token, itemId);
    setWishlist(updated);
  }

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-extrabold mb-6">Wishlist</h1>
        {loading && <div className="h-32 rounded-2xl skeleton" />}
        {!loading && wishlist?.items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-muted">Your wishlist is empty</p>
            <Link href="/shop" className="text-primary font-semibold mt-3 inline-block">Browse shop</Link>
          </div>
        )}
        <div className="space-y-4">
          {wishlist?.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href={`/shop/${item.product?.slug}`} className="font-semibold hover:text-primary">
                  {item.product?.name}
                </Link>
                {item.variant && <p className="text-sm text-muted">{item.variant.name}</p>}
                <p className="text-primary font-bold mt-1">{formatPrice(item.product?.price ?? 0)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => moveToCart(item.productId, item.variantId)}
                  className="btn-primary text-sm"
                >
                  Add to cart
                </button>
                <button onClick={() => remove(item.id)} className="rounded-xl border border-border px-4 py-2 text-sm">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
