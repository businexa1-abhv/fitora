export type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
};

function getCdnBaseUrl(): string | undefined {
  return process.env.CDN_BASE_URL?.replace(/\/$/, '');
}

export function resolveCdnUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getCdnBaseUrl();
  if (!base) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function optimizeImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {},
): string | null {
  const resolved = resolveCdnUrl(url);
  if (!resolved) return null;

  const cdnBase = getCdnBaseUrl();
  if (!cdnBase || !resolved.startsWith(cdnBase)) {
    return resolved;
  }

  const params = new URLSearchParams();
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.quality) params.set('q', String(options.quality));
  if (options.format) params.set('f', options.format);

  const query = params.toString();
  return query ? `${resolved}?${query}` : resolved;
}
