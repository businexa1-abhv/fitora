'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionDiv({
  children,
  className,
  variants,
  custom,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  custom?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      custom={custom}
      variants={variants ?? fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}
