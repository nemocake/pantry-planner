/**
 * Match Algorithm Module
 * Calculates recipe matching scores based on pantry contents
 */

import { getIngredientById } from './ingredientManager.js';
import { getPantryIngredientIds } from './pantryManager.js';

/**
 * Calculate match score for a recipe against current pantry
 */
export function calculateMatchScore(recipe, pantryIds = null) {
  const pantry = pantryIds || getPantryIngredientIds();

  let requiredCount = 0;
  let requiredHave = 0;
  let optionalCount = 0;
  let optionalHave = 0;

  const matched = [];
  const missing = [];

  recipe.ingredients.forEach(recipeIng => {
    const ingredient = getIngredientById(recipeIng.ingredientId);
    const hasIt = pantry.has(recipeIng.ingredientId);

    if (recipeIng.optional) {
      optionalCount++;
      if (hasIt) {
        optionalHave++;
        matched.push({ ...recipeIng, ingredient, optional: true });
      }
    } else {
      requiredCount++;
      if (hasIt) {
        requiredHave++;
        matched.push({ ...recipeIng, ingredient, optional: false });
      } else {
        missing.push({ ...recipeIng, ingredient, optional: false });
      }
    }
  });

  // Calculate percentage of required ingredients
  const requiredPercent = requiredCount > 0
    ? Math.round((requiredHave / requiredCount) * 100)
    : 100;

  // Calculate overall score (required=10pts, optional=3pts)
  const maxScore = (requiredCount * 10) + (optionalCount * 3);
  const actualScore = (requiredHave * 10) + (optionalHave * 3);
  const score = maxScore > 0 ? Math.round((actualScore / maxScore) * 100) : 0;

  // Determine match type
  let matchType;
  if (requiredPercent === 100) {
    matchType = 'full';
  } else if (requiredPercent >= 70) {
    matchType = 'partial';
  } else if (requiredPercent >= 50) {
    matchType = 'minimal';
  } else {
    matchType = 'none';
  }

  return {
    score,
    requiredPercent,
    matchType,
    matched,
    missing,
    requiredHave,
    requiredCount,
    optionalHave,
    optionalCount
  };
}

/**
 * Get all recipes sorted by match score
 */
export function getMatchedRecipes(recipes, pantryIds = null) {
  const pantry = pantryIds || getPantryIngredientIds();

  return recipes
    .map(recipe => ({
      ...recipe,
      matchResult: calculateMatchScore(recipe, pantry)
    }))
    .sort((a, b) => {
      // Sort by match type first, then by score
      const typeOrder = { full: 0, partial: 1, minimal: 2, none: 3 };
      const typeDiff = typeOrder[a.matchResult.matchType] - typeOrder[b.matchResult.matchType];

      if (typeDiff !== 0) return typeDiff;
      return b.matchResult.score - a.matchResult.score;
    });
}

/**
 * Filter recipes by match type
 */
export function filterByMatchType(matchedRecipes, matchType) {
  if (matchType === 'all') return matchedRecipes;

  return matchedRecipes.filter(recipe => {
    switch (matchType) {
      case 'full':
        return recipe.matchResult.matchType === 'full';
      case 'partial':
        return recipe.matchResult.requiredPercent >= 70;
      case 'minimal':
        return recipe.matchResult.requiredPercent >= 50;
      default:
        return true;
    }
  });
}

/**
 * Count recipes that can be made (100% match)
 */
export function countMakeableRecipes(recipes, pantryIds = null) {
  const pantry = pantryIds || getPantryIngredientIds();

  return recipes.filter(recipe => {
    const match = calculateMatchScore(recipe, pantry);
    return match.matchType === 'full';
  }).length;
}

export default {
  calculateMatchScore,
  getMatchedRecipes,
  filterByMatchType,
  countMakeableRecipes
};
