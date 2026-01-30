/**
 * Profile Sync Service
 * Handles syncing local data (pantry, meal plans) to/from Supabase cloud storage
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getCurrentUser } from './authService.js';

/**
 * Sync pantry items to cloud
 * @param {Array} localItems - Array of pantry items from localStorage
 * @returns {Promise<{success: boolean, synced?: number, error?: string}>}
 */
export async function syncPantryToCloud(localItems) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!localItems || localItems.length === 0) {
    return { success: true, synced: 0 };
  }

  // Transform local items to cloud format
  const items = localItems.map(item => ({
    user_id: user.id,
    ingredient_id: item.ingredientId,
    quantity: item.quantity,
    unit: item.unit,
    storage: item.storage || 'pantry',
    notes: item.notes || null,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('pantry_items')
    .upsert(items, { onConflict: 'user_id,ingredient_id' });

  if (error) {
    console.error('Pantry sync error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, synced: items.length };
}

/**
 * Fetch pantry items from cloud
 * @returns {Promise<{success: boolean, items: Array, error?: string}>}
 */
export async function fetchPantryFromCloud() {
  if (!isSupabaseConfigured()) {
    return { success: false, items: [], error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, items: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Pantry fetch error:', error);
    return { success: false, items: [], error: error.message };
  }

  // Transform cloud items to local format
  const items = (data || []).map(item => ({
    ingredientId: item.ingredient_id,
    quantity: parseFloat(item.quantity),
    unit: item.unit,
    storage: item.storage,
    notes: item.notes,
    addedAt: item.updated_at,
    updatedAt: item.updated_at
  }));

  return { success: true, items };
}

/**
 * Sync meal plans to cloud
 * @param {Object} localMeals - Meals object keyed by date { "YYYY-MM-DD": [...meals] }
 * @returns {Promise<{success: boolean, synced?: number, error?: string}>}
 */
export async function syncMealPlansToCloud(localMeals) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!localMeals || Object.keys(localMeals).length === 0) {
    return { success: true, synced: 0 };
  }

  // Transform meals object to array of records
  const meals = [];
  Object.entries(localMeals).forEach(([date, dayMeals]) => {
    if (Array.isArray(dayMeals)) {
      dayMeals.forEach(meal => {
        meals.push({
          user_id: user.id,
          date: date,
          recipe_id: meal.recipeId,
          meal_type: meal.mealType,
          servings: meal.servings || 4,
          notes: meal.notes || null
        });
      });
    }
  });

  if (meals.length === 0) {
    return { success: true, synced: 0 };
  }

  const { error } = await supabase
    .from('meal_plans')
    .upsert(meals, { onConflict: 'user_id,date,recipe_id,meal_type' });

  if (error) {
    console.error('Meal plans sync error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, synced: meals.length };
}

/**
 * Fetch meal plans from cloud
 * @returns {Promise<{success: boolean, meals: Object, error?: string}>}
 */
export async function fetchMealPlansFromCloud() {
  if (!isSupabaseConfigured()) {
    return { success: false, meals: {}, error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, meals: {}, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (error) {
    console.error('Meal plans fetch error:', error);
    return { success: false, meals: {}, error: error.message };
  }

  // Transform to local format (grouped by date)
  const meals = {};
  (data || []).forEach(meal => {
    if (!meals[meal.date]) {
      meals[meal.date] = [];
    }
    meals[meal.date].push({
      id: `meal_${meal.id}`,
      recipeId: meal.recipe_id,
      mealType: meal.meal_type,
      servings: meal.servings,
      notes: meal.notes,
      addedAt: meal.created_at
    });
  });

  return { success: true, meals };
}

/**
 * Delete a pantry item from cloud
 * @param {string} ingredientId - The ingredient ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deletePantryItemFromCloud(ingredientId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('user_id', user.id)
    .eq('ingredient_id', ingredientId);

  if (error) {
    console.error('Pantry delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a meal plan from cloud
 * @param {string} date - The date of the meal
 * @param {string} recipeId - The recipe ID
 * @param {string} mealType - The meal type
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteMealPlanFromCloud(date, recipeId, mealType) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date)
    .eq('recipe_id', recipeId)
    .eq('meal_type', mealType);

  if (error) {
    console.error('Meal plan delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update profile stats in the cloud
 * @param {Object} stats - Stats to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateProfileStats(stats) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      total_meals_planned: stats.totalMealsPlanned,
      total_recipes_tried: stats.totalRecipesTried,
      current_streak: stats.currentStreak,
      longest_streak: stats.longestStreak
    })
    .eq('id', user.id);

  if (error) {
    console.error('Profile stats update error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export default {
  syncPantryToCloud,
  fetchPantryFromCloud,
  syncMealPlansToCloud,
  fetchMealPlansFromCloud,
  deletePantryItemFromCloud,
  deleteMealPlanFromCloud,
  updateProfileStats
};
