'use client';

import React from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  SERVICE_CATEGORY_LABELS,
  ServiceCategory,
  type ServiceListing,
} from '@fitora/shared';
import { formatPrice } from '@/components/app-header';
import { SERVICE_EMOJIS, SERVICE_GRADIENTS } from '@/lib/marketplace-constants';

export function ServiceCard({
  listing,
  index = 0,
}: {
  listing: ServiceListing;
  index?: number;
}): React.JSX.Element {
  const emoji = SERVICE_EMOJIS[listing.category as ServiceCategory] ?? '⚙️';
  const gradient = SERVICE_GRADIENTS[listing.category as ServiceCategory] ?? 'from-primary to-emerald-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/services/${listing.id}`}
        className="block rounded-2xl border border-border bg-card overflow-hidden shadow-sm card-hover group"
      >
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
          <span className="text-5xl drop-shadow-md group-hover:scale-110 transition-transform">
            {emoji}
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white">
            {listing.turnaroundDays}d turnaround
          </span>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            {SERVICE_CATEGORY_LABELS[listing.category as ServiceCategory]}
          </p>
          <h3 className="font-bold mt-1 group-hover:text-primary transition-colors line-clamp-1">
            {listing.title}
          </h3>
          {listing.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{listing.description}</p>
          )}
          {listing.averageRating && (
            <span className="text-xs text-amber-600 font-semibold">★ {Number(listing.averageRating).toFixed(1)}</span>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-lg font-extrabold text-primary">
              {formatPrice(Number(listing.price))}
            </span>
            <span className="text-xs text-muted">{listing.city}</span>
          </div>
          {listing.provider && (
            <p className="text-xs text-muted mt-2">
              by {listing.provider.firstName} {listing.provider.lastName}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function ServiceCardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="h-28 bg-muted/30" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 bg-muted/40 rounded" />
        <div className="h-5 w-3/4 bg-muted/40 rounded" />
        <div className="h-4 w-full bg-muted/30 rounded" />
        <div className="h-6 w-1/3 bg-muted/40 rounded" />
      </div>
    </div>
  );
}
