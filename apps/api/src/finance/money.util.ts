export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function percentOf(amount: number, ratePercent: number): number {
  return round2((amount * ratePercent) / 100);
}

export function addGst(amountExGst: number, gstRate = 0.18): { gst: number; total: number } {
  const gst = round2(amountExGst * gstRate);
  return { gst, total: round2(amountExGst + gst) };
}

export function financeInvoiceNumber(prefix: string, seq: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}
