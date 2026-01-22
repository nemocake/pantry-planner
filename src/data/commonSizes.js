/**
 * Common Sizes Configuration
 * Default presets by category, with ingredient-specific overrides
 */

// Category-based default presets
export const categoryPresets = {
  proteins: [
    { quantity: 0.5, unit: 'lb', label: '1/2 lb' },
    { quantity: 1, unit: 'lb', label: '1 lb' },
    { quantity: 2, unit: 'lb', label: '2 lb' }
  ],
  vegetables: [
    { quantity: 1, unit: 'pieces', label: '1' },
    { quantity: 2, unit: 'pieces', label: '2' },
    { quantity: 4, unit: 'pieces', label: '4' }
  ],
  fruits: [
    { quantity: 1, unit: 'pieces', label: '1' },
    { quantity: 3, unit: 'pieces', label: '3' },
    { quantity: 6, unit: 'pieces', label: '6' }
  ],
  dairy: [
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' },
    { quantity: 0.5, unit: 'lb', label: '1/2 lb' }
  ],
  spices: [
    { quantity: 1, unit: 'tsp', label: '1 tsp' },
    { quantity: 1, unit: 'tbsp', label: '1 tbsp' },
    { quantity: 2, unit: 'tbsp', label: '2 tbsp' }
  ],
  grains: [
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' },
    { quantity: 1, unit: 'lb', label: '1 lb' }
  ],
  canned: [
    { quantity: 1, unit: 'can', label: '1 can' },
    { quantity: 2, unit: 'can', label: '2 cans' },
    { quantity: 3, unit: 'can', label: '3 cans' }
  ],
  condiments: [
    { quantity: 1, unit: 'tbsp', label: '1 tbsp' },
    { quantity: 2, unit: 'tbsp', label: '2 tbsp' },
    { quantity: 0.25, unit: 'cup', label: '1/4 cup' }
  ],
  baking: [
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' },
    { quantity: 1, unit: 'lb', label: '1 lb' }
  ],
  oils: [
    { quantity: 1, unit: 'tbsp', label: '1 tbsp' },
    { quantity: 0.25, unit: 'cup', label: '1/4 cup' },
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' }
  ],
  herbs: [
    { quantity: 1, unit: 'tbsp', label: '1 tbsp' },
    { quantity: 2, unit: 'tbsp', label: '2 tbsp' },
    { quantity: 0.25, unit: 'cup', label: '1/4 cup' }
  ],
  pasta: [
    { quantity: 8, unit: 'oz', label: '8 oz' },
    { quantity: 1, unit: 'lb', label: '1 lb' },
    { quantity: 2, unit: 'lb', label: '2 lb' }
  ],
  seafood: [
    { quantity: 0.5, unit: 'lb', label: '1/2 lb' },
    { quantity: 1, unit: 'lb', label: '1 lb' },
    { quantity: 1.5, unit: 'lb', label: '1.5 lb' }
  ],
  nuts: [
    { quantity: 0.25, unit: 'cup', label: '1/4 cup' },
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' },
    { quantity: 1, unit: 'cup', label: '1 cup' }
  ],
  // Default fallback for unknown categories
  default: [
    { quantity: 1, unit: 'pieces', label: '1' },
    { quantity: 2, unit: 'pieces', label: '2' },
    { quantity: 4, unit: 'pieces', label: '4' }
  ]
};

// Ingredient-specific overrides (by ingredient ID)
export const ingredientPresets = {
  // Eggs - sold by dozen
  'ing_protein_eggs': [
    { quantity: 6, unit: 'pieces', label: '6 eggs' },
    { quantity: 12, unit: 'pieces', label: '1 dozen' },
    { quantity: 18, unit: 'pieces', label: '18 eggs' }
  ],

  // Butter - by tablespoon/stick
  'ing_dairy_butter': [
    { quantity: 2, unit: 'tbsp', label: '2 tbsp' },
    { quantity: 4, unit: 'tbsp', label: '1/4 cup' },
    { quantity: 8, unit: 'tbsp', label: '1/2 cup (1 stick)' }
  ],

  // Garlic - by cloves
  'ing_vegetable_garlic': [
    { quantity: 3, unit: 'cloves', label: '3 cloves' },
    { quantity: 6, unit: 'cloves', label: '6 cloves' },
    { quantity: 1, unit: 'heads', label: '1 head' }
  ],

  // Milk - common carton sizes
  'ing_dairy_milk': [
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups (1 pint)' },
    { quantity: 4, unit: 'cup', label: '4 cups (1 quart)' }
  ],

  // Bacon - by strips/package
  'ing_protein_bacon': [
    { quantity: 4, unit: 'pieces', label: '4 strips' },
    { quantity: 8, unit: 'pieces', label: '8 strips' },
    { quantity: 12, unit: 'pieces', label: '12 strips (1 pkg)' }
  ],

  // Onion
  'ing_vegetable_onion': [
    { quantity: 1, unit: 'pieces', label: '1 onion' },
    { quantity: 2, unit: 'pieces', label: '2 onions' },
    { quantity: 3, unit: 'pieces', label: '3 onions' }
  ],

  // Ground beef - common package sizes
  'ing_protein_ground_beef': [
    { quantity: 0.5, unit: 'lb', label: '1/2 lb' },
    { quantity: 1, unit: 'lb', label: '1 lb' },
    { quantity: 2, unit: 'lb', label: '2 lb' }
  ],

  // Chicken breast
  'ing_protein_chicken_breast': [
    { quantity: 0.5, unit: 'lb', label: '1/2 lb' },
    { quantity: 1, unit: 'lb', label: '1 lb' },
    { quantity: 2, unit: 'lb', label: '2 lb' }
  ],

  // Rice
  'ing_grain_white_rice': [
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' },
    { quantity: 1, unit: 'lb', label: '1 lb' }
  ],

  // Cheese (shredded)
  'ing_dairy_cheddar_cheese': [
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' },
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' }
  ],

  'ing_dairy_mozzarella_cheese': [
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' },
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 8, unit: 'oz', label: '8 oz' }
  ],

  // Sour cream
  'ing_dairy_sour_cream': [
    { quantity: 2, unit: 'tbsp', label: '2 tbsp' },
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' },
    { quantity: 1, unit: 'cup', label: '1 cup' }
  ],

  // Flour
  'ing_baking_flour': [
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' },
    { quantity: 5, unit: 'lb', label: '5 lb bag' }
  ],

  // Sugar
  'ing_baking_sugar': [
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' },
    { quantity: 1, unit: 'cup', label: '1 cup' },
    { quantity: 2, unit: 'cup', label: '2 cups' }
  ],

  // Olive oil
  'ing_condiment_olive_oil': [
    { quantity: 1, unit: 'tbsp', label: '1 tbsp' },
    { quantity: 0.25, unit: 'cup', label: '1/4 cup' },
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' }
  ],

  // Tomatoes (canned)
  'ing_canned_diced_tomatoes': [
    { quantity: 1, unit: 'can', label: '1 can (14oz)' },
    { quantity: 2, unit: 'can', label: '2 cans' },
    { quantity: 1, unit: 'can', label: '1 large (28oz)' }
  ],

  // Beans
  'ing_canned_black_beans': [
    { quantity: 1, unit: 'can', label: '1 can' },
    { quantity: 2, unit: 'can', label: '2 cans' },
    { quantity: 3, unit: 'can', label: '3 cans' }
  ],

  // Pasta
  'ing_grain_spaghetti': [
    { quantity: 8, unit: 'oz', label: '8 oz' },
    { quantity: 1, unit: 'lb', label: '1 lb' },
    { quantity: 2, unit: 'lb', label: '2 lb' }
  ],

  // Heavy cream
  'ing_dairy_heavy_cream': [
    { quantity: 0.5, unit: 'cup', label: '1/2 cup' },
    { quantity: 1, unit: 'cup', label: '1 cup (1/2 pint)' },
    { quantity: 2, unit: 'cup', label: '2 cups (1 pint)' }
  ],

  // Celery
  'ing_vegetable_celery': [
    { quantity: 2, unit: 'stalks', label: '2 stalks' },
    { quantity: 4, unit: 'stalks', label: '4 stalks' },
    { quantity: 1, unit: 'pieces', label: '1 bunch' }
  ],

  // Green onion
  'ing_vegetable_green_onion': [
    { quantity: 2, unit: 'stalks', label: '2 stalks' },
    { quantity: 4, unit: 'stalks', label: '4 stalks' },
    { quantity: 1, unit: 'pieces', label: '1 bunch' }
  ]
};

/**
 * Get presets for a specific ingredient
 * @param {string} ingredientId - The ingredient ID
 * @param {string} category - The ingredient's category
 * @returns {Array<{quantity: number, unit: string, label: string}>} Array of preset options
 */
export function getPresetsForIngredient(ingredientId, category) {
  // Check for ingredient-specific presets first
  if (ingredientPresets[ingredientId]) {
    return ingredientPresets[ingredientId];
  }

  // Fall back to category presets
  if (categoryPresets[category]) {
    return categoryPresets[category];
  }

  // Ultimate fallback
  return categoryPresets.default;
}

/**
 * Get all available categories with presets
 * @returns {string[]} Array of category names
 */
export function getCategoriesWithPresets() {
  return Object.keys(categoryPresets).filter(k => k !== 'default');
}

export default {
  categoryPresets,
  ingredientPresets,
  getPresetsForIngredient,
  getCategoriesWithPresets
};
