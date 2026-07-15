import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fitora/shared', '@fitora/types'],
};

export default nextConfig;
