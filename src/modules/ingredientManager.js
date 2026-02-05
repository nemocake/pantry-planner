/**
 * Ingredient Manager Module
 * Handles loading, searching, and normalizing ingredients
 */

import {
  getCategoryIcon as getIcon,
  getIngredientIcon as getIngIcon,
  CATEGORY_ICONS,
  INGREDIENT_ICONS
} from '../data/icons.js';

let ingredientsData = null;
let ingredientIndex = new Map(); // Fast lookup by ID
let searchIndex = []; // Flattened search terms

/**
 * Load ingredients from JSON file
 */
export async function loadIngredients() {
  if (ingredientsData) return ingredientsData;

  try {
    const response = await fetch('/src/data/ingredients.json');
    ingredientsData = await response.json();
    buildIndexes();
    return ingredientsData;
  } catch (error) {
    console.error('Failed to load ingredients:', error);
    return { categories: [], ingredients: [] };
  }
}

/**
 * Build search indexes for fast lookups
 */
function buildIndexes() {
  ingredientIndex.clear();
  searchIndex = [];

  ingredientsData.ingredients.forEach(ingredient => {
    // Index by ID
    ingredientIndex.set(ingredient.id, ingredient);

    // Build search index entries
    const terms = [
      ingredient.name.toLowerCase(),
      ...ingredient.aliases.map(a => a.toLowerCase()),
      ...ingredient.searchTerms.map(t => t.toLowerCase())
    ];

    terms.forEach(term => {
      searchIndex.push({
        term,
        ingredientId: ingredient.id,
        ingredient
      });
    });
  });
}

/**
 * Get ingredient by ID
 */
export function getIngredientById(id) {
  return ingredientIndex.get(id) || null;
}

/**
 * Get the full ingredients map (ID -> ingredient)
 * Used for nutrition calculations
 */
export function getIngredientsMap() {
  return ingredientIndex;
}

/**
 * Search ingredients by query string
 * Returns sorted results by relevance
 */
export function searchIngredients(query, limit = 10) {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results = new Map(); // Dedupe by ingredient ID

  searchIndex.forEach(entry => {
    if (entry.term.includes(normalizedQuery)) {
      const existing = results.get(entry.ingredientId);

      // Score: exact match > starts with > contains
      let score = 0;
      if (entry.term === normalizedQuery) {
        score = 100;
      } else if (entry.term.startsWith(normalizedQuery)) {
        score = 75;
      } else {
        score = 50;
      }

      // Prefer name matches over aliases
      if (entry.term === entry.ingredient.name.toLowerCase()) {
        score += 10;
      }

      if (!existing || existing.score < score) {
        results.set(entry.ingredientId, {
          ingredient: entry.ingredient,
          score
        });
      }
    }
  });

  // Sort by score and return limited results
  return Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.ingredient);
}

/**
 * Get all ingredients in a category
 */
export function getIngredientsByCategory(categoryId) {
  if (!ingredientsData) return [];

  return ingredientsData.ingredients.filter(
    ing => ing.category === categoryId
  );
}

/**
 * Get all ingredients in a subcategory
 */
export function getIngredientsBySubcategory(categoryId, subcategory) {
  if (!ingredientsData) return [];

  return ingredientsData.ingredients.filter(
    ing => ing.category === categoryId && ing.subcategory === subcategory
  );
}

/**
 * Get all categories
 */
export function getCategories() {
  return ingredientsData?.categories || [];
}

/**
 * Normalize an ingredient name for matching
 * Handles common variations and plurals
 */
export function normalizeIngredientName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Remove common suffixes
    .replace(/\s*(fresh|dried|frozen|canned|chopped|diced|sliced|minced|ground)$/i, '')
    // Simple plural handling
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '');
}

/**
 * Find ingredient by name (fuzzy match)
 */
export function findIngredientByName(name) {
  const normalized = normalizeIngredientName(name);
  const results = searchIngredients(normalized, 1);
  return results[0] || null;
}

/**
 * Get emoji icon for a category
 * Re-exports from centralized icons.js
 */
export function getCategoryIcon(categoryId) {
  return getIcon(categoryId);
}

/**
 * Get emoji icon for an ingredient based on its category/subcategory
 * Re-exports from centralized icons.js
 */
export function getIngredientIcon(ingredient) {
  return getIngIcon(ingredient.id, ingredient.category);
}

export default {
  loadIngredients,
  getIngredientById,
  getIngredientsMap,
  searchIngredients,
  getIngredientsByCategory,
  getIngredientsBySubcategory,
  getCategories,
  normalizeIngredientName,
  findIngredientByName,
  getCategoryIcon,
  getIngredientIcon
};
