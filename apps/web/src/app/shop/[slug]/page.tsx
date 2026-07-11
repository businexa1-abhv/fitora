'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_LABELS, type Product, type ProductCategory, type SportType } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getAccessToken } from '@/lib/auth';
import { addToCart, getProduct } from '@/lib/shop';
import { productEmoji, productGradient } from '@/lib/shop-constants';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    getProduct(slug)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleAddToCart() {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }
    if (!product) return;

    setAdding(true);
    try {
      await addToCart(token, product.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-32">
          <p className="text-muted">Product not found</p>
          <Link href="/shop" className="text-primary font-semibold mt-4 hover:underline">
            ← Back to shop
          </Link>
        </div>
      </PageShell>
    );
  }

  const emoji = productEmoji(
    product.category as ProductCategory,
    product.sportType as SportType | undefined,
  );
  const gradient = productGradient(
    product.category as ProductCategory,
    product.sportType as SportType | undefined,
  );
  const onSale =
    product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);

  return (
    <PageShell>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link href="/shop" className="text-sm text-muted hover:text-primary font-medium mb-6 inline-block">
          ← Back to shop
        </Link>

        <FadeUp>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className={`rounded-2xl bg-gradient-to-br ${gradient} h-72 sm:h-96 flex items-center justify-center shadow-lg`}>
              <span className="text-8xl sm:text-9xl opacity-90">{emoji}</span>
            </div>

            <div>
              <p className="text-sm text-primary font-semibold uppercase tracking-wider">
                {CATEGORY_LABELS[product.category as ProductCategory]}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{product.name}</h1>

              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl font-extrabold text-primary">{formatPrice(product.price)}</span>
                {onSale && (
                  <>
                    <span className="text-lg text-muted line-through">
                      {formatPrice(product.compareAtPrice!)}
                    </span>
                    <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-bold">
                      Save {Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {product.description && (
                <p className="text-muted mt-4 leading-relaxed">{product.description}</p>
              )}

              <p className="text-sm mt-4">
                {product.stock > 0 ? (
                  <span className="text-primary font-semibold">{product.stock} in stock</span>
                ) : (
                  <span className="text-red-600 font-semibold">Out of stock</span>
                )}
              </p>

              {product.stock > 0 && (
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <div className="flex items-center rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-4 py-2.5 text-lg font-bold hover:bg-primary-light transition-colors"
                    >
                      −
                    </button>
                    <span className="px-4 py-2.5 font-bold min-w-[3rem] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="px-4 py-2.5 text-lg font-bold hover:bg-primary-light transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="flex-1 min-w-[200px] rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {adding ? 'Adding…' : added ? '✓ Added to cart' : 'Add to cart'}
                  </motion.button>
                </div>
              )}

              <Link
                href="/shop/cart"
                className="inline-block mt-4 text-sm text-primary font-semibold hover:underline"
              >
                View cart →
              </Link>
            </div>
          </div>
        </FadeUp>
      </main>
    </PageShell>
  );
}
