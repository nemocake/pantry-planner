/**
 * Nutrition Preferences Modal Component
 * Handles the UI for setting nutrition goals and preferences
 */

import { openModal, closeModal } from '../modules/modalManager.js';
import {
  initNutritionPrefs,
  getNutritionPrefs,
  updateNutritionPrefs,
  setDailyGoal,
  getAllDailyGoals,
  applyPreset,
  getPresets,
  isTrackingEnabled,
  setTrackingEnabled,
  resetToDefaults,
  onNutritionPrefsChange
} from '../modules/nutritionPrefsManager.js';

const MODAL_ID = 'nutritionPrefsModal';

// Macro config for UI
const MACRO_CONFIG = {
  calories: { min: 1200, max: 4000, step: 50, unit: 'cal' },
  protein: { min: 30, max: 300, step: 5, unit: 'g' },
  carbs: { min: 20, max: 500, step: 10, unit: 'g' },
  fat: { min: 20, max: 200, step: 5, unit: 'g' },
  fiber: { min: 10, max: 60, step: 5, unit: 'g' }
};

let onSaveCallback = null;

/**
 * Initialize the nutrition preferences modal
 */
export function initNutritionPrefsModal(onSave) {
  onSaveCallback = onSave;

  // Initialize preferences
  initNutritionPrefs();

  // Get DOM elements
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;

  // Close handlers
  modal.querySelector('.modal__backdrop')?.addEventListener('click', closeNutritionPrefsModal);
  modal.querySelector('.modal__close')?.addEventListener('click', closeNutritionPrefsModal);

  // Enable toggle
  const enableToggle = document.getElementById('nutritionTrackingEnabled');
  enableToggle?.addEventListener('change', (e) => {
    setTrackingEnabled(e.target.checked);
  });

  // Preset buttons
  const presetButtons = document.getElementById('nutritionPresetButtons');
  presetButtons?.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;

    const presetId = btn.dataset.preset;
    applyPreset(presetId);

    // Update all UI to reflect preset values
    loadPrefsIntoUI();

    // Update active state
    presetButtons.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Goal type toggles
  modal.querySelectorAll('.goal-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const macro = btn.dataset.macro;
      const type = btn.dataset.type;

      // Update button states
      const container = btn.closest('.goal-type-toggle');
      container.querySelectorAll('.goal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update the goal type
      const goals = getAllDailyGoals();
      setDailyGoal(macro, goals[macro].target, type);
    });
  });

  // Slider and input sync for each macro
  Object.keys(MACRO_CONFIG).forEach(macro => {
    const slider = document.getElementById(`goal${capitalize(macro)}Slider`);
    const input = document.getElementById(`goal${capitalize(macro)}`);

    if (slider && input) {
      // Slider change updates input
      slider.addEventListener('input', () => {
        input.value = slider.value;
      });

      // Input change updates slider
      input.addEventListener('input', () => {
        slider.value = input.value;
      });
    }
  });

  // Display settings
  const showOnCalendar = document.getElementById('showNutritionOnCalendar');
  showOnCalendar?.addEventListener('change', (e) => {
    updateNutritionPrefs({
      displaySettings: { showOnCalendar: e.target.checked }
    });
  });

  const primaryMacro = document.getElementById('primaryMacroSelect');
  primaryMacro?.addEventListener('change', (e) => {
    updateNutritionPrefs({
      displaySettings: { primaryMacro: e.target.value }
    });
  });

  // Reset button
  document.getElementById('resetNutritionPrefs')?.addEventListener('click', () => {
    resetToDefaults();
    loadPrefsIntoUI();
  });

  // Save button
  document.getElementById('saveNutritionPrefs')?.addEventListener('click', () => {
    savePreferences();
    closeNutritionPrefsModal();
  });

  // Dashboard buttons to open modal
  document.getElementById('openNutritionPrefs')?.addEventListener('click', openNutritionPrefsModal);
  document.getElementById('setupNutritionGoals')?.addEventListener('click', openNutritionPrefsModal);
}

/**
 * Open the nutrition preferences modal
 */
export function openNutritionPrefsModal() {
  loadPrefsIntoUI();
  openModal(MODAL_ID);
}

/**
 * Close the nutrition preferences modal
 */
export function closeNutritionPrefsModal() {
  closeModal(MODAL_ID);
}

/**
 * Load current preferences into the UI
 */
function loadPrefsIntoUI() {
  const prefs = getNutritionPrefs();
  const goals = prefs.goals.daily;

  // Enable toggle
  const enableToggle = document.getElementById('nutritionTrackingEnabled');
  if (enableToggle) enableToggle.checked = prefs.enabled;

  // Load each macro goal
  Object.keys(MACRO_CONFIG).forEach(macro => {
    const slider = document.getElementById(`goal${capitalize(macro)}Slider`);
    const input = document.getElementById(`goal${capitalize(macro)}`);
    const goal = goals[macro];

    if (slider) slider.value = goal.target;
    if (input) input.value = goal.target;

    // Update goal type buttons
    const container = document.querySelector(`.goal-type-toggle [data-macro="${macro}"]`)?.closest('.goal-type-toggle');
    if (container) {
      container.querySelectorAll('.goal-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === goal.type);
      });
    }
  });

  // Display settings
  const showOnCalendar = document.getElementById('showNutritionOnCalendar');
  if (showOnCalendar) showOnCalendar.checked = prefs.displaySettings.showOnCalendar;

  const primaryMacro = document.getElementById('primaryMacroSelect');
  if (primaryMacro) primaryMacro.value = prefs.displaySettings.primaryMacro;

  // Clear preset active states (user may have custom values)
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
}

/**
 * Save preferences from UI
 */
function savePreferences() {
  const goals = {};

  Object.keys(MACRO_CONFIG).forEach(macro => {
    const input = document.getElementById(`goal${capitalize(macro)}`);
    const container = document.querySelector(`.goal-type-toggle [data-macro="${macro}"]`)?.closest('.goal-type-toggle');
    const activeBtn = container?.querySelector('.goal-type-btn.active');

    if (input) {
      const parsedValue = parseInt(input.value, 10);
      const validTarget = !isNaN(parsedValue) && parsedValue > 0
        ? Math.max(MACRO_CONFIG[macro].min, Math.min(MACRO_CONFIG[macro].max, parsedValue))
        : MACRO_CONFIG[macro].min;
      goals[macro] = {
        target: validTarget,
        type: activeBtn?.dataset.type || 'limit'
      };
    }
  });

  updateNutritionPrefs({ goals: { daily: goals } });

  if (onSaveCallback) {
    onSaveCallback(getNutritionPrefs());
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default {
  initNutritionPrefsModal,
  openNutritionPrefsModal,
  closeNutritionPrefsModal
};
