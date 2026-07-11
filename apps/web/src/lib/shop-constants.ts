import { ProductCategory, SportType } from '@fitora/shared';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';

export const CATEGORY_EMOJI: Record<ProductCategory, string> = {
  [ProductCategory.GEAR]: '🏸',
  [ProductCategory.APPAREL]: '👕',
  [ProductCategory.TROPHIES]: '🏆',
  [ProductCategory.ACCESSORIES]: '🎒',
  [ProductCategory.OTHER]: '📦',
};

export const CATEGORY_GRADIENTS: Record<ProductCategory, string> = {
  [ProductCategory.GEAR]: 'from-emerald-500 to-teal-600',
  [ProductCategory.APPAREL]: 'from-violet-500 to-purple-700',
  [ProductCategory.TROPHIES]: 'from-amber-500 to-orange-600',
  [ProductCategory.ACCESSORIES]: 'from-cyan-500 to-blue-600',
  [ProductCategory.OTHER]: 'from-slate-500 to-slate-700',
};

export function productEmoji(category: ProductCategory, sportType?: SportType | null) {
  if (sportType && SPORT_EMOJI[sportType]) return SPORT_EMOJI[sportType];
  return CATEGORY_EMOJI[category];
}

export function productGradient(category: ProductCategory, sportType?: SportType | null) {
  if (sportType && SPORT_GRADIENTS[sportType]) return SPORT_GRADIENTS[sportType];
  return CATEGORY_GRADIENTS[category];
}
