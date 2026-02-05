/**
 * Nutrition Preferences Manager Module
 * Handles user nutrition goals, localStorage persistence, and preference presets
 */

import { schedulePushToCloud } from '../services/syncOrchestrator.js';

const STORAGE_KEY = 'pantry_planner_nutrition_prefs';

// Default nutrition goals
const DEFAULT_PREFS = {
  enabled: true,
  goals: {
    daily: {
      calories: { target: 2000, type: 'limit' },
      protein: { target: 120, type: 'minimum' },
      carbs: { target: 250, type: 'limit' },
      fat: { target: 65, type: 'limit' },
      fiber: { target: 30, type: 'minimum' }
    }
  },
  displaySettings: {
    showOnCalendar: true,
    primaryMacro: 'calories'
  }
};

// Preset configurations
const PRESETS = {
  weightLoss: {
    name: 'Weight Loss',
    goals: {
      daily: {
        calories: { target: 1500, type: 'limit' },
        protein: { target: 130, type: 'minimum' },
        carbs: { target: 150, type: 'limit' },
        fat: { target: 50, type: 'limit' },
        fiber: { target: 35, type: 'minimum' }
      }
    }
  },
  maintenance: {
    name: 'Maintenance',
    goals: {
      daily: {
        calories: { target: 2000, type: 'limit' },
        protein: { target: 100, type: 'minimum' },
        carbs: { target: 250, type: 'limit' },
        fat: { target: 65, type: 'limit' },
        fiber: { target: 30, type: 'minimum' }
      }
    }
  },
  muscleGain: {
    name: 'Muscle Gain',
    goals: {
      daily: {
        calories: { target: 2800, type: 'limit' },
        protein: { target: 180, type: 'minimum' },
        carbs: { target: 350, type: 'limit' },
        fat: { target: 85, type: 'limit' },
        fiber: { target: 35, type: 'minimum' }
      }
    }
  },
  lowCarb: {
    name: 'Low Carb',
    goals: {
      daily: {
        calories: { target: 1800, type: 'limit' },
        protein: { target: 140, type: 'minimum' },
        carbs: { target: 50, type: 'limit' },
        fat: { target: 120, type: 'limit' },
        fiber: { target: 25, type: 'minimum' }
      }
    }
  },
  highProtein: {
    name: 'High Protein',
    goals: {
      daily: {
        calories: { target: 2200, type: 'limit' },
        protein: { target: 200, type: 'minimum' },
        carbs: { target: 200, type: 'limit' },
        fat: { target: 60, type: 'limit' },
        fiber: { target: 30, type: 'minimum' }
      }
    }
  }
};

let nutritionPrefs = null;
let listeners = [];

/**
 * Initialize nutrition preferences from localStorage
 */
export function initNutritionPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      nutritionPrefs = mergeWithDefaults(parsed);
    } else {
      // Deep clone defaults to avoid mutations
      nutritionPrefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
      savePrefs();
    }
  } catch (error) {
    console.error('Failed to load nutrition preferences:', error);
    nutritionPrefs = { ...DEFAULT_PREFS };
  }
  return nutritionPrefs;
}

/**
 * Merge stored prefs with defaults to handle missing fields
 */
function mergeWithDefaults(stored) {
  return {
    enabled: stored.enabled ?? DEFAULT_PREFS.enabled,
    goals: {
      daily: {
        calories: stored.goals?.daily?.calories || DEFAULT_PREFS.goals.daily.calories,
        protein: stored.goals?.daily?.protein || DEFAULT_PREFS.goals.daily.protein,
        carbs: stored.goals?.daily?.carbs || DEFAULT_PREFS.goals.daily.carbs,
        fat: stored.goals?.daily?.fat || DEFAULT_PREFS.goals.daily.fat,
        fiber: stored.goals?.daily?.fiber || DEFAULT_PREFS.goals.daily.fiber
      }
    },
    displaySettings: {
      showOnCalendar: stored.displaySettings?.showOnCalendar ?? DEFAULT_PREFS.displaySettings.showOnCalendar,
      primaryMacro: stored.displaySettings?.primaryMacro || DEFAULT_PREFS.displaySettings.primaryMacro
    }
  };
}

/**
 * Save preferences to localStorage
 */
function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nutritionPrefs));
    schedulePushToCloud();
  } catch (error) {
    console.error('Failed to save nutrition preferences:', error);
  }
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(action, data) {
  listeners.forEach(callback => {
    try {
      callback({ action, data, prefs: nutritionPrefs });
    } catch (error) {
      console.error('Nutrition prefs listener error:', error);
    }
  });
}

/**
 * Subscribe to nutrition preference changes
 */
export function onNutritionPrefsChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

/**
 * Get current nutrition preferences
 */
export function getNutritionPrefs() {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }
  return { ...nutritionPrefs };
}

/**
 * Update nutrition preferences (partial update)
 */
export function updateNutritionPrefs(updates) {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }

  // Deep merge updates
  if (updates.enabled !== undefined) {
    nutritionPrefs.enabled = updates.enabled;
  }

  if (updates.goals?.daily) {
    Object.entries(updates.goals.daily).forEach(([macro, value]) => {
      if (nutritionPrefs.goals.daily[macro]) {
        nutritionPrefs.goals.daily[macro] = {
          ...nutritionPrefs.goals.daily[macro],
          ...value
        };
      }
    });
  }

  if (updates.displaySettings) {
    nutritionPrefs.displaySettings = {
      ...nutritionPrefs.displaySettings,
      ...updates.displaySettings
    };
  }

  savePrefs();
  notifyListeners('update', updates);
  return nutritionPrefs;
}

/**
 * Set a specific daily goal
 */
export function setDailyGoal(macro, target, type = null) {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }

  if (!nutritionPrefs.goals.daily[macro]) {
    console.error('Unknown macro:', macro);
    return null;
  }

  nutritionPrefs.goals.daily[macro].target = target;
  if (type) {
    nutritionPrefs.goals.daily[macro].type = type;
  }

  savePrefs();
  notifyListeners('setGoal', { macro, target, type });
  return nutritionPrefs.goals.daily[macro];
}

/**
 * Get daily goal for a specific macro
 */
export function getDailyGoal(macro) {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }
  return nutritionPrefs.goals.daily[macro] || null;
}

/**
 * Get all daily goals
 */
export function getAllDailyGoals() {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }
  return { ...nutritionPrefs.goals.daily };
}

/**
 * Apply a preset configuration
 */
export function applyPreset(presetId) {
  const preset = PRESETS[presetId];
  if (!preset) {
    console.error('Unknown preset:', presetId);
    return null;
  }

  if (!nutritionPrefs) {
    initNutritionPrefs();
  }

  nutritionPrefs.goals = JSON.parse(JSON.stringify(preset.goals));
  savePrefs();
  notifyListeners('applyPreset', { presetId, preset });
  return nutritionPrefs;
}

/**
 * Get available presets
 */
export function getPresets() {
  return Object.entries(PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
    goals: preset.goals.daily
  }));
}

/**
 * Check if nutrition tracking is enabled
 */
export function isTrackingEnabled() {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }
  return nutritionPrefs.enabled;
}

/**
 * Toggle nutrition tracking on/off
 */
export function setTrackingEnabled(enabled) {
  if (!nutritionPrefs) {
    initNutritionPrefs();
  }
  nutritionPrefs.enabled = enabled;
  savePrefs();
  notifyListeners('toggleEnabled', { enabled });
  return enabled;
}

/**
 * Reset to default preferences
 */
export function resetToDefaults() {
  nutritionPrefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
  savePrefs();
  notifyListeners('reset', null);
  return nutritionPrefs;
}

/**
 * Export preferences to JSON
 */
export function exportNutritionPrefs() {
  return {
    exportedAt: new Date().toISOString(),
    prefs: nutritionPrefs
  };
}

/**
 * Import preferences from JSON
 */
export function importNutritionPrefs(data) {
  try {
    const imported = typeof data === 'string' ? JSON.parse(data) : data;
    const prefs = imported.prefs || imported;
    nutritionPrefs = mergeWithDefaults(prefs);
    savePrefs();
    notifyListeners('import', null);
    return { success: true };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error: error.message };
  }
}

export default {
  initNutritionPrefs,
  getNutritionPrefs,
  updateNutritionPrefs,
  setDailyGoal,
  getDailyGoal,
  getAllDailyGoals,
  onNutritionPrefsChange,
  applyPreset,
  getPresets,
  isTrackingEnabled,
  setTrackingEnabled,
  resetToDefaults,
  exportNutritionPrefs,
  importNutritionPrefs
};
