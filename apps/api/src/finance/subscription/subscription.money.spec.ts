import { addGst, financeInvoiceNumber, round2 } from '../money.util';

describe('subscription money helpers', () => {
  it('adds 18% GST', () => {
    const { gst, total } = addGst(2999, 0.18);
    expect(gst).toBe(539.82);
    expect(total).toBe(3538.82);
  });

  it('formats invoice numbers', () => {
    const n = financeInvoiceNumber('SUB', 42);
    expect(n).toMatch(/^SUB-\d{4}-000042$/);
  });

  it('balances subscription journal amounts', () => {
    const amount = 26999;
    const { gst, total } = addGst(amount, 0.18);
    expect(round2(amount + gst)).toBe(total);
  });
});
