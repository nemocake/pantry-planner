/**
 * Calendar View Component
 * Renders week view for meal planning with nutrition tracking
 */

import gsap from 'gsap';
import { getRecipeById } from '../modules/recipeManager.js';
import { checkRecipeAvailability, formatDate, parseDate, getWeekDates, getMealsForDate, MEAL_STATUS } from '../modules/mealPlanManager.js';
import { getCategoryIcon } from '../modules/ingredientManager.js';
import { getDayNutritionSummary, getNutritionStatusColor } from '../modules/nutritionAggregator.js';
import { isTrackingEnabled, getNutritionPrefs } from '../modules/nutritionPrefsManager.js';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MEAL_TYPE_ICONS = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍪'
};

/**
 * Format week title (e.g., "Jan 20 - 26, 2026")
 */
export function formatWeekTitle(startDate) {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);

  const startMonth = MONTH_NAMES[start.getMonth()];
  const endMonth = MONTH_NAMES[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

/**
 * Check if a date is today
 */
function isToday(dateStr) {
  return dateStr === formatDate(new Date());
}

/**
 * Format leftover source date for display
 * Returns format like "Mon 20"
 */
function formatLeftoverSourceDate(dateStr) {
  const date = parseDate(dateStr);
  const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const dayName = DAY_NAMES[dayIndex];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
}

/**
 * Create a meal card element
 */
function createMealCard(meal, recipe, onMealClick, onRemoveClick) {
  const card = document.createElement('div');
  card.className = 'meal-card';
  card.dataset.mealId = meal.id;

  // Get meal status
  const mealStatus = meal.status || MEAL_STATUS.PLANNED;
  const isEaten = mealStatus === MEAL_STATUS.EATEN;
  const isDismissed = mealStatus === MEAL_STATUS.DISMISSED;

  // Add status classes
  if (isEaten) {
    card.classList.add('meal-card--eaten');
  } else if (isDismissed) {
    card.classList.add('meal-card--dismissed');
  }

  // Check if this is a leftover
  if (meal.isLeftover) {
    card.classList.add('meal-card--leftover');
  }

  // Check availability (skip for leftovers and dismissed meals)
  if (!meal.isLeftover && !isDismissed && !isEaten) {
    const availability = checkRecipeAvailability(recipe, meal.servings);
    if (!availability.canMake) {
      card.classList.add('meal-card--warning');
    }
  }

  // Get meal type icon
  const mealIcon = MEAL_TYPE_ICONS[meal.mealType] || '🍽️';

  // Truncate long recipe names
  const safeTitle = escapeHtml(recipe.title);
  const displayName = safeTitle.length > 18
    ? safeTitle.substring(0, 16) + '...'
    : safeTitle;

  // Build leftover tag if applicable
  const leftoverTag = meal.isLeftover && meal.sourceDate
    ? `<div class="meal-card__leftover-tag">[L] from ${formatLeftoverSourceDate(meal.sourceDate)}</div>`
    : '';

  // Check availability for warning (only for non-leftovers and planned meals)
  let showWarning = false;
  if (!meal.isLeftover && !isEaten && !isDismissed) {
    const availability = checkRecipeAvailability(recipe, meal.servings);
    showWarning = !availability.canMake;
  }

  // Build status icon
  let statusIcon = '';
  if (isEaten) {
    statusIcon = '<span class="meal-card__status-icon meal-card__status-icon--eaten" title="Eaten">✓</span>';
  } else if (isDismissed) {
    statusIcon = '<span class="meal-card__status-icon meal-card__status-icon--dismissed" title="Dismissed">✗</span>';
  }

  card.innerHTML = `
    <div class="meal-card__icon">${mealIcon}</div>
    <div class="meal-card__info">
      <div class="meal-card__name" title="${safeTitle}">${displayName}</div>
      ${leftoverTag || `<div class="meal-card__servings">${meal.servings} servings</div>`}
    </div>
    ${statusIcon}
    ${showWarning ? '<span class="meal-card__warning" title="Insufficient ingredients">⚠️</span>' : ''}
    <button class="meal-card__remove" data-action="remove" title="Remove meal">&times;</button>
  `;

  // Click on card to view details
  card.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="remove"]')) {
      onMealClick(meal, recipe);
    }
  });

  // Remove button
  card.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
    e.stopPropagation();
    // Animate out
    gsap.to(card, {
      opacity: 0,
      scale: 0.8,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => onRemoveClick(meal.id)
    });
  });

  return card;
}

/**
 * Generate nutrition bar HTML for a day
 */
function generateNutritionBar(dateStr) {
  if (!isTrackingEnabled()) {
    return '';
  }

  const summary = getDayNutritionSummary(dateStr);
  if (!summary || summary.mealCount === 0) {
    return '';
  }

  const { primary } = summary;
  const percent = Math.min(primary.percent, 100); // Cap at 100% for bar width
  const colorClass = getNutritionStatusColor(primary.percent, primary.type);

  // Format display value
  const consumed = primary.macro === 'calories'
    ? primary.consumed.toLocaleString()
    : Math.round(primary.consumed * 10) / 10 + 'g';
  const goal = primary.macro === 'calories'
    ? primary.goal.toLocaleString()
    : primary.goal + 'g';

  const label = primary.macro === 'calories' ? 'cal' : primary.macro;

  return `
    <div class="day-card__nutrition">
      <div class="nutrition-bar nutrition-bar--${colorClass}">
        <div class="nutrition-bar__fill" style="width: ${percent}%"></div>
      </div>
      <span class="nutrition-bar__text">${consumed} / ${goal} ${label}</span>
    </div>
  `;
}

/**
 * Create a day card element with flexible meal list
 */
function createDayCard(dateStr, dayIndex, meals, onAddClick, onMealClick, onRemoveClick) {
  const date = parseDate(dateStr);
  const dayName = DAY_NAMES[dayIndex];
  const dayNum = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const today = isToday(dateStr);

  const card = document.createElement('div');
  card.className = `day-card ${today ? 'day-card--today' : ''}`;
  card.dataset.date = dateStr;

  // Generate nutrition bar if tracking is enabled
  const nutritionBarHtml = generateNutritionBar(dateStr);

  card.innerHTML = `
    <div class="day-card__header">
      <span class="day-card__name">${dayName}</span>
      <span class="day-card__date">${month} ${dayNum}</span>
    </div>
    ${nutritionBarHtml}
    <div class="day-card__meals"></div>
    <button class="day-card__add-btn" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Meal
    </button>
  `;

  const mealsContainer = card.querySelector('.day-card__meals');

  // Add all meals in order
  if (meals.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'day-card__empty';
    emptyState.textContent = 'No meals planned';
    mealsContainer.appendChild(emptyState);
  } else {
    meals.forEach(meal => {
      const recipe = getRecipeById(meal.recipeId);
      if (recipe) {
        const mealCard = createMealCard(meal, recipe, onMealClick, onRemoveClick);
        mealsContainer.appendChild(mealCard);
      }
    });
  }

  // Add meal button
  const addBtn = card.querySelector('.day-card__add-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onAddClick(dateStr, null);
  });

  return card;
}

/**
 * Render the week view
 */
export function renderWeekView(container, startDate, { onAddClick, onMealClick, onRemoveClick }) {
  container.innerHTML = '';

  const weekDates = getWeekDates(startDate);

  weekDates.forEach((dateStr, index) => {
    const meals = getMealsForDate(dateStr);
    const dayCard = createDayCard(dateStr, index, meals, onAddClick, onMealClick, onRemoveClick);
    container.appendChild(dayCard);

    // Animate in with stagger
    gsap.fromTo(dayCard,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        delay: index * 0.05,
        ease: 'power2.out'
      }
    );
  });
}

/**
 * Update a single day's meals (for partial refresh)
 */
export function updateDayMeals(container, dateStr, onAddClick, onMealClick, onRemoveClick) {
  const dayCard = container.querySelector(`[data-date="${dateStr}"]`);
  if (!dayCard) return;

  const meals = getMealsForDate(dateStr);
  const mealsContainer = dayCard.querySelector('.day-card__meals');
  if (!mealsContainer) return;

  mealsContainer.innerHTML = '';

  if (meals.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'day-card__empty';
    emptyState.textContent = 'No meals planned';
    mealsContainer.appendChild(emptyState);
  } else {
    meals.forEach(meal => {
      const recipe = getRecipeById(meal.recipeId);
      if (recipe) {
        const mealCard = createMealCard(meal, recipe, onMealClick, onRemoveClick);
        mealsContainer.appendChild(mealCard);

        // Animate in
        gsap.fromTo(mealCard,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }
        );
      }
    });
  }
}

/**
 * Navigate week (returns new start date as YYYY-MM-DD string)
 */
export function navigateWeek(currentStart, direction) {
  const current = new Date(currentStart);
  current.setDate(current.getDate() + (direction * 7));
  return formatDate(current);
}

/**
 * Go to current week
 */
export function goToCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
}

export default {
  renderWeekView,
  updateDayMeals,
  navigateWeek,
  goToCurrentWeek,
  formatWeekTitle
};
