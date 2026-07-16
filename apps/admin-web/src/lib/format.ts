export function formatInr(amount: number, compact = false) {
  if (compact && amount >= 100_000) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function pctShare(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
