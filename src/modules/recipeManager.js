/**
 * Recipe Manager Module
 * Handles loading and filtering recipes
 */

let recipesData = null;

/**
 * Load recipes from JSON file
 */
export async function loadRecipes() {
  if (recipesData) return recipesData;

  try {
    const response = await fetch('/src/data/recipes.json');
    recipesData = await response.json();
    return recipesData;
  } catch (error) {
    console.error('Failed to load recipes:', error);
    return { recipes: [] };
  }
}

/**
 * Get all recipes
 */
export function getRecipes() {
  return recipesData?.recipes || [];
}

/**
 * Get recipe by ID
 */
export function getRecipeById(id) {
  return recipesData?.recipes.find(r => r.id === id) || null;
}

/**
 * Filter recipes by search query
 */
export function searchRecipes(recipes, query) {
  if (!query || query.length < 2) return recipes;

  const normalized = query.toLowerCase().trim();

  return recipes.filter(recipe => {
    return (
      recipe.title.toLowerCase().includes(normalized) ||
      recipe.description.toLowerCase().includes(normalized) ||
      recipe.cuisine.toLowerCase().includes(normalized) ||
      recipe.ingredients.some(ing =>
        ing.name.toLowerCase().includes(normalized)
      )
    );
  });
}

/**
 * Filter recipes by difficulty
 */
export function filterByDifficulty(recipes, difficulty) {
  if (difficulty === 'all') return recipes;
  return recipes.filter(r => r.difficulty === difficulty);
}

/**
 * Filter recipes by cuisine
 */
export function filterByCuisine(recipes, cuisine) {
  if (cuisine === 'all') return recipes;
  return recipes.filter(r => r.cuisine === cuisine);
}

/**
 * Get unique cuisines from recipes
 */
export function getUniqueCuisines(recipes) {
  const cuisines = new Set();
  recipes.forEach(r => cuisines.add(r.cuisine));
  return Array.from(cuisines).sort();
}

/**
 * Apply all filters
 */
export function applyFilters(recipes, filters = {}) {
  let result = [...recipes];

  if (filters.search) {
    result = searchRecipes(result, filters.search);
  }

  if (filters.difficulty && filters.difficulty !== 'all') {
    result = filterByDifficulty(result, filters.difficulty);
  }

  if (filters.cuisine && filters.cuisine !== 'all') {
    result = filterByCuisine(result, filters.cuisine);
  }

  return result;
}

export default {
  loadRecipes,
  getRecipes,
  getRecipeById,
  searchRecipes,
  filterByDifficulty,
  filterByCuisine,
  getUniqueCuisines,
  applyFilters
};
