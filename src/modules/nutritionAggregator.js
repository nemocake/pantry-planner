/**
 * Nutrition Aggregator Module
 * Aggregates nutrition data across meals for daily and weekly totals
 */

import { getMealsForDate, getMealsForWeek, getWeekDates, formatDate, MEAL_STATUS } from './mealPlanManager.js';
import { getRecipeById } from './recipeManager.js';
import { getIngredientsMap } from './ingredientManager.js';
import { calculateRecipeNutrition } from './nutritionCalculator.js';
import { getNutritionPrefs, getAllDailyGoals, isTrackingEnabled } from './nutritionPrefsManager.js';

/**
 * Calculate nutrition for a single meal entry
 * Each meal added counts as 1 serving for nutrition tracking
 * Future: meal.status can modify this (e.g., 'ate', 'seconds', 'dismissed')
 */
function calculateMealNutrition(meal) {
  const recipe = getRecipeById(meal.recipeId);
  if (!recipe) return null;

  const ingredientsMap = getIngredientsMap();
  const recipeNutrition = calculateRecipeNutrition(recipe, ingredientsMap);

  if (!recipeNutrition || !recipeNutrition.perServing) return null;

  // Each meal entry = 1 serving consumed for tracking purposes
  // meal.servings represents how many servings the recipe makes (for shopping list)
  // but for nutrition tracking, each meal added = 1 serving eaten
  return {
    calories: recipeNutrition.perServing.calories,
    protein: recipeNutrition.perServing.protein,
    carbs: recipeNutrition.perServing.carbs,
    fat: recipeNutrition.perServing.fat,
    fiber: recipeNutrition.perServing.fiber,
    recipeName: recipe.title,
    servingsConsumed: 1
  };
}

/**
 * Calculate total nutrition for a specific date
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} - { total: {...}, meals: [...], goals: {...}, percentages: {...} }
 */
export function calculateDayNutrition(dateStr) {
  const meals = getMealsForDate(dateStr);
  const goals = getAllDailyGoals();

  const result = {
    total: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    meals: [],
    mealCount: 0,
    goals,
    percentages: {},
    status: {} // over, under, on-target for each macro
  };

  meals.forEach(meal => {
    const mealNutrition = calculateMealNutrition(meal);
    if (mealNutrition) {
      result.total.calories += mealNutrition.calories;
      result.total.protein += mealNutrition.protein;
      result.total.carbs += mealNutrition.carbs;
      result.total.fat += mealNutrition.fat;
      result.total.fiber += mealNutrition.fiber;
      result.meals.push({
        mealId: meal.id,
        mealType: meal.mealType,
        ...mealNutrition
      });
      result.mealCount++;
    }
  });

  // Round totals
  result.total.protein = Math.round(result.total.protein * 10) / 10;
  result.total.carbs = Math.round(result.total.carbs * 10) / 10;
  result.total.fat = Math.round(result.total.fat * 10) / 10;
  result.total.fiber = Math.round(result.total.fiber * 10) / 10;

  // Calculate percentages and status for each macro
  Object.keys(goals).forEach(macro => {
    const goal = goals[macro];
    const actual = result.total[macro];
    const percent = goal.target > 0 ? Math.round((actual / goal.target) * 100) : 0;
    result.percentages[macro] = percent;

    // Determine status based on goal type
    if (goal.type === 'limit') {
      if (percent > 100) {
        result.status[macro] = 'over';
      } else if (percent >= 80) {
        result.status[macro] = 'near';
      } else {
        result.status[macro] = 'under';
      }
    } else { // minimum
      if (percent >= 100) {
        result.status[macro] = 'met';
      } else if (percent >= 80) {
        result.status[macro] = 'near';
      } else {
        result.status[macro] = 'under';
      }
    }
  });

  return result;
}

/**
 * Get remaining nutrition budget for a date
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} - Remaining amounts for each macro
 */
export function getRemainingNutrition(dateStr) {
  const dayData = calculateDayNutrition(dateStr);
  const remaining = {};

  Object.keys(dayData.goals).forEach(macro => {
    const goal = dayData.goals[macro];
    const consumed = dayData.total[macro];

    if (goal.type === 'limit') {
      // For limits, remaining is what's left before hitting the limit
      remaining[macro] = Math.max(0, goal.target - consumed);
    } else {
      // For minimums, remaining is what's still needed to meet the goal
      remaining[macro] = Math.max(0, goal.target - consumed);
    }
  });

  remaining.consumed = dayData.total;
  remaining.goals = dayData.goals;
  remaining.percentages = dayData.percentages;

  return remaining;
}

/**
 * Calculate nutrition totals for a week
 * @param {string|Date} startDate - Start of the week
 * @returns {Object} - Weekly totals, daily breakdown, and goal comparison
 */
export function calculateWeekNutrition(startDate) {
  const weekDates = getWeekDates(startDate);
  const goals = getAllDailyGoals();

  const result = {
    total: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    dailyAverage: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    days: {},
    daysWithMeals: 0,
    weeklyGoals: {}, // Daily goals * 7
    weeklyPercentages: {},
    averagePercentages: {} // How close to daily goal on average
  };

  // Calculate weekly goals (daily * 7)
  Object.keys(goals).forEach(macro => {
    result.weeklyGoals[macro] = {
      target: goals[macro].target * 7,
      type: goals[macro].type
    };
  });

  // Calculate each day
  weekDates.forEach(dateStr => {
    const dayData = calculateDayNutrition(dateStr);
    result.days[dateStr] = dayData;

    // Add to totals
    result.total.calories += dayData.total.calories;
    result.total.protein += dayData.total.protein;
    result.total.carbs += dayData.total.carbs;
    result.total.fat += dayData.total.fat;
    result.total.fiber += dayData.total.fiber;

    if (dayData.mealCount > 0) {
      result.daysWithMeals++;
    }
  });

  // Calculate daily averages (based on days with meals or all 7 days)
  const divisor = result.daysWithMeals > 0 ? result.daysWithMeals : 7;
  Object.keys(result.total).forEach(macro => {
    result.dailyAverage[macro] = Math.round((result.total[macro] / divisor) * 10) / 10;
  });

  // Calculate weekly percentages (total vs weekly goal)
  Object.keys(goals).forEach(macro => {
    const weeklyGoal = result.weeklyGoals[macro].target;
    result.weeklyPercentages[macro] = weeklyGoal > 0
      ? Math.round((result.total[macro] / weeklyGoal) * 100)
      : 0;

    // Average percentage (daily average vs daily goal)
    const dailyGoal = goals[macro].target;
    result.averagePercentages[macro] = dailyGoal > 0
      ? Math.round((result.dailyAverage[macro] / dailyGoal) * 100)
      : 0;
  });

  return result;
}

/**
 * Get a summary of nutrition status for display
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} - Simplified status for UI display
 */
export function getDayNutritionSummary(dateStr) {
  if (!isTrackingEnabled()) {
    return null;
  }

  const dayData = calculateDayNutrition(dateStr);
  const prefs = getNutritionPrefs();
  const primaryMacro = prefs.displaySettings.primaryMacro || 'calories';

  const primary = {
    macro: primaryMacro,
    consumed: dayData.total[primaryMacro],
    goal: dayData.goals[primaryMacro]?.target || 0,
    percent: dayData.percentages[primaryMacro] || 0,
    status: dayData.status[primaryMacro] || 'under',
    type: dayData.goals[primaryMacro]?.type || 'limit'
  };

  // Determine overall day status
  let overallStatus = 'on-track';
  const limitMacros = ['calories', 'carbs', 'fat'];
  const minimumMacros = ['protein', 'fiber'];

  // Check if any limits exceeded
  const overLimits = limitMacros.filter(m => dayData.status[m] === 'over');
  if (overLimits.length > 0) {
    overallStatus = 'over-limit';
  }

  // Check if minimums are met
  const underMinimums = minimumMacros.filter(m => dayData.status[m] === 'under');

  return {
    primary,
    mealCount: dayData.mealCount,
    total: dayData.total,
    percentages: dayData.percentages,
    status: dayData.status,
    overallStatus,
    hasWarnings: overLimits.length > 0,
    needsMore: underMinimums
  };
}

/**
 * Check if a recipe (1 serving) fits within remaining nutrition budget
 * @param {Object} recipe - Recipe object
 * @param {string} dateStr - Date to check against
 * @returns {Object} - { fits: boolean, wouldExceed: [...], remaining: {...} }
 */
export function checkRecipeFitsNutrition(recipe, dateStr) {
  const remaining = getRemainingNutrition(dateStr);
  const ingredientsMap = getIngredientsMap();
  const recipeNutrition = calculateRecipeNutrition(recipe, ingredientsMap);

  if (!recipeNutrition || !recipeNutrition.perServing) {
    return { fits: true, wouldExceed: [], remaining };
  }

  // Check against 1 serving (each meal added = 1 serving consumed)
  const perServing = recipeNutrition.perServing;

  const wouldExceed = [];
  const goals = remaining.goals;

  // Check limit macros
  ['calories', 'carbs', 'fat'].forEach(macro => {
    if (goals[macro].type === 'limit' && perServing[macro] > remaining[macro]) {
      wouldExceed.push({
        macro,
        recipeAmount: Math.round(perServing[macro]),
        remaining: Math.round(remaining[macro]),
        excess: Math.round(perServing[macro] - remaining[macro])
      });
    }
  });

  return {
    fits: wouldExceed.length === 0,
    wouldExceed,
    remaining,
    recipeNutrition: perServing
  };
}

/**
 * Format nutrition value for display
 */
export function formatNutritionValue(value, macro) {
  if (macro === 'calories') {
    return Math.round(value).toLocaleString();
  }
  return Math.round(value * 10) / 10 + 'g';
}

/**
 * Get color class for nutrition status
 */
export function getNutritionStatusColor(percent, type = 'limit') {
  if (type === 'limit') {
    if (percent > 100) return 'red';
    if (percent >= 80) return 'yellow';
    return 'green';
  } else { // minimum
    if (percent >= 100) return 'green';
    if (percent >= 80) return 'yellow';
    return 'red';
  }
}

// ============================================
// Actual Consumption Tracking Functions
// ============================================

/**
 * Calculate ACTUAL consumed nutrition for a date
 * Only counts meals with status='eaten', uses consumedServings
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} - { total: {...}, meals: [...], goals: {...}, percentages: {...} }
 */
export function calculateActualDayNutrition(dateStr) {
  const allMeals = getMealsForDate(dateStr);
  const eatenMeals = allMeals.filter(m => m.status === MEAL_STATUS.EATEN);
  const goals = getAllDailyGoals();

  const result = {
    total: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    meals: [],
    mealCount: 0,
    goals,
    percentages: {},
    status: {}
  };

  eatenMeals.forEach(meal => {
    const recipe = getRecipeById(meal.recipeId);
    if (!recipe) return;

    const ingredientsMap = getIngredientsMap();
    const recipeNutrition = calculateRecipeNutrition(recipe, ingredientsMap);
    if (!recipeNutrition?.perServing) return;

    // Use consumedServings instead of fixed 1
    const servings = meal.consumedServings || 1;

    result.total.calories += recipeNutrition.perServing.calories * servings;
    result.total.protein += recipeNutrition.perServing.protein * servings;
    result.total.carbs += recipeNutrition.perServing.carbs * servings;
    result.total.fat += recipeNutrition.perServing.fat * servings;
    result.total.fiber += recipeNutrition.perServing.fiber * servings;

    result.meals.push({
      mealId: meal.id,
      mealType: meal.mealType,
      recipeName: recipe.title,
      servingsConsumed: servings,
      consumedAt: meal.consumedAt
    });
    result.mealCount++;
  });

  // Round totals
  result.total.calories = Math.round(result.total.calories);
  result.total.protein = Math.round(result.total.protein * 10) / 10;
  result.total.carbs = Math.round(result.total.carbs * 10) / 10;
  result.total.fat = Math.round(result.total.fat * 10) / 10;
  result.total.fiber = Math.round(result.total.fiber * 10) / 10;

  // Calculate percentages and status
  Object.keys(goals).forEach(macro => {
    const goal = goals[macro];
    const actual = result.total[macro];
    const percent = goal.target > 0 ? Math.round((actual / goal.target) * 100) : 0;
    result.percentages[macro] = percent;

    if (goal.type === 'limit') {
      result.status[macro] = percent > 100 ? 'over' : percent >= 80 ? 'near' : 'under';
    } else {
      result.status[macro] = percent >= 100 ? 'met' : percent >= 80 ? 'near' : 'under';
    }
  });

  return result;
}

/**
 * Compare planned vs actual nutrition for a date
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} - { planned: {...}, actual: {...}, difference: {...} }
 */
export function getDayNutritionComparison(dateStr) {
  const planned = calculateDayNutrition(dateStr);
  const actual = calculateActualDayNutrition(dateStr);

  const difference = {
    calories: actual.total.calories - planned.total.calories,
    protein: actual.total.protein - planned.total.protein,
    carbs: actual.total.carbs - planned.total.carbs,
    fat: actual.total.fat - planned.total.fat,
    fiber: actual.total.fiber - planned.total.fiber
  };

  return {
    planned,
    actual,
    difference,
    hasActualData: actual.mealCount > 0
  };
}

/**
 * Calculate actual nutrition totals for a week
 * @param {string|Date} startDate - Start of the week
 * @returns {Object} - Weekly actual totals and daily breakdown
 */
export function calculateWeekActualNutrition(startDate) {
  const weekDates = getWeekDates(startDate);
  const goals = getAllDailyGoals();

  const result = {
    total: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    dailyAverage: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    days: {},
    daysWithMeals: 0,
    weeklyGoals: {},
    weeklyPercentages: {},
    averagePercentages: {}
  };

  // Calculate weekly goals
  Object.keys(goals).forEach(macro => {
    result.weeklyGoals[macro] = {
      target: goals[macro].target * 7,
      type: goals[macro].type
    };
  });

  // Calculate each day
  weekDates.forEach(dateStr => {
    const dayData = calculateActualDayNutrition(dateStr);
    result.days[dateStr] = dayData;

    result.total.calories += dayData.total.calories;
    result.total.protein += dayData.total.protein;
    result.total.carbs += dayData.total.carbs;
    result.total.fat += dayData.total.fat;
    result.total.fiber += dayData.total.fiber;

    if (dayData.mealCount > 0) {
      result.daysWithMeals++;
    }
  });

  // Calculate daily averages
  const divisor = result.daysWithMeals > 0 ? result.daysWithMeals : 7;
  Object.keys(result.total).forEach(macro => {
    result.dailyAverage[macro] = Math.round((result.total[macro] / divisor) * 10) / 10;
  });

  // Calculate percentages
  Object.keys(goals).forEach(macro => {
    const weeklyGoal = result.weeklyGoals[macro].target;
    result.weeklyPercentages[macro] = weeklyGoal > 0
      ? Math.round((result.total[macro] / weeklyGoal) * 100)
      : 0;

    const dailyGoal = goals[macro].target;
    result.averagePercentages[macro] = dailyGoal > 0
      ? Math.round((result.dailyAverage[macro] / dailyGoal) * 100)
      : 0;
  });

  return result;
}

/**
 * Get actual nutrition summary for display (similar to planned but for actual)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object|null} - Simplified status for UI display
 */
export function getActualNutritionSummary(dateStr) {
  if (!isTrackingEnabled()) return null;

  const dayData = calculateActualDayNutrition(dateStr);
  const prefs = getNutritionPrefs();
  const primaryMacro = prefs.displaySettings.primaryMacro || 'calories';

  return {
    primary: {
      macro: primaryMacro,
      consumed: dayData.total[primaryMacro],
      goal: dayData.goals[primaryMacro]?.target || 0,
      percent: dayData.percentages[primaryMacro] || 0,
      status: dayData.status[primaryMacro] || 'under',
      type: dayData.goals[primaryMacro]?.type || 'limit'
    },
    mealCount: dayData.mealCount,
    total: dayData.total,
    percentages: dayData.percentages,
    status: dayData.status
  };
}

export default {
  calculateDayNutrition,
  getRemainingNutrition,
  calculateWeekNutrition,
  getDayNutritionSummary,
  checkRecipeFitsNutrition,
  formatNutritionValue,
  getNutritionStatusColor,
  // Actual consumption tracking
  calculateActualDayNutrition,
  getDayNutritionComparison,
  calculateWeekActualNutrition,
  getActualNutritionSummary
};
