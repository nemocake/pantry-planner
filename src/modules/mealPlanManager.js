/**
 * Meal Plan Manager Module
 * Handles CRUD operations, localStorage persistence, and reserved ingredient calculations
 */

import { getIngredientById } from './ingredientManager.js';
import { getRecipeById } from './recipeManager.js';
import { getPantryItem, getPantryItems, onPantryChange } from './pantryManager.js';

const STORAGE_KEY = 'pantry_planner_meals';
const EXPORT_VERSION = '1.0.0';

let mealPlanData = {
  version: EXPORT_VERSION,
  meals: {} // { "YYYY-MM-DD": [meal, meal, ...] }
};
let listeners = [];

/**
 * Generate unique meal ID
 */
function generateMealId() {
  return 'meal_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get start of week (Monday) for a given date
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get array of dates for a week starting from given date
 */
export function getWeekDates(startDate) {
  const dates = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
}

/**
 * Initialize meal plan from localStorage
 */
export function initMealPlan() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      mealPlanData = {
        version: data.version || EXPORT_VERSION,
        meals: data.meals || {}
      };
    }
  } catch (error) {
    console.error('Failed to load meal plan from storage:', error);
    mealPlanData = { version: EXPORT_VERSION, meals: {} };
  }
  return mealPlanData;
}

/**
 * Save meal plan to localStorage
 */
function saveMealPlan() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlanData));
  } catch (error) {
    console.error('Failed to save meal plan:', error);
  }
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(action, data) {
  listeners.forEach(callback => {
    try {
      callback({ action, data, mealPlan: mealPlanData });
    } catch (error) {
      console.error('Listener error:', error);
    }
  });
}

/**
 * Subscribe to meal plan changes
 */
export function onMealPlanChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

/**
 * Get meals for a specific date
 */
export function getMealsForDate(dateStr) {
  return mealPlanData.meals[dateStr] || [];
}

/**
 * Get all meals for a week starting from given date
 */
export function getMealsForWeek(startDate) {
  const weekDates = getWeekDates(startDate);
  const weekMeals = {};

  weekDates.forEach(dateStr => {
    weekMeals[dateStr] = getMealsForDate(dateStr);
  });

  return weekMeals;
}

/**
 * Get all meals across all dates
 */
export function getAllMeals() {
  const allMeals = [];
  Object.entries(mealPlanData.meals).forEach(([date, meals]) => {
    meals.forEach(meal => {
      allMeals.push({ ...meal, date });
    });
  });
  return allMeals;
}

/**
 * Add a meal to a specific date
 */
export function addMealToDate(dateStr, recipeId, mealType = 'dinner', servings = null, notes = '') {
  const recipe = getRecipeById(recipeId);
  if (!recipe) {
    console.error('Unknown recipe:', recipeId);
    return null;
  }

  const meal = {
    id: generateMealId(),
    recipeId,
    mealType, // breakfast | lunch | dinner | snack
    servings: servings || recipe.servings,
    notes,
    addedAt: new Date().toISOString()
  };

  if (!mealPlanData.meals[dateStr]) {
    mealPlanData.meals[dateStr] = [];
  }

  mealPlanData.meals[dateStr].push(meal);
  saveMealPlan();
  notifyListeners('add', { date: dateStr, meal });

  return meal;
}

/**
 * Update an existing meal
 */
export function updateMeal(mealId, updates) {
  for (const [dateStr, meals] of Object.entries(mealPlanData.meals)) {
    const mealIndex = meals.findIndex(m => m.id === mealId);
    if (mealIndex !== -1) {
      mealPlanData.meals[dateStr][mealIndex] = {
        ...meals[mealIndex],
        ...updates
      };
      saveMealPlan();
      notifyListeners('update', { date: dateStr, meal: mealPlanData.meals[dateStr][mealIndex] });
      return mealPlanData.meals[dateStr][mealIndex];
    }
  }
  return null;
}

/**
 * Remove a meal by ID
 */
export function removeMeal(mealId) {
  for (const [dateStr, meals] of Object.entries(mealPlanData.meals)) {
    const mealIndex = meals.findIndex(m => m.id === mealId);
    if (mealIndex !== -1) {
      const removed = meals.splice(mealIndex, 1)[0];

      // Clean up empty date arrays
      if (meals.length === 0) {
        delete mealPlanData.meals[dateStr];
      }

      saveMealPlan();
      notifyListeners('remove', { date: dateStr, meal: removed });
      return true;
    }
  }
  return false;
}

/**
 * Clear all meals for a week
 */
export function clearWeek(startDate) {
  const weekDates = getWeekDates(startDate);
  const removed = [];

  weekDates.forEach(dateStr => {
    if (mealPlanData.meals[dateStr]) {
      removed.push(...mealPlanData.meals[dateStr]);
      delete mealPlanData.meals[dateStr];
    }
  });

  saveMealPlan();
  notifyListeners('clearWeek', { startDate, removed });
  return removed.length;
}

/**
 * Calculate reserved quantity for an ingredient across all planned meals
 */
export function getReservedQuantity(ingredientId) {
  let reserved = 0;

  Object.values(mealPlanData.meals).forEach(dayMeals => {
    dayMeals.forEach(meal => {
      const recipe = getRecipeById(meal.recipeId);
      if (!recipe) return;

      const recipeIng = recipe.ingredients.find(ing => ing.ingredientId === ingredientId);
      if (recipeIng) {
        // Scale by servings: (recipe ingredient qty * meal servings / recipe servings)
        const scaledQty = (recipeIng.quantity * meal.servings) / recipe.servings;
        reserved += scaledQty;
      }
    });
  });

  return reserved;
}

/**
 * Get available quantity (pantry - reserved) for an ingredient
 */
export function getAvailableQuantity(ingredientId) {
  const pantryItem = getPantryItem(ingredientId);
  if (!pantryItem) return 0;

  const reserved = getReservedQuantity(ingredientId);
  return Math.max(0, pantryItem.quantity - reserved);
}

/**
 * Check if a recipe can be made with available ingredients
 * Returns { canMake: boolean, missing: [{ingredientId, name, needed, available}], warnings: [...] }
 */
export function checkRecipeAvailability(recipe, servings = null) {
  const targetServings = servings || recipe.servings;
  const missing = [];
  const warnings = [];

  recipe.ingredients.forEach(recipeIng => {
    if (recipeIng.optional) return;

    const ingredient = getIngredientById(recipeIng.ingredientId);
    const available = getAvailableQuantity(recipeIng.ingredientId);
    const needed = (recipeIng.quantity * targetServings) / recipe.servings;

    if (available < needed) {
      const shortage = needed - available;
      if (available === 0) {
        missing.push({
          ingredientId: recipeIng.ingredientId,
          name: ingredient?.name || recipeIng.ingredientId,
          unit: recipeIng.unit,
          needed,
          available,
          shortage
        });
      } else {
        warnings.push({
          ingredientId: recipeIng.ingredientId,
          name: ingredient?.name || recipeIng.ingredientId,
          unit: recipeIng.unit,
          needed,
          available,
          shortage
        });
      }
    }
  });

  return {
    canMake: missing.length === 0 && warnings.length === 0,
    hasSome: missing.length === 0, // Can make with warnings
    missing,
    warnings
  };
}

/**
 * Get shopping list for a date range
 * Returns ingredients needed but not available in pantry
 */
export function getShoppingList(startDate, endDate = null) {
  const endDateStr = endDate ? formatDate(endDate) : null;
  const shoppingItems = new Map(); // ingredientId -> { name, unit, needed, available, shortage, category }

  // Iterate through meals in date range
  Object.entries(mealPlanData.meals).forEach(([dateStr, dayMeals]) => {
    // Check if within date range
    if (startDate && dateStr < formatDate(startDate)) return;
    if (endDateStr && dateStr > endDateStr) return;

    dayMeals.forEach(meal => {
      const recipe = getRecipeById(meal.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(recipeIng => {
        if (recipeIng.optional) return;

        const scaledQty = (recipeIng.quantity * meal.servings) / recipe.servings;
        const ingredient = getIngredientById(recipeIng.ingredientId);

        if (shoppingItems.has(recipeIng.ingredientId)) {
          shoppingItems.get(recipeIng.ingredientId).needed += scaledQty;
        } else {
          const pantryItem = getPantryItem(recipeIng.ingredientId);
          shoppingItems.set(recipeIng.ingredientId, {
            ingredientId: recipeIng.ingredientId,
            name: ingredient?.name || recipeIng.ingredientId,
            unit: recipeIng.unit,
            needed: scaledQty,
            available: pantryItem?.quantity || 0,
            category: ingredient?.category || 'other'
          });
        }
      });
    });
  });

  // Filter to only items where needed > available
  const needToBuy = [];
  shoppingItems.forEach(item => {
    if (item.needed > item.available) {
      needToBuy.push({
        ...item,
        shortage: item.needed - item.available
      });
    }
  });

  // Sort by category, then by name
  needToBuy.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return needToBuy;
}

/**
 * Get meal plan statistics
 */
export function getMealPlanStats(startDate = null) {
  const meals = startDate ? getMealsForWeek(startDate) : mealPlanData.meals;

  let totalMeals = 0;
  let canMake = 0;
  let needShopping = 0;

  Object.values(meals).forEach(dayMeals => {
    if (!Array.isArray(dayMeals)) return;

    dayMeals.forEach(meal => {
      totalMeals++;
      const recipe = getRecipeById(meal.recipeId);
      if (recipe) {
        const availability = checkRecipeAvailability(recipe, meal.servings);
        if (availability.canMake) {
          canMake++;
        } else {
          needShopping++;
        }
      }
    });
  });

  return {
    totalMeals,
    canMake,
    needShopping
  };
}

/**
 * Export meal plan to JSON
 */
export function exportMealPlan() {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    meals: mealPlanData.meals
  };
}

/**
 * Download meal plan as JSON file
 */
export function downloadMealPlanJson() {
  const data = exportMealPlan();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `mealplan-export-${date}.json`;

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
 * Import meal plan from JSON
 */
export function importMealPlan(data, mode = 'merge') {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (!parsed.meals) {
      throw new Error('Invalid meal plan file format');
    }

    if (mode === 'replace') {
      mealPlanData.meals = parsed.meals;
    } else {
      // Merge: add meals from import to existing dates
      Object.entries(parsed.meals).forEach(([dateStr, meals]) => {
        if (!mealPlanData.meals[dateStr]) {
          mealPlanData.meals[dateStr] = [];
        }
        // Add meals with new IDs to avoid conflicts
        meals.forEach(meal => {
          mealPlanData.meals[dateStr].push({
            ...meal,
            id: generateMealId()
          });
        });
      });
    }

    saveMealPlan();
    notifyListeners('import', null);

    return { success: true };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error: error.message };
  }
}

export default {
  initMealPlan,
  onMealPlanChange,
  formatDate,
  parseDate,
  getWeekStart,
  getWeekDates,
  getMealsForDate,
  getMealsForWeek,
  getAllMeals,
  addMealToDate,
  updateMeal,
  removeMeal,
  clearWeek,
  getReservedQuantity,
  getAvailableQuantity,
  checkRecipeAvailability,
  getShoppingList,
  getMealPlanStats,
  exportMealPlan,
  downloadMealPlanJson,
  importMealPlan
};
