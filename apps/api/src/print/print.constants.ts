export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export const TSHIRT_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Royal Blue', hex: '#1565c0' },
  { name: 'Grey', hex: '#9e9e9e' },
  { name: 'Maroon', hex: '#6d1b1b' },
  { name: 'Green', hex: '#2e7d32' },
] as const;

export function generatePrintOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TP-${ts}-${rand}`;
}
