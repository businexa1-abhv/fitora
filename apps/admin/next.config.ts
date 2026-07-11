import type { NextConfig } from 'next';

const cdnBase = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@fitora/shared'],
  ...(cdnBase ? { assetPrefix: cdnBase } : {}),
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    minimumCacheTTL: 3600,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react', 'recharts'],
  },
};

export default nextConfig;
