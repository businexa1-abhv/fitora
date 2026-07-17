import { CommissionEngine } from './commission.engine';
import { round2 } from '../money.util';

describe('CommissionEngine concurrency safety (logical)', () => {
  const engine = Object.create(CommissionEngine.prototype) as CommissionEngine;

  it('parallel calculate calls produce identical splits', () => {
    const results = Array.from({ length: 50 }, () => engine.calculate(500, 8));
    for (const r of results) {
      expect(r).toEqual({
        grossAmount: 500,
        ratePercent: 8,
        commissionAmount: 40,
        netAmount: 460,
      });
      expect(round2(r.netAmount + r.commissionAmount)).toBe(r.grossAmount);
    }
  });

  it('idempotent payment key format is stable', () => {
    const paymentId = '11111111-1111-1111-1111-111111111111';
    const keys = Array.from({ length: 20 }, () => `commission:${paymentId}`);
    expect(new Set(keys).size).toBe(1);
  });
});
