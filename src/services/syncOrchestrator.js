/**
 * Sync Orchestrator
 * Coordinates data sync between localStorage and Supabase
 * Strategy: Last-write-wins with local-first approach
 */

import { isSupabaseConfigured } from '../lib/supabase.js';
import { getCurrentUser, onAuthStateChange } from './authService.js';
import {
  syncPantryToCloud,
  fetchPantryFromCloud,
  syncMealPlansToCloud,
  fetchMealPlansFromCloud,
  syncNutritionPrefsToCloud,
  fetchNutritionPrefsFromCloud
} from './profileSyncService.js';

// Sync state
let isSyncing = false;
let pendingSync = false;
let syncTimeout = null;
let listeners = [];

/**
 * Initialize sync on auth state change
 */
export function initSyncOrchestrator() {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, running in local-only mode');
    return;
  }

  // Sync on login/logout
  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('User signed in, pulling data from cloud...');
      await pullFromCloud();
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      // Keep local data - don't clear on logout
    }
  });

  // Initial sync if already logged in
  getCurrentUser().then(user => {
    if (user) {
      console.log('User already logged in, syncing...');
      pullFromCloud();
    }
  });
}

/**
 * Pull data from cloud and update localStorage
 * Cloud data overwrites local for authenticated users
 */
async function pullFromCloud() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    console.log('Pulling data from cloud...');

    // Fetch all data in parallel
    const [pantryResult, mealsResult, nutritionResult] = await Promise.all([
      fetchPantryFromCloud(),
      fetchMealPlansFromCloud(),
      fetchNutritionPrefsFromCloud()
    ]);

    // Update localStorage with cloud data
    if (pantryResult.success && pantryResult.items.length > 0) {
      localStorage.setItem('pantry_planner_items', JSON.stringify(pantryResult.items));
      notifyListeners('pantry', pantryResult.items);
    }

    if (mealsResult.success && Object.keys(mealsResult.meals).length > 0) {
      localStorage.setItem('pantry_planner_meals', JSON.stringify({
        version: '1.0.0',
        meals: mealsResult.meals
      }));
      notifyListeners('meals', mealsResult.meals);
    }

    if (nutritionResult.success && nutritionResult.prefs) {
      localStorage.setItem('pantry_planner_nutrition_prefs', JSON.stringify(nutritionResult.prefs));
      notifyListeners('nutrition', nutritionResult.prefs);
    }

    console.log('Cloud sync complete');
    notifyListeners('sync_complete', { success: true });

  } catch (error) {
    console.error('Cloud sync failed:', error);
    notifyListeners('sync_error', { error: error.message });
  } finally {
    isSyncing = false;
  }
}

/**
 * Push local changes to cloud (debounced)
 * Call this when local data changes
 */
export function schedulePushToCloud() {
  if (!isSupabaseConfigured()) return;

  // Debounce: Wait 2 seconds after last change
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    const user = await getCurrentUser();
    if (!user) return;

    if (isSyncing) {
      pendingSync = true;
      return;
    }

    await pushToCloud();

    // If there were changes during sync, sync again
    if (pendingSync) {
      pendingSync = false;
      schedulePushToCloud();
    }
  }, 2000);
}

/**
 * Actually push data to cloud
 */
async function pushToCloud() {
  isSyncing = true;

  try {
    console.log('Pushing changes to cloud...');

    // Get current local data
    const pantryData = JSON.parse(localStorage.getItem('pantry_planner_items') || '[]');
    const mealsData = JSON.parse(localStorage.getItem('pantry_planner_meals') || '{"meals":{}}');
    const nutritionData = JSON.parse(localStorage.getItem('pantry_planner_nutrition_prefs') || 'null');

    // Push all data in parallel
    const results = await Promise.all([
      syncPantryToCloud(pantryData),
      syncMealPlansToCloud(mealsData.meals || {}),
      nutritionData ? syncNutritionPrefsToCloud(nutritionData) : Promise.resolve({ success: true })
    ]);

    const allSucceeded = results.every(r => r.success);
    console.log('Push complete:', allSucceeded ? 'success' : 'partial failure');

    notifyListeners('push_complete', { success: allSucceeded, results });

  } catch (error) {
    console.error('Push failed:', error);
    notifyListeners('push_error', { error: error.message });
  } finally {
    isSyncing = false;
  }
}

/**
 * Force immediate sync (both directions)
 */
export async function forceSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  await pushToCloud();
  await pullFromCloud();
}

/**
 * Get current sync status
 */
export function getSyncStatus() {
  return {
    isSyncing,
    isConfigured: isSupabaseConfigured()
  };
}

/**
 * Subscribe to sync events
 * @param {Function} callback - Called with (eventType, data)
 */
export function onSyncEvent(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify all listeners
 */
function notifyListeners(eventType, data) {
  listeners.forEach(callback => {
    try {
      callback(eventType, data);
    } catch (error) {
      console.error('Sync listener error:', error);
    }
  });
}

export default {
  initSyncOrchestrator,
  schedulePushToCloud,
  forceSync,
  getSyncStatus,
  onSyncEvent
};
