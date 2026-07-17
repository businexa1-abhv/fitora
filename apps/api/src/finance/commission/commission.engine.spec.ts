import { CommissionEngine } from './commission.engine';
import { percentOf, round2 } from '../money.util';

describe('money.util', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(40.005)).toBe(40.01);
    expect(round2(39.994)).toBe(39.99);
  });

  it('computes percent of amount', () => {
    expect(percentOf(500, 8)).toBe(40);
    expect(percentOf(999, 12)).toBe(119.88);
  });
});

describe('CommissionEngine.calculate', () => {
  const engine = Object.create(CommissionEngine.prototype) as CommissionEngine;

  it('splits booking commission at 8%', () => {
    const split = engine.calculate(500, 8);
    expect(split.grossAmount).toBe(500);
    expect(split.commissionAmount).toBe(40);
    expect(split.netAmount).toBe(460);
  });

  it('splits shop commission at 12%', () => {
    const split = engine.calculate(1000, 12);
    expect(split.commissionAmount).toBe(120);
    expect(split.netAmount).toBe(880);
  });

  it('keeps debit/credit identity: net + commission = gross', () => {
    for (const rate of [3, 5, 8, 10, 12]) {
      const split = engine.calculate(1234.56, rate);
      expect(round2(split.netAmount + split.commissionAmount)).toBe(split.grossAmount);
    }
  });
});
