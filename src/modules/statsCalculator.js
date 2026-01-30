/**
 * Stats Calculator Module
 * Calculates user cooking statistics from local and cloud data
 */

import { getRecipeById } from './recipeManager.js';

/**
 * Calculate stats from local meal plan data
 * @param {Array} allMeals - Flat array of all meals from mealPlanManager
 * @returns {Object} Statistics object
 */
export function calculateLocalStats(allMeals = []) {
  if (!allMeals || allMeals.length === 0) {
    return {
      totalMealsPlanned: 0,
      totalRecipesTried: 0,
      currentStreak: 0,
      longestStreak: 0,
      favoriteCuisines: []
    };
  }

  // Total meals planned
  const totalMealsPlanned = allMeals.length;

  // Unique recipes tried
  const uniqueRecipeIds = new Set(allMeals.map(m => m.recipeId));
  const totalRecipesTried = uniqueRecipeIds.size;

  // Count cuisines
  const cuisineCounts = {};
  allMeals.forEach(meal => {
    const recipe = getRecipeById(meal.recipeId);
    if (recipe?.cuisine) {
      const cuisine = recipe.cuisine.toLowerCase();
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    }
  });

  // Sort cuisines by count (top 5)
  const favoriteCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cuisine, count]) => ({ cuisine, count }));

  // Calculate cooking streak
  const mealDates = [...new Set(allMeals.map(m => m.date))].sort().reverse();
  const { currentStreak, longestStreak } = calculateStreak(mealDates);

  return {
    totalMealsPlanned,
    totalRecipesTried,
    currentStreak,
    longestStreak,
    favoriteCuisines
  };
}

/**
 * Calculate streak from array of dates
 * @param {Array} sortedDates - Array of date strings sorted in descending order
 * @returns {Object} { currentStreak, longestStreak }
 */
function calculateStreak(sortedDates) {
  if (!sortedDates || sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateStr(today);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  // Check if streak includes today or yesterday
  const firstDate = sortedDates[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateStr(yesterday);

  // Only count current streak if it's connected to today or yesterday
  const startsRecent = firstDate === todayStr || firstDate === yesterdayStr;

  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = sortedDates[i];
    const date = new Date(dateStr + 'T00:00:00');

    if (lastDate === null) {
      tempStreak = 1;
    } else {
      const expectedDate = new Date(lastDate);
      expectedDate.setDate(expectedDate.getDate() - 1);

      if (formatDateStr(date) === formatDateStr(expectedDate)) {
        tempStreak++;
      } else {
        // Streak broken
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }

    lastDate = date;
  }

  // Check final streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  // Current streak only counts if it's recent
  currentStreak = startsRecent ? tempStreak : 0;

  // Recalculate current streak properly
  if (startsRecent) {
    currentStreak = 0;
    let checkDate = new Date(today);

    // If today has no meals, start from yesterday
    if (firstDate !== todayStr) {
      checkDate = yesterday;
    }

    for (const dateStr of sortedDates) {
      const checkDateStr = formatDateStr(checkDate);
      if (dateStr === checkDateStr) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < checkDateStr) {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateStr(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Merge local stats with cloud profile stats
 * @param {Object} localStats - Stats calculated from local data
 * @param {Object} cloudProfile - Profile data from Supabase
 * @returns {Object} Merged stats
 */
export function mergeStats(localStats, cloudProfile) {
  if (!cloudProfile) return localStats;

  return {
    totalMealsPlanned: Math.max(
      localStats.totalMealsPlanned || 0,
      cloudProfile.total_meals_planned || 0
    ),
    totalRecipesTried: Math.max(
      localStats.totalRecipesTried || 0,
      cloudProfile.total_recipes_tried || 0
    ),
    currentStreak: Math.max(
      localStats.currentStreak || 0,
      cloudProfile.current_streak || 0
    ),
    longestStreak: Math.max(
      localStats.longestStreak || 0,
      cloudProfile.longest_streak || 0
    ),
    // Local calculation is more accurate for cuisines
    favoriteCuisines: localStats.favoriteCuisines || []
  };
}

/**
 * Get cuisine display info (icon and formatted name)
 * @param {string} cuisine - Cuisine identifier
 * @returns {Object} { icon, name }
 */
export function getCuisineInfo(cuisine) {
  const cuisineMap = {
    italian: { icon: '🇮🇹', name: 'Italian' },
    mexican: { icon: '🇲🇽', name: 'Mexican' },
    asian: { icon: '🥢', name: 'Asian' },
    american: { icon: '🇺🇸', name: 'American' },
    chinese: { icon: '🇨🇳', name: 'Chinese' },
    japanese: { icon: '🇯🇵', name: 'Japanese' },
    indian: { icon: '🇮🇳', name: 'Indian' },
    mediterranean: { icon: '🫒', name: 'Mediterranean' },
    thai: { icon: '🇹🇭', name: 'Thai' },
    greek: { icon: '🇬🇷', name: 'Greek' },
    french: { icon: '🇫🇷', name: 'French' },
    korean: { icon: '🇰🇷', name: 'Korean' },
    spanish: { icon: '🇪🇸', name: 'Spanish' },
    vietnamese: { icon: '🇻🇳', name: 'Vietnamese' },
    middle_eastern: { icon: '🧆', name: 'Middle Eastern' },
    cajun: { icon: '🦐', name: 'Cajun' },
    caribbean: { icon: '🌴', name: 'Caribbean' },
    british: { icon: '🇬🇧', name: 'British' },
    german: { icon: '🇩🇪', name: 'German' },
    ethiopian: { icon: '🇪🇹', name: 'Ethiopian' }
  };

  const key = cuisine?.toLowerCase().replace(/\s+/g, '_');
  return cuisineMap[key] || {
    icon: '🍽️',
    name: cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : 'Unknown'
  };
}

/**
 * Format a large number with K/M suffix
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatStatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default {
  calculateLocalStats,
  mergeStats,
  getCuisineInfo,
  formatStatNumber
};
