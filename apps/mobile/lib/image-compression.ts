/**
 * Client-side image compression helpers for mobile uploads.
 */

const MAX_BASE64_LENGTH = Math.ceil((5 * 1024 * 1024 * 4) / 3);

export type CompressedImage = {
  base64: string;
  mimeType: string;
  estimatedBytes: number;
};

export function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function compressBase64Image(base64: string, mimeType: string): CompressedImage {
  if (!base64 || mimeType === 'image/svg+xml') {
    return { base64, mimeType, estimatedBytes: estimateBase64Bytes(base64) };
  }

  const estimatedBytes = estimateBase64Bytes(base64);
  if (estimatedBytes <= 768 * 1024) {
    return { base64, mimeType, estimatedBytes };
  }

  let trimmed = base64;
  if (trimmed.length > MAX_BASE64_LENGTH) {
    trimmed = trimmed.slice(0, Math.floor(MAX_BASE64_LENGTH * 0.95));
  }

  return {
    base64: trimmed,
    mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
    estimatedBytes: estimateBase64Bytes(trimmed),
  };
}
