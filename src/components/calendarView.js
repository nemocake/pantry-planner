/**
 * Calendar View Component
 * Renders week view for meal planning
 */

import gsap from 'gsap';
import { getRecipeById } from '../modules/recipeManager.js';
import { checkRecipeAvailability, formatDate, parseDate, getWeekDates, getMealsForDate } from '../modules/mealPlanManager.js';
import { getCategoryIcon } from '../modules/ingredientManager.js';

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

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

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
 * Create a meal card element
 */
function createMealCard(meal, recipe, onMealClick, onRemoveClick) {
  const card = document.createElement('div');
  card.className = 'meal-card';
  card.dataset.mealId = meal.id;

  // Check availability
  const availability = checkRecipeAvailability(recipe, meal.servings);
  if (!availability.canMake) {
    card.classList.add('meal-card--warning');
  }

  // Get meal type icon
  const mealIcon = MEAL_TYPE_ICONS[meal.mealType] || '🍽️';

  // Truncate long recipe names
  const safeTitle = escapeHtml(recipe.title);
  const displayName = safeTitle.length > 18
    ? safeTitle.substring(0, 16) + '...'
    : safeTitle;

  card.innerHTML = `
    <div class="meal-card__icon">${mealIcon}</div>
    <div class="meal-card__info">
      <div class="meal-card__name" title="${safeTitle}">${displayName}</div>
      <div class="meal-card__servings">${meal.servings} servings</div>
    </div>
    ${!availability.canMake ? '<span class="meal-card__warning" title="Insufficient ingredients">⚠️</span>' : ''}
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
 * Create a day card element with meal slots
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

  // Group meals by type
  const mealsByType = {
    breakfast: meals.filter(m => m.mealType === 'breakfast'),
    lunch: meals.filter(m => m.mealType === 'lunch'),
    dinner: meals.filter(m => m.mealType === 'dinner'),
    snack: meals.filter(m => m.mealType === 'snack')
  };

  card.innerHTML = `
    <div class="day-card__header">
      <span class="day-card__name">${dayName}</span>
      <span class="day-card__date">${month} ${dayNum}</span>
    </div>
    <div class="day-card__slots">
      <div class="meal-slot" data-meal-type="breakfast">
        <span class="meal-slot__label">Breakfast</span>
        <div class="meal-slot__content"></div>
      </div>
      <div class="meal-slot" data-meal-type="lunch">
        <span class="meal-slot__label">Lunch</span>
        <div class="meal-slot__content"></div>
      </div>
      <div class="meal-slot" data-meal-type="dinner">
        <span class="meal-slot__label">Dinner</span>
        <div class="meal-slot__content"></div>
      </div>
      <div class="meal-slot" data-meal-type="snack">
        <span class="meal-slot__label">Snack</span>
        <div class="meal-slot__content"></div>
      </div>
    </div>
  `;

  // Add meals to their respective slots
  MEAL_TYPE_ORDER.forEach(mealType => {
    const slotContent = card.querySelector(`.meal-slot[data-meal-type="${mealType}"] .meal-slot__content`);
    const mealsForType = mealsByType[mealType];

    if (mealsForType.length === 0) {
      // Empty slot with add button
      const emptySlot = document.createElement('div');
      emptySlot.className = 'empty-slot';
      emptySlot.innerHTML = '+';
      emptySlot.addEventListener('click', (e) => {
        e.stopPropagation();
        onAddClick(dateStr, mealType);
      });
      slotContent.appendChild(emptySlot);
    } else {
      // Add meal cards
      mealsForType.forEach(meal => {
        const recipe = getRecipeById(meal.recipeId);
        if (recipe) {
          const mealCard = createMealCard(meal, recipe, onMealClick, onRemoveClick);
          slotContent.appendChild(mealCard);
        }
      });
      // Add another slot if they want more of same type
      if (mealsForType.length < 2) {
        const addMore = document.createElement('div');
        addMore.className = 'empty-slot empty-slot--small';
        addMore.innerHTML = '+';
        addMore.addEventListener('click', (e) => {
          e.stopPropagation();
          onAddClick(dateStr, mealType);
        });
        slotContent.appendChild(addMore);
      }
    }
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

  // Group meals by type
  const mealsByType = {
    breakfast: meals.filter(m => m.mealType === 'breakfast'),
    lunch: meals.filter(m => m.mealType === 'lunch'),
    dinner: meals.filter(m => m.mealType === 'dinner'),
    snack: meals.filter(m => m.mealType === 'snack')
  };

  // Update each slot
  MEAL_TYPE_ORDER.forEach(mealType => {
    const slotContent = dayCard.querySelector(`.meal-slot[data-meal-type="${mealType}"] .meal-slot__content`);
    if (!slotContent) return;

    slotContent.innerHTML = '';
    const mealsForType = mealsByType[mealType];

    if (mealsForType.length === 0) {
      // Empty slot with add button
      const emptySlot = document.createElement('div');
      emptySlot.className = 'empty-slot';
      emptySlot.innerHTML = '+';
      emptySlot.addEventListener('click', (e) => {
        e.stopPropagation();
        onAddClick(dateStr, mealType);
      });
      slotContent.appendChild(emptySlot);
    } else {
      // Render meals for this slot
      mealsForType.forEach(meal => {
        const recipe = getRecipeById(meal.recipeId);
        if (recipe) {
          const mealCard = createMealCard(meal, recipe, onMealClick, onRemoveClick);
          slotContent.appendChild(mealCard);

          // Animate in
          gsap.fromTo(mealCard,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }
          );
        }
      });
    }
  });
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
