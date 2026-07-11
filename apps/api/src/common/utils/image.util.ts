const MAX_PRINT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_PRINT_IMAGE_BYTES * 4) / 3);

export function validateBase64Image(dataBase64: string, mimeType: string): void {
  if (!mimeType.startsWith('image/')) {
    throw new Error('Only image files are supported');
  }
  if (dataBase64.length > MAX_BASE64_LENGTH) {
    throw new Error(`Image exceeds maximum size of ${MAX_PRINT_IMAGE_BYTES / (1024 * 1024)}MB`);
  }
}

export function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function toDataUrl(mimeType: string, dataBase64: string): string {
  return `data:${mimeType};base64,${dataBase64}`;
}

export function stripDataUrlPrefix(dataUrl: string): { mimeType: string; dataBase64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { mimeType: 'image/jpeg', dataBase64: dataUrl };
  }
  return { mimeType: match[1], dataBase64: match[2] };
}
