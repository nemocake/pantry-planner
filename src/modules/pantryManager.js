/**
 * Pantry Manager Module
 * Handles CRUD operations, localStorage persistence, and JSON export/import
 */

import { getIngredientById } from './ingredientManager.js';
import { schedulePushToCloud } from '../services/syncOrchestrator.js';

const STORAGE_KEY = 'pantry_planner_items';
const EXPORT_VERSION = '1.0.0';

let pantryItems = new Map(); // ingredientId -> item data
let listeners = []; // Change listeners

/**
 * Default pantry items for new users / testing
 */
const DEFAULT_PANTRY = [
  // Proteins
  { ingredientId: 'ing_protein_chicken_breast', quantity: 2, unit: 'lb', storage: 'fridge' },
  { ingredientId: 'ing_protein_ground_beef', quantity: 1, unit: 'lb', storage: 'fridge' },
  { ingredientId: 'ing_protein_eggs', quantity: 12, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_protein_bacon', quantity: 1, unit: 'lb', storage: 'fridge' },
  // Dairy
  { ingredientId: 'ing_dairy_milk', quantity: 1, unit: 'l', storage: 'fridge' },
  { ingredientId: 'ing_dairy_butter', quantity: 1, unit: 'lb', storage: 'fridge' },
  { ingredientId: 'ing_dairy_cheddar', quantity: 8, unit: 'oz', storage: 'fridge' },
  { ingredientId: 'ing_dairy_parmesan', quantity: 4, unit: 'oz', storage: 'fridge' },
  { ingredientId: 'ing_dairy_cream', quantity: 1, unit: 'cup', storage: 'fridge' },
  // Vegetables
  { ingredientId: 'ing_veg_onion', quantity: 4, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_veg_garlic', quantity: 2, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_veg_tomato', quantity: 4, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_veg_bell_pepper', quantity: 3, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_veg_carrot', quantity: 6, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_veg_celery', quantity: 1, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_veg_potato', quantity: 5, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_veg_broccoli', quantity: 2, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_veg_spinach', quantity: 1, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_veg_mushroom', quantity: 8, unit: 'oz', storage: 'fridge' },
  // Fruits
  { ingredientId: 'ing_fruit_lemon', quantity: 3, unit: 'pieces', storage: 'fridge' },
  { ingredientId: 'ing_fruit_lime', quantity: 2, unit: 'pieces', storage: 'fridge' },
  // Grains
  { ingredientId: 'ing_grain_pasta_spaghetti', quantity: 1, unit: 'lb', storage: 'pantry' },
  { ingredientId: 'ing_grain_pasta_penne', quantity: 1, unit: 'lb', storage: 'pantry' },
  { ingredientId: 'ing_grain_rice_white', quantity: 2, unit: 'lb', storage: 'pantry' },
  { ingredientId: 'ing_grain_bread', quantity: 1, unit: 'pieces', storage: 'pantry' },
  // Canned goods
  { ingredientId: 'ing_canned_tomatoes', quantity: 2, unit: 'can', storage: 'pantry' },
  { ingredientId: 'ing_canned_tomato_paste', quantity: 1, unit: 'can', storage: 'pantry' },
  { ingredientId: 'ing_canned_chicken_broth', quantity: 2, unit: 'can', storage: 'pantry' },
  { ingredientId: 'ing_canned_black_beans', quantity: 2, unit: 'can', storage: 'pantry' },
  // Condiments & oils
  { ingredientId: 'ing_condiment_olive_oil', quantity: 16, unit: 'oz', storage: 'pantry' },
  // Spices & seasonings
  { ingredientId: 'ing_spice_salt', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_black_pepper', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_garlic_powder', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_onion_powder', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_paprika', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_cumin', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_italian_seasoning', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_oregano', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_basil', quantity: 1, unit: 'pieces', storage: 'pantry' },
  { ingredientId: 'ing_spice_red_pepper_flakes', quantity: 1, unit: 'pieces', storage: 'pantry' },
];

/**
 * Initialize pantry from localStorage (with defaults if empty)
 */
export function initPantry() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      pantryItems = new Map(data.map(item => [item.ingredientId, item]));
    } else {
      // Load default pantry for new users
      console.log('Loading default pantry items...');
      pantryItems = new Map();
      DEFAULT_PANTRY.forEach(item => {
        pantryItems.set(item.ingredientId, {
          ...item,
          addedAt: new Date().toISOString(),
          notes: ''
        });
      });
      savePantry();
    }
  } catch (error) {
    console.error('Failed to load pantry from storage:', error);
    pantryItems = new Map();
  }
  return getPantryItems();
}

/**
 * Save pantry to localStorage
 */
function savePantry() {
  try {
    const data = Array.from(pantryItems.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    schedulePushToCloud();
  } catch (error) {
    console.error('Failed to save pantry:', error);
  }
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(action, item) {
  listeners.forEach(callback => {
    try {
      callback({ action, item, pantry: getPantryItems() });
    } catch (error) {
      console.error('Listener error:', error);
    }
  });
}

/**
 * Subscribe to pantry changes
 */
export function onPantryChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

/**
 * Get all pantry items
 */
export function getPantryItems() {
  return Array.from(pantryItems.values());
}

/**
 * Get pantry items grouped by category
 */
export function getPantryByCategory() {
  const groups = {};

  pantryItems.forEach(item => {
    const ingredient = getIngredientById(item.ingredientId);
    if (ingredient) {
      const category = ingredient.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        ...item,
        ingredient
      });
    }
  });

  return groups;
}

/**
 * Check if an ingredient is in the pantry
 */
export function hasPantryItem(ingredientId) {
  return pantryItems.has(ingredientId);
}

/**
 * Get a specific pantry item
 */
export function getPantryItem(ingredientId) {
  return pantryItems.get(ingredientId) || null;
}

/**
 * Add or update an item in the pantry
 */
export function addPantryItem(ingredientId, quantity = null, unit = null, storage = 'pantry', notes = '') {
  const ingredient = getIngredientById(ingredientId);
  if (!ingredient) {
    console.error('Unknown ingredient:', ingredientId);
    return null;
  }

  const item = {
    ingredientId,
    quantity: quantity ?? 1,
    unit: unit || ingredient.defaultUnit,
    storage, // 'pantry', 'fridge', 'freezer'
    notes,
    addedAt: pantryItems.has(ingredientId)
      ? pantryItems.get(ingredientId).addedAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const isUpdate = pantryItems.has(ingredientId);
  pantryItems.set(ingredientId, item);
  savePantry();
  notifyListeners(isUpdate ? 'update' : 'add', item);

  return item;
}

/**
 * Update quantity of a pantry item
 */
export function updatePantryQuantity(ingredientId, quantity, unit = null) {
  const existing = pantryItems.get(ingredientId);
  if (!existing) return null;

  return addPantryItem(
    ingredientId,
    quantity,
    unit || existing.unit,
    existing.storage,
    existing.notes
  );
}

// Alias for consistency
export const updatePantryItemQuantity = updatePantryQuantity;

/**
 * Remove an item from the pantry
 */
export function removePantryItem(ingredientId) {
  const item = pantryItems.get(ingredientId);
  if (!item) return false;

  pantryItems.delete(ingredientId);
  savePantry();
  notifyListeners('remove', item);

  return true;
}

/**
 * Clear all pantry items
 */
export function clearPantry() {
  pantryItems.clear();
  savePantry();
  notifyListeners('clear', null);
}

/**
 * Get pantry item IDs as a Set (for fast recipe matching)
 */
export function getPantryIngredientIds() {
  return new Set(pantryItems.keys());
}

/**
 * Export pantry to JSON object
 */
export function exportPantry() {
  const items = getPantryItems().map(item => ({
    ingredientId: item.ingredientId,
    quantity: item.quantity,
    unit: item.unit,
    storage: item.storage,
    notes: item.notes
  }));

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items
  };
}

/**
 * Export pantry as downloadable JSON file
 */
export function downloadPantryJson() {
  const data = exportPantry();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `pantry-export-${date}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Import pantry from JSON data
 * @param {Object|string} data - JSON object or string
 * @param {string} mode - 'replace' (clear existing) or 'merge' (add to existing)
 */
export function importPantry(data, mode = 'merge') {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    // Validate structure
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid pantry file format: missing items array');
    }

    if (mode === 'replace') {
      pantryItems.clear();
    }

    let imported = 0;
    let skipped = 0;

    parsed.items.forEach(item => {
      if (!item.ingredientId) {
        skipped++;
        return;
      }

      // Verify ingredient exists
      const ingredient = getIngredientById(item.ingredientId);
      if (!ingredient) {
        console.warn('Unknown ingredient in import:', item.ingredientId);
        skipped++;
        return;
      }

      // Add to pantry
      pantryItems.set(item.ingredientId, {
        ingredientId: item.ingredientId,
        quantity: item.quantity ?? 1,
        unit: item.unit || ingredient.defaultUnit,
        storage: item.storage || 'pantry',
        notes: item.notes || '',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      imported++;
    });

    savePantry();
    notifyListeners('import', null);

    return {
      success: true,
      imported,
      skipped,
      total: parsed.items.length
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Import pantry from file input
 * @param {File} file - File object from input element
 * @param {string} mode - 'replace' or 'merge'
 */
export async function importPantryFromFile(file, mode = 'merge') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = importPantry(event.target.result, mode);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Get pantry statistics
 */
export function getPantryStats() {
  const items = getPantryItems();
  const byCategory = {};
  const byStorage = { pantry: 0, fridge: 0, freezer: 0 };

  items.forEach(item => {
    const ingredient = getIngredientById(item.ingredientId);
    if (ingredient) {
      byCategory[ingredient.category] = (byCategory[ingredient.category] || 0) + 1;
    }
    byStorage[item.storage] = (byStorage[item.storage] || 0) + 1;
  });

  return {
    totalItems: items.length,
    byCategory,
    byStorage
  };
}

export default {
  initPantry,
  onPantryChange,
  getPantryItems,
  getPantryByCategory,
  hasPantryItem,
  getPantryItem,
  addPantryItem,
  updatePantryQuantity,
  removePantryItem,
  clearPantry,
  getPantryIngredientIds,
  exportPantry,
  downloadPantryJson,
  importPantry,
  importPantryFromFile,
  getPantryStats
};
