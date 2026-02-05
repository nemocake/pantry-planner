/**
 * Nutrition Widget Component
 * Displays weekly nutrition summary on the dashboard
 * Supports planned vs actual consumption comparison
 */

import { calculateWeekNutrition, formatNutritionValue, getNutritionStatusColor, calculateWeekActualNutrition } from '../modules/nutritionAggregator.js';
import { isTrackingEnabled, getNutritionPrefs, onNutritionPrefsChange } from '../modules/nutritionPrefsManager.js';
import { getWeekStart, onMealPlanChange } from '../modules/mealPlanManager.js';

let widgetContainer = null;
let currentWeekStart = null;
let viewMode = 'planned'; // 'planned' or 'actual'

/**
 * Initialize the nutrition widget
 */
export function initNutritionWidget() {
  widgetContainer = document.getElementById('nutritionWidgetContent');
  if (!widgetContainer) return;

  // Set current week
  currentWeekStart = getWeekStart(new Date());

  // Initial render
  renderWidget();

  // Subscribe to changes
  onNutritionPrefsChange(() => renderWidget());
  onMealPlanChange(() => renderWidget());
}

/**
 * Render the nutrition widget
 */
export function renderWidget() {
  if (!widgetContainer) return;

  // Check if tracking is enabled
  if (!isTrackingEnabled()) {
    widgetContainer.innerHTML = `
      <div class="nutrition-widget__empty">
        <p>Nutrition tracking is disabled</p>
        <button class="btn btn--small btn--primary" id="enableNutritionTracking">Enable Tracking</button>
      </div>
    `;

    document.getElementById('enableNutritionTracking')?.addEventListener('click', () => {
      document.getElementById('openNutritionPrefs')?.click();
    });
    return;
  }

  // Calculate week nutrition (planned and actual)
  const plannedData = calculateWeekNutrition(currentWeekStart);
  const actualData = calculateWeekActualNutrition(currentWeekStart);
  const prefs = getNutritionPrefs();

  // Check if there are any meals this week
  if (plannedData.daysWithMeals === 0 && actualData.daysWithMeals === 0) {
    widgetContainer.innerHTML = `
      <div class="nutrition-widget__empty">
        <p>No meals planned this week</p>
        <button class="btn btn--small btn--secondary" data-nav-target="mealplanner">Plan Meals</button>
      </div>
    `;
    return;
  }

  // Determine which data to show based on view mode
  const weekData = viewMode === 'actual' ? actualData : plannedData;
  const hasActualData = actualData.daysWithMeals > 0;

  // Build toggle HTML (only show if there's actual data)
  const toggleHtml = hasActualData ? `
    <div class="nutrition-view-toggle">
      <button class="nutrition-view-toggle__btn ${viewMode === 'planned' ? 'nutrition-view-toggle__btn--active' : ''}" data-view="planned">
        Planned
      </button>
      <button class="nutrition-view-toggle__btn ${viewMode === 'actual' ? 'nutrition-view-toggle__btn--active' : ''}" data-view="actual">
        Actual
      </button>
    </div>
  ` : '';

  // Build summary HTML
  const macros = ['calories', 'protein', 'carbs', 'fat', 'fiber'];

  const summaryHtml = macros.map(macro => {
    const avg = weekData.dailyAverage[macro];
    const percent = weekData.averagePercentages[macro];
    const goal = prefs.goals.daily[macro];
    const colorClass = getNutritionStatusColor(percent, goal.type);

    const displayValue = macro === 'calories'
      ? Math.round(avg).toLocaleString()
      : Math.round(avg * 10) / 10 + 'g';

    const macroLabel = macro === 'calories' ? 'Calories' :
      macro.charAt(0).toUpperCase() + macro.slice(1);

    // Comparison with planned (only shown in actual view)
    let comparisonHtml = '';
    if (viewMode === 'actual' && plannedData.daysWithMeals > 0) {
      const plannedAvg = plannedData.dailyAverage[macro];
      const diff = avg - plannedAvg;
      const diffPercent = plannedAvg > 0 ? Math.round((diff / plannedAvg) * 100) : 0;
      if (Math.abs(diffPercent) >= 5) {
        const sign = diff >= 0 ? '+' : '';
        comparisonHtml = `<span class="nutrition-summary__comparison ${diff >= 0 ? 'nutrition-summary__comparison--over' : 'nutrition-summary__comparison--under'}">${sign}${diffPercent}% vs plan</span>`;
      }
    }

    return `
      <div class="nutrition-summary__item">
        <span class="nutrition-summary__label">${macroLabel}</span>
        <span class="nutrition-summary__value">${displayValue}</span>
        <span class="nutrition-summary__percent nutrition-summary__percent--${colorClass}">
          ${percent}% of goal
        </span>
        ${comparisonHtml}
      </div>
    `;
  }).join('');

  // Progress bar for primary macro
  const primaryMacro = prefs.displaySettings.primaryMacro || 'calories';
  const primaryPercent = Math.min(weekData.averagePercentages[primaryMacro], 100);
  const primaryGoal = prefs.goals.daily[primaryMacro];
  const primaryColor = getNutritionStatusColor(weekData.averagePercentages[primaryMacro], primaryGoal.type);
  const primaryLabel = primaryMacro === 'calories' ? 'Calories' :
    primaryMacro.charAt(0).toUpperCase() + primaryMacro.slice(1);

  const avgValue = primaryMacro === 'calories'
    ? Math.round(weekData.dailyAverage[primaryMacro]).toLocaleString()
    : Math.round(weekData.dailyAverage[primaryMacro] * 10) / 10 + 'g';

  const goalValue = primaryMacro === 'calories'
    ? primaryGoal.target.toLocaleString()
    : primaryGoal.target + 'g';

  // Build planned comparison bar (only in actual view)
  let comparisonBarHtml = '';
  if (viewMode === 'actual' && plannedData.daysWithMeals > 0) {
    const plannedPercent = Math.min(plannedData.averagePercentages[primaryMacro], 100);
    comparisonBarHtml = `
      <div class="nutrition-progress__planned-indicator" style="left: ${plannedPercent}%;" title="Planned: ${plannedPercent}%"></div>
    `;
  }

  const modeLabel = viewMode === 'actual' ? 'Consumed' : 'Planned';
  const daysLabel = viewMode === 'actual'
    ? `${weekData.daysWithMeals} day${weekData.daysWithMeals !== 1 ? 's' : ''} with meals eaten`
    : `${weekData.daysWithMeals} day${weekData.daysWithMeals !== 1 ? 's' : ''} with meals planned`;

  widgetContainer.innerHTML = `
    ${toggleHtml}
    <div class="nutrition-summary">
      ${summaryHtml}
    </div>

    <div class="nutrition-progress">
      <div class="nutrition-progress__header">
        <span class="nutrition-progress__label">Daily Avg ${primaryLabel} (${modeLabel})</span>
        <span class="nutrition-progress__value">${avgValue} / ${goalValue}</span>
      </div>
      <div class="nutrition-progress__bar">
        <div class="nutrition-progress__fill nutrition-progress__fill--${primaryColor}" style="width: ${primaryPercent}%"></div>
        ${comparisonBarHtml}
      </div>
    </div>

    <div style="margin-top: var(--spacing-lg); text-align: center; font-size: var(--font-size-xs); color: var(--text-light);">
      Based on ${daysLabel}
    </div>
  `;

  // Add toggle event listeners
  widgetContainer.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      renderWidget();
    });
  });
}

/**
 * Update widget for a new week
 */
export function setWidgetWeek(weekStart) {
  currentWeekStart = weekStart;
  renderWidget();
}

export default {
  initNutritionWidget,
  renderWidget,
  setWidgetWeek
};
