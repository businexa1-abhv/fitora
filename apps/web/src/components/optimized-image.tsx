'use client';

import Image from 'next/image';
import { useState } from 'react';

type OptimizedImageProps = {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  fallback?: React.ReactNode;
};

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  fill,
  priority,
  sizes = '(max-width: 768px) 100vw, 400px',
  fallback,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <>{fallback ?? null}</>;
  }

  if (src.startsWith('data:')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      loading={priority ? undefined : 'lazy'}
      onError={() => setError(true)}
    />
  );
}
