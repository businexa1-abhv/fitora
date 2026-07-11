import { SlotPricingRuleType } from '@prisma/client';
import {
  buildSlotWindows,
  eachDateInRange,
  isSlotClosed,
  resolveSlotPrice,
  ruleMatchesSlot,
  scheduleAppliesOnDate,
  validateDaysOfWeek,
} from './slot-pricing.utils';

describe('slot-pricing.utils', () => {
  describe('resolveSlotPrice', () => {
    it('returns base price when no rules match', () => {
      const result = resolveSlotPrice(500, new Date('2026-07-06T10:00:00.000Z'), []);
      expect(result.price).toBe(500);
      expect(result.appliedRule).toBeNull();
    });

    it('applies weekend multiplier', () => {
      const rules = [
        {
          id: '1',
          type: SlotPricingRuleType.WEEKEND,
          name: 'Weekend',
          multiplier: 1.5,
          fixedPrice: null,
          startHour: null,
          endHour: null,
          daysOfWeek: [],
          holidayDate: null,
          priority: 5,
          isActive: true,
        },
      ];
      // 2026-07-05 is a Sunday
      const result = resolveSlotPrice(500, new Date('2026-07-05T10:00:00.000Z'), rules);
      expect(result.price).toBe(750);
    });

    it('applies peak hours rule', () => {
      const rules = [
        {
          id: '1',
          type: SlotPricingRuleType.PEAK,
          name: 'Evening Peak',
          multiplier: 1.25,
          fixedPrice: null,
          startHour: 17,
          endHour: 22,
          daysOfWeek: [1, 2, 3, 4, 5],
          holidayDate: null,
          priority: 10,
          isActive: true,
        },
      ];
      const result = resolveSlotPrice(400, new Date('2026-07-06T18:00:00.000Z'), rules);
      expect(result.price).toBe(500);
    });

    it('uses fixed price over multiplier', () => {
      const rules = [
        {
          id: '1',
          type: SlotPricingRuleType.HOLIDAY,
          name: 'Holiday',
          multiplier: 2,
          fixedPrice: 999,
          startHour: null,
          endHour: null,
          daysOfWeek: [],
          holidayDate: new Date('2026-08-15T00:00:00.000Z'),
          priority: 20,
          isActive: true,
        },
      ];
      const result = resolveSlotPrice(400, new Date('2026-08-15T10:00:00.000Z'), rules);
      expect(result.price).toBe(999);
    });

    it('picks highest priority rule', () => {
      const rules = [
        {
          id: '1',
          type: SlotPricingRuleType.WEEKEND,
          name: 'Weekend',
          multiplier: 1.2,
          fixedPrice: null,
          startHour: null,
          endHour: null,
          daysOfWeek: [],
          holidayDate: null,
          priority: 5,
          isActive: true,
        },
        {
          id: '2',
          type: SlotPricingRuleType.HOLIDAY,
          name: 'Holiday',
          multiplier: 1,
          fixedPrice: 800,
          startHour: null,
          endHour: null,
          daysOfWeek: [],
          holidayDate: new Date('2026-08-15T00:00:00.000Z'),
          priority: 20,
          isActive: true,
        },
      ];
      const result = resolveSlotPrice(400, new Date('2026-08-15T10:00:00.000Z'), rules);
      expect(result.price).toBe(800);
    });
  });

  describe('isSlotClosed', () => {
    it('detects full-day closure', () => {
      const closure = isSlotClosed(
        new Date('2026-08-15T10:00:00.000Z'),
        new Date('2026-08-15T11:00:00.000Z'),
        [
          {
            id: 'c1',
            startDate: new Date('2026-08-15T00:00:00.000Z'),
            endDate: new Date('2026-08-15T00:00:00.000Z'),
            reason: 'HOLIDAY' as const,
            isFullDay: true,
            startHour: null,
            endHour: null,
          },
        ],
      );
      expect(closure).not.toBeNull();
    });
  });

  describe('buildSlotWindows', () => {
    it('builds hourly slots', () => {
      const windows = buildSlotWindows('2026-07-10', 6, 0, 9, 0, 60);
      expect(windows).toHaveLength(3);
    });
  });

  describe('eachDateInRange', () => {
    it('returns inclusive date range', () => {
      const dates = eachDateInRange('2026-07-01', '2026-07-03');
      expect(dates).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    });
  });

  describe('scheduleAppliesOnDate', () => {
    it('matches weekday schedule', () => {
      // 2026-07-06 is Monday (1)
      expect(scheduleAppliesOnDate([1, 2, 3, 4, 5], '2026-07-06', null, null)).toBe(true);
      expect(scheduleAppliesOnDate([0, 6], '2026-07-06', null, null)).toBe(false);
    });
  });

  describe('validateDaysOfWeek', () => {
    it('rejects invalid days', () => {
      expect(() => validateDaysOfWeek([7])).toThrow();
    });
  });
});
