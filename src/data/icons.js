/**
 * Centralized icon/emoji definitions
 * Single source of truth for all category and ingredient icons
 */

// Category icons for shopping lists, filters, etc.
export const CATEGORY_ICONS = {
  proteins: '🥩',
  vegetables: '🥬',
  fruits: '🍎',
  dairy: '🧀',
  grains: '🌾',
  canned: '🥫',
  baking: '🧁',
  spices: '🌶️',
  condiments: '🍯',
  frozen: '🧊',
  international: '🌍',
  beverages: '🥤',
  pantry_staples: '🫙',
  herbs_spices: '🌿',
  other: '📦'
};

// Specific ingredient icons (override category defaults)
export const INGREDIENT_ICONS = {
  'ing_protein_chicken_breast': '🍗',
  'ing_protein_ground_beef': '🥩',
  'ing_protein_bacon': '🥓',
  'ing_protein_salmon': '🐟',
  'ing_protein_shrimp': '🦐',
  'ing_protein_eggs': '🥚',
  'ing_protein_tofu': '🧈',
  'ing_veg_tomato': '🍅',
  'ing_veg_onion': '🧅',
  'ing_veg_garlic': '🧄',
  'ing_veg_carrot': '🥕',
  'ing_veg_potato': '🥔',
  'ing_veg_bell_pepper': '🫑',
  'ing_veg_mushroom': '🍄',
  'ing_veg_corn': '🌽',
  'ing_veg_broccoli': '🥦',
  'ing_veg_avocado': '🥑',
  'ing_fruit_lemon': '🍋',
  'ing_fruit_apple': '🍎',
  'ing_fruit_banana': '🍌',
  'ing_fruit_orange': '🍊',
  'ing_fruit_strawberry': '🍓',
  'ing_dairy_milk': '🥛',
  'ing_dairy_butter': '🧈',
  'ing_dairy_cheese_cheddar': '🧀',
  'ing_grain_rice': '🍚',
  'ing_grain_bread': '🍞',
  'ing_grain_pasta_spaghetti': '🍝',
  'ing_intl_soy_sauce': '🥢'
};

// Meal type icons
export const MEAL_TYPE_ICONS = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍪'
};

// Status icons
export const STATUS_ICONS = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  loading: '⏳',
  empty: '📭',
  celebration: '🎉'
};

/**
 * Get icon for a category
 */
export function getCategoryIcon(categoryId) {
  return CATEGORY_ICONS[categoryId] || CATEGORY_ICONS.other;
}

/**
 * Get icon for an ingredient
 */
export function getIngredientIcon(ingredientId, categoryId) {
  return INGREDIENT_ICONS[ingredientId] || getCategoryIcon(categoryId);
}

export default {
  CATEGORY_ICONS,
  INGREDIENT_ICONS,
  MEAL_TYPE_ICONS,
  STATUS_ICONS,
  getCategoryIcon,
  getIngredientIcon
};
