'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Product, ShopCategory } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { FadeUp } from '@/components/motion';
import { getCategories, getProducts } from '@/lib/shop';

function ShopContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts({
      search: search || undefined,
      category: category || undefined,
    })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <>
      <section className="hero-mesh text-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-2">
              Sports shop
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold">Gear, trophies & more</h1>
            <p className="text-white/75 mt-3 max-w-lg">
              Quality sports equipment and accessories delivered to your door.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Link
                href="/shop/cart"
                className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                🛒 Cart
              </Link>
              <Link
                href="/shop/orders"
                className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                My orders
              </Link>
              <Link
                href="/shop/wishlist"
                className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                ♥ Wishlist
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-6">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setCategory('')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                !category ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted hover:border-primary'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.slug)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  category === cat.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border border-border text-muted hover:border-primary'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">🛒</span>
              <p className="text-lg font-semibold mt-4">No products found</p>
              <p className="text-muted text-sm mt-1">Try a different search or category</p>
            </div>
          </FadeUp>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </main>
    </>
  );
}

export default function ShopPage() {
  return (
    <PageShell>
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }
      >
        <ShopContent />
      </Suspense>
    </PageShell>
  );
}
