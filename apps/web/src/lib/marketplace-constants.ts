import { ServiceCategory } from '@fitora/shared';

export const SERVICE_EMOJIS: Record<ServiceCategory, string> = {
  [ServiceCategory.STRINGING]: '🎾',
  [ServiceCategory.BAT_REPAIR]: '🏏',
  [ServiceCategory.BALL_REPAIR]: '⚽',
  [ServiceCategory.GRIP_REPLACEMENT]: '🤝',
  [ServiceCategory.EQUIPMENT_REPAIR]: '🔧',
  [ServiceCategory.EQUIPMENT_RENTAL]: '📦',
  [ServiceCategory.OTHER]: '⚙️',
};

export const SERVICE_GRADIENTS: Record<ServiceCategory, string> = {
  [ServiceCategory.STRINGING]: 'from-emerald-500 to-teal-600',
  [ServiceCategory.BAT_REPAIR]: 'from-amber-500 to-orange-600',
  [ServiceCategory.BALL_REPAIR]: 'from-sky-500 to-blue-600',
  [ServiceCategory.GRIP_REPLACEMENT]: 'from-rose-500 to-pink-600',
  [ServiceCategory.EQUIPMENT_REPAIR]: 'from-slate-500 to-slate-700',
  [ServiceCategory.EQUIPMENT_RENTAL]: 'from-indigo-500 to-violet-600',
  [ServiceCategory.OTHER]: 'from-blue-500 to-indigo-600',
};

export const MARKETPLACE_CATEGORIES = [
  ServiceCategory.STRINGING,
  ServiceCategory.BAT_REPAIR,
  ServiceCategory.BALL_REPAIR,
  ServiceCategory.GRIP_REPLACEMENT,
  ServiceCategory.EQUIPMENT_RENTAL,
];
