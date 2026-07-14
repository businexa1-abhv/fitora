'use client';

import React from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { SPORT_LABELS, SportType } from '@fitora/shared';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';
import { scaleIn } from '@/components/motion';

interface SportChipProps {
  sport: SportType;
  index?: number;
  active?: boolean;
  onClick?: () => void;
  asLink?: boolean;
}

export function SportChip({ sport, index = 0, active, onClick, asLink = true }: SportChipProps): React.JSX.Element {
  const gradient = SPORT_GRADIENTS[sport];
  const emoji = SPORT_EMOJI[sport];
  const label = SPORT_LABELS[sport];

  const content = (
    <motion.div
      custom={index}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer min-w-[100px] ${
        active
          ? 'border-primary bg-primary-light shadow-md'
          : 'border-transparent bg-card hover:border-primary/30 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-sm`}>
        {emoji}
      </div>
      <span className="text-xs font-semibold text-center">{label}</span>
    </motion.div>
  );

  if (asLink && !onClick) {
    return (
      <Link href={`/courts?sport=${sport}`} className="shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
