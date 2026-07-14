'use client';

import React from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { SPORT_LABELS, SportType, type Court } from '@fitora/shared';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';
import { OptimizedImage } from '@/components/optimized-image';
import { scaleIn } from '@/components/motion';

interface CourtCardProps {
  court: Court;
  index?: number;
}

export function CourtCard({ court, index = 0 }: CourtCardProps): React.JSX.Element {
  const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
  const gradient = SPORT_GRADIENTS[sport] ?? SPORT_GRADIENTS[SportType.OTHER];
  const emoji = SPORT_EMOJI[sport] ?? '🏟️';
  const courtImages = (court as Court & { images?: { url?: string; thumbnailUrl?: string }[] }).images;
  const imageUrl = courtImages?.find((i) => i.url)?.thumbnailUrl ?? courtImages?.[0]?.url;

  return (
    <motion.div custom={index} variants={scaleIn} initial="hidden" animate="visible">
      <Link href={`/courts/${court.id}`} className="block group">
        <article className="card-hover rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
            {imageUrl ? (
              <OptimizedImage
                src={imageUrl}
                alt={court.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, 350px"
                fallback={
                  <span className="text-6xl opacity-90 group-hover:scale-110 transition-transform duration-300">
                    {emoji}
                  </span>
                }
              />
            ) : (
              <span className="text-6xl opacity-90 group-hover:scale-110 transition-transform duration-300">
                {emoji}
              </span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            <span className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-foreground">
              {SPORT_LABELS[sport]}
            </span>
          </div>

          <div className="p-5">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
              {court.name}
            </h3>
            <p className="text-sm text-muted mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {court.city}
            </p>
            <p className="text-sm text-muted mt-2 line-clamp-2">
              {court.description || court.address}
            </p>
            {court.amenities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {court.amenities.slice(0, 3).map((a) => (
                  <span key={a} className="rounded-full bg-primary-light text-primary px-2.5 py-0.5 text-xs font-medium">
                    {a}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted">Tap to book slots</span>
              <span className="text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Book →
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

export function CourtCardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="h-36 skeleton" />
      <div className="p-5 space-y-3">
        <div className="h-5 skeleton rounded-lg w-3/4" />
        <div className="h-4 skeleton rounded-lg w-1/2" />
        <div className="h-4 skeleton rounded-lg w-full" />
      </div>
    </div>
  );
}
