'use client';

import React from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CATEGORY_LABELS, type Product, type ProductCategory, type SportType } from '@fitora/shared';
import { formatPrice } from '@/components/app-header';
import { OptimizedImage } from '@/components/optimized-image';
import { scaleIn } from '@/components/motion';
import { productEmoji, productGradient } from '@/lib/shop-constants';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }): React.JSX.Element {
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
  const imageUrl = product.images?.[0] ?? (product as { imageDetails?: { url: string }[] }).imageDetails?.[0]?.url;

  return (
    <motion.div custom={index} variants={scaleIn} initial="hidden" animate="visible">
      <Link href={`/shop/${product.slug}`} className="block group">
        <article className="card-hover rounded-2xl bg-card border border-border overflow-hidden shadow-sm h-full flex flex-col">
          <div className={`relative h-40 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
            {imageUrl ? (
              <OptimizedImage
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, 300px"
                fallback={
                  <span className="text-5xl opacity-90 group-hover:scale-110 transition-transform duration-300">
                    {emoji}
                  </span>
                }
              />
            ) : (
              <span className="text-5xl opacity-90 group-hover:scale-110 transition-transform duration-300">
                {emoji}
              </span>
            )}
            {onSale && (
              <span className="absolute top-3 left-3 rounded-full bg-red-500 text-white px-2.5 py-0.5 text-xs font-bold">
                Sale
              </span>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <span className="absolute top-3 right-3 rounded-full bg-amber-400 text-amber-950 px-2.5 py-0.5 text-xs font-bold">
                Low stock
              </span>
            )}
            {product.stock === 0 && (
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground">
                  Out of stock
                </span>
              </span>
            )}
          </div>

          <div className="p-4 flex flex-col flex-1">
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">
              {product.categoryDetail?.name ??
                CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] ??
                String(product.category)}
            </p>
            <h3 className="font-bold mt-1 group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
            <div className="mt-auto pt-3 flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-primary">{formatPrice(product.price)}</span>
              {onSale && (
                <span className="text-sm text-muted line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

export function ProductCardSkeleton(): React.JSX.Element {
  return <div className="h-72 rounded-2xl skeleton" />;
}
