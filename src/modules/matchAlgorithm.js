/**
 * Match Algorithm Module
 * Calculates recipe matching scores based on pantry contents
 * Extended with nutrition-based suggestions
 */

import { getIngredientById, getIngredientsMap } from './ingredientManager.js';
import { getPantryIngredientIds } from './pantryManager.js';
import { calculateRecipeNutrition } from './nutritionCalculator.js';
import { getRemainingNutrition, checkRecipeFitsNutrition } from './nutritionAggregator.js';
import { isTrackingEnabled, getAllDailyGoals } from './nutritionPrefsManager.js';
import { getRecipes } from './recipeManager.js';

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

/**
 * Score how well a recipe (1 serving) fits the remaining nutrition budget
 * Lower score = better fit
 * @param {Object} recipe - Recipe object
 * @param {Object} remainingNutrition - Remaining budget from getRemainingNutrition()
 * @returns {Object} - { score, details, fits }
 */
export function scoreRecipeNutritionFit(recipe, remainingNutrition) {
  const ingredientsMap = getIngredientsMap();
  const recipeNutrition = calculateRecipeNutrition(recipe, ingredientsMap);

  if (!recipeNutrition || !recipeNutrition.perServing) {
    return { score: 1000, details: {}, fits: false, noData: true };
  }

  const goals = remainingNutrition.goals;

  // Use per-serving values (each meal added = 1 serving consumed)
  const perServing = recipeNutrition.perServing;

  let score = 0;
  const details = {};
  let fits = true;

  // Score each macro based on how well it fits
  // For limits: penalize exceeding, reward using ~70-90% of remaining
  // For minimums: reward meeting goals
  Object.keys(goals).forEach(macro => {
    const remaining = remainingNutrition[macro] || 0;
    const recipeAmount = perServing[macro];
    const goal = goals[macro];

    if (goal.type === 'limit') {
      // For limits (calories, carbs, fat)
      if (recipeAmount > remaining) {
        // Exceeds remaining - heavy penalty
        const excess = recipeAmount - remaining;
        const excessPercent = (excess / goal.target) * 100;
        score += excessPercent * 2; // Heavy penalty for exceeding
        fits = false;
        details[macro] = { status: 'exceeds', excess, remaining, recipeAmount };
      } else if (remaining > 0) {
        // Fits within remaining
        const usePercent = (recipeAmount / remaining) * 100;
        // Best score when using 60-80% of remaining
        if (usePercent >= 60 && usePercent <= 80) {
          score -= 5; // Bonus for good fit
        } else if (usePercent > 80 && usePercent <= 100) {
          score += 0; // Neutral
        } else if (usePercent < 30) {
          score += 2; // Small penalty for too small
        }
        details[macro] = { status: 'fits', usePercent: Math.round(usePercent), remaining, recipeAmount };
      }
    } else {
      // For minimums (protein, fiber)
      const consumed = remainingNutrition.consumed?.[macro] || 0;
      const stillNeeded = Math.max(0, goal.target - consumed);
      const contribution = recipeAmount;

      if (contribution >= stillNeeded && stillNeeded > 0) {
        // Recipe helps meet the goal
        score -= 10; // Bonus for helping meet minimum
        details[macro] = { status: 'helps-meet-goal', contribution, stillNeeded };
      } else if (contribution > 0) {
        // Partial contribution
        const helpPercent = stillNeeded > 0 ? (contribution / stillNeeded) * 100 : 100;
        score -= Math.min(5, helpPercent / 20); // Smaller bonus
        details[macro] = { status: 'partial', contribution, stillNeeded };
      }
    }
  });

  return {
    score: Math.round(score * 10) / 10,
    details,
    fits,
    perServing
  };
}

/**
 * Get recipes sorted by how well they fit the remaining nutrition budget
 * @param {string} dateStr - Date to check against (YYYY-MM-DD)
 * @param {string} mealType - Optional meal type filter
 * @param {number} maxResults - Maximum results to return
 * @returns {Array} - Sorted recipes with nutrition fit scores
 */
export function getNutritionBasedSuggestions(dateStr, mealType = null, maxResults = 5) {
  if (!isTrackingEnabled()) {
    return [];
  }

  const remaining = getRemainingNutrition(dateStr);
  let recipes = getRecipes();

  // Filter by meal type if specified
  if (mealType) {
    recipes = recipes.filter(r => {
      if (Array.isArray(r.mealType)) {
        return r.mealType.includes(mealType);
      }
      return r.mealType === mealType;
    });
  }

  // Score each recipe
  const scored = recipes.map(recipe => {
    const nutritionFit = scoreRecipeNutritionFit(recipe, remaining);
    const pantryMatch = calculateMatchScore(recipe);

    return {
      ...recipe,
      nutritionFit,
      pantryMatch: pantryMatch,
      // Combined score: prefer recipes that fit nutrition AND have ingredients
      combinedScore: nutritionFit.score + (pantryMatch.matchType === 'none' ? 50 : 0)
    };
  });

  // Filter to only recipes that fit and have reasonable pantry match
  const fitting = scored
    .filter(r => r.nutritionFit.fits && !r.nutritionFit.noData)
    .filter(r => r.pantryMatch.requiredPercent >= 50) // At least half the ingredients
    .sort((a, b) => {
      // Sort by combined score (lower is better)
      // Then by pantry match (higher is better)
      if (a.combinedScore !== b.combinedScore) {
        return a.combinedScore - b.combinedScore;
      }
      return b.pantryMatch.score - a.pantryMatch.score;
    })
    .slice(0, maxResults);

  return fitting;
}

/**
 * Get recipe suggestions that fit both nutrition and pantry constraints
 * Used for the meal planner suggestions panel
 */
export function getSuggestionsForDate(dateStr, options = {}) {
  const {
    mealType = null,
    maxResults = 5,
    includePartialMatch = true,
    minPantryMatch = 50
  } = options;

  if (!isTrackingEnabled()) {
    // Fall back to pantry-based suggestions only
    let recipes = getRecipes();
    if (mealType) {
      recipes = recipes.filter(r => {
        if (Array.isArray(r.mealType)) return r.mealType.includes(mealType);
        return r.mealType === mealType;
      });
    }
    return getMatchedRecipes(recipes)
      .filter(r => r.matchResult.requiredPercent >= minPantryMatch)
      .slice(0, maxResults);
  }

  const remaining = getRemainingNutrition(dateStr);
  let recipes = getRecipes();

  if (mealType) {
    recipes = recipes.filter(r => {
      if (Array.isArray(r.mealType)) return r.mealType.includes(mealType);
      return r.mealType === mealType;
    });
  }

  // Score all recipes
  const scored = recipes.map(recipe => {
    const nutritionFit = scoreRecipeNutritionFit(recipe, remaining);
    const pantryMatch = calculateMatchScore(recipe);

    return {
      ...recipe,
      nutritionFit,
      matchResult: pantryMatch,
      fitsNutrition: nutritionFit.fits,
      // Priority: fits nutrition + full pantry match > fits nutrition + partial > doesn't fit
      priority: (nutritionFit.fits ? 0 : 100) + (100 - pantryMatch.requiredPercent)
    };
  });

  // Sort and filter
  let results = scored
    .filter(r => includePartialMatch || r.matchResult.requiredPercent >= 100)
    .filter(r => r.matchResult.requiredPercent >= minPantryMatch)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxResults);

  return results;
}

export default {
  calculateMatchScore,
  getMatchedRecipes,
  filterByMatchType,
  countMakeableRecipes,
  scoreRecipeNutritionFit,
  getNutritionBasedSuggestions,
  getSuggestionsForDate
};
