/**
 * Recipe Browser Modal Component
 * Full-screen recipe browser for selecting meals to add to the meal plan
 */

import gsap from 'gsap';
import { openModal, closeModal } from '../modules/modalManager.js';
import { getRecipes, searchRecipes, getRecipeById } from '../modules/recipeManager.js';
import { addMealToDate, checkRecipeAvailability } from '../modules/mealPlanManager.js';
import { getIngredientsMap, getIngredientById } from '../modules/ingredientManager.js';
import { getPantryItems } from '../modules/pantryManager.js';
import { calculateRecipeNutrition, formatNutritionBadge } from '../modules/nutritionCalculator.js';

const MODAL_ID = 'recipeBrowserModal';

// Filter options
const CUISINES = [
  { value: '', label: 'All Cuisines' },
  { value: 'italian', label: '🇮🇹 Italian' },
  { value: 'mexican', label: '🇲🇽 Mexican' },
  { value: 'asian', label: '🥢 Asian' },
  { value: 'american', label: '🇺🇸 American' },
  { value: 'chinese', label: '🇨🇳 Chinese' },
  { value: 'japanese', label: '🇯🇵 Japanese' },
  { value: 'indian', label: '🇮🇳 Indian' },
  { value: 'mediterranean', label: '🫒 Mediterranean' },
  { value: 'french', label: '🇫🇷 French' },
  { value: 'thai', label: '🇹🇭 Thai' },
  { value: 'greek', label: '🇬🇷 Greek' },
  { value: 'korean', label: '🇰🇷 Korean' }
];

const MEAL_TYPES = [
  { value: '', label: 'All Meals' },
  { value: 'breakfast', label: '🍳 Breakfast' },
  { value: 'lunch', label: '🥗 Lunch' },
  { value: 'dinner', label: '🍽️ Dinner' },
  { value: 'snack', label: '🍪 Snack' }
];

const DIFFICULTIES = [
  { value: '', label: 'Any Difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

// State
let selectedDate = null;
let currentFilters = { search: '', cuisine: '', mealType: '', difficulty: '' };
let onMealAddedCallback = null;
let searchDebounceTimer = null;

// DOM References
let searchInput = null;
let cuisineSelect = null;
let mealTypeSelect = null;
let difficultySelect = null;
let recipesGrid = null;
let resultsCount = null;

/**
 * Initialize the recipe browser modal
 */
export function initRecipeBrowserModal(onMealAdded) {
  onMealAddedCallback = onMealAdded;

  // Cache DOM elements
  searchInput = document.getElementById('browserSearchInput');
  cuisineSelect = document.getElementById('browserCuisineFilter');
  mealTypeSelect = document.getElementById('browserMealTypeFilter');
  difficultySelect = document.getElementById('browserDifficultyFilter');
  recipesGrid = document.getElementById('browserRecipesGrid');
  resultsCount = document.getElementById('browserResultsCount');

  if (!searchInput || !recipesGrid) {
    console.error('Recipe browser modal elements not found');
    return;
  }

  // Search input with debounce
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      renderFilteredRecipes();
    }, 200);
  });

  // Filter dropdowns
  cuisineSelect?.addEventListener('change', (e) => {
    currentFilters.cuisine = e.target.value;
    renderFilteredRecipes();
  });

  mealTypeSelect?.addEventListener('change', (e) => {
    currentFilters.mealType = e.target.value;
    renderFilteredRecipes();
  });

  difficultySelect?.addEventListener('change', (e) => {
    currentFilters.difficulty = e.target.value;
    renderFilteredRecipes();
  });

  // Close on backdrop click or close button
  const modal = document.getElementById(MODAL_ID);
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', closeRecipeBrowserModal);
  modal?.querySelector('.modal__close')?.addEventListener('click', closeRecipeBrowserModal);

  // Recipe selection confirmation modal events
  document.getElementById('confirmAddMeal')?.addEventListener('click', handleConfirmAddMeal);
  document.getElementById('cancelSelectRecipe')?.addEventListener('click', hideRecipeConfirmation);
}

/**
 * Open the recipe browser modal
 * @param {string} date - The date to add meal to
 * @param {string} [mealType] - Optional meal type to pre-select (breakfast, lunch, dinner, snack)
 */
export function openRecipeBrowserModal(date, mealType = '') {
  selectedDate = date;

  // Reset filters, but pre-select meal type if provided
  currentFilters = { search: '', cuisine: '', mealType: mealType || '', difficulty: '' };
  if (searchInput) searchInput.value = '';
  if (cuisineSelect) cuisineSelect.value = '';
  if (mealTypeSelect) mealTypeSelect.value = mealType || '';
  if (difficultySelect) difficultySelect.value = '';

  // Also pre-select the confirmation meal type
  const confirmMealType = document.getElementById('confirmMealType');
  if (confirmMealType && mealType) {
    confirmMealType.value = mealType;
  }

  // Update date display
  const dateDisplay = document.getElementById('browserSelectedDate');
  if (dateDisplay) {
    dateDisplay.textContent = formatDisplayDate(date);
  }

  // Hide confirmation panel
  hideRecipeConfirmation();

  // Render recipes
  renderFilteredRecipes();

  // Open modal
  openModal(MODAL_ID);

  // Focus search after animation
  setTimeout(() => searchInput?.focus(), 300);
}

/**
 * Close the recipe browser modal
 */
export function closeRecipeBrowserModal() {
  selectedDate = null;
  closeModal(MODAL_ID);
}

/**
 * Format date for display
 */
function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get filtered recipes based on current filters
 */
function getFilteredRecipes() {
  let recipes = getRecipes();

  // Search filter
  if (currentFilters.search) {
    recipes = searchRecipes(recipes, currentFilters.search);
  }

  // Cuisine filter
  if (currentFilters.cuisine) {
    recipes = recipes.filter(r => r.cuisine?.toLowerCase() === currentFilters.cuisine);
  }

  // Meal type filter
  if (currentFilters.mealType) {
    recipes = recipes.filter(r =>
      r.mealType?.includes(currentFilters.mealType) ||
      (Array.isArray(r.mealType) && r.mealType.some(m => m === currentFilters.mealType))
    );
  }

  // Difficulty filter
  if (currentFilters.difficulty) {
    recipes = recipes.filter(r => r.difficulty === currentFilters.difficulty);
  }

  return recipes;
}

/**
 * Render filtered recipes to the grid
 */
function renderFilteredRecipes() {
  const recipes = getFilteredRecipes();

  // Update count
  if (resultsCount) {
    resultsCount.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} found`;
  }

  if (recipes.length === 0) {
    recipesGrid.innerHTML = `
      <div class="browser-empty">
        <span class="browser-empty__icon">🔍</span>
        <p>No recipes match your filters</p>
        <button class="btn btn--secondary" onclick="document.getElementById('browserSearchInput').value=''; document.getElementById('browserCuisineFilter').value=''; document.getElementById('browserMealTypeFilter').value=''; document.getElementById('browserDifficultyFilter').value='';">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  const ingredientsMap = getIngredientsMap();

  recipesGrid.innerHTML = recipes.slice(0, 50).map(recipe => {
    const totalTime = recipe.prepTime + recipe.cookTime;
    const nutrition = calculateRecipeNutrition(recipe, ingredientsMap);
    const nutritionBadge = formatNutritionBadge(nutrition);
    const cuisineEmoji = getCuisineEmoji(recipe.cuisine);

    const imageHtml = recipe.imageUrl
      ? `<div class="browser-card__image-wrap">
           <img src="${recipe.imageUrl}" alt="${escapeHtml(recipe.title)}" class="browser-card__image" loading="lazy">
           <div class="browser-card__image-title">${escapeHtml(recipe.title)}</div>
         </div>`
      : `<div class="browser-card__image-wrap">
           <div class="browser-card__image browser-card__image--placeholder">${getMealEmoji(recipe.mealType)}</div>
           <div class="browser-card__image-title">${escapeHtml(recipe.title)}</div>
         </div>`;

    return `
      <div class="browser-card" data-recipe-id="${recipe.id}">
        ${imageHtml}
        <div class="browser-card__content">
          <h3 class="browser-card__title">${escapeHtml(recipe.title)}</h3>
          <div class="browser-card__meta">
            <span>${cuisineEmoji} ${capitalize(recipe.cuisine)}</span>
            <span>⏱️ ${totalTime} min</span>
          </div>
          <div class="browser-card__details">
            <span class="browser-card__difficulty browser-card__difficulty--${recipe.difficulty}">${capitalize(recipe.difficulty)}</span>
            <span class="browser-card__servings">👥 ${recipe.servings}</span>
          </div>
          <div class="browser-card__nutrition">${nutritionBadge}</div>
        </div>
        <button class="browser-card__select" data-recipe-id="${recipe.id}">
          Select Recipe
        </button>
      </div>
    `;
  }).join('');

  // Add click handlers
  recipesGrid.querySelectorAll('.browser-card__select').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const recipeId = btn.dataset.recipeId;
      showRecipeConfirmation(recipeId);
    });
  });

  // Card click also selects
  recipesGrid.querySelectorAll('.browser-card').forEach(card => {
    card.addEventListener('click', () => {
      const recipeId = card.dataset.recipeId;
      showRecipeConfirmation(recipeId);
    });
  });

  // Animate cards in
  gsap.fromTo('.browser-card',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' }
  );
}

/**
 * Show recipe confirmation panel
 */
function showRecipeConfirmation(recipeId) {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return;

  const panel = document.getElementById('recipeConfirmPanel');
  const nameEl = document.getElementById('confirmRecipeName');
  const servingsInput = document.getElementById('confirmServings');
  const mealTypeSelect = document.getElementById('confirmMealType');
  const ingredientsEl = document.getElementById('confirmIngredientsList');
  const instructionsEl = document.getElementById('confirmInstructionsList');
  const nutritionEl = document.getElementById('confirmNutrition');

  if (!panel) return;

  // Set recipe info
  panel.dataset.recipeId = recipeId;
  nameEl.textContent = recipe.title;
  servingsInput.value = recipe.servings;

  // Set meal type based on recipe
  const defaultMealType = Array.isArray(recipe.mealType) ? recipe.mealType[0] : recipe.mealType || 'dinner';
  mealTypeSelect.value = defaultMealType;

  // Render all sections
  renderIngredientList(recipe, recipe.servings, ingredientsEl);
  renderNutritionBadge(recipe, recipe.servings, nutritionEl);
  renderInstructions(recipe, instructionsEl);

  // Listen for servings change
  servingsInput.oninput = () => {
    const servings = parseInt(servingsInput.value) || 1;
    renderIngredientList(recipe, servings, ingredientsEl);
    renderNutritionBadge(recipe, servings, nutritionEl);
  };

  // Show panel with animation
  panel.classList.add('active');
  gsap.fromTo(panel,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
  );
}

/**
 * Hide recipe confirmation panel
 */
function hideRecipeConfirmation() {
  const panel = document.getElementById('recipeConfirmPanel');
  if (panel) {
    panel.classList.remove('active');
    panel.dataset.recipeId = '';
  }
}

/**
 * Render nutrition badge next to title
 */
function renderNutritionBadge(recipe, servings, container) {
  const ingredientsMap = getIngredientsMap();
  const nutrition = calculateRecipeNutrition(recipe, ingredientsMap);

  if (!nutrition || !nutrition.perServing) {
    container.innerHTML = '';
    return;
  }

  const scaleFactor = servings / recipe.servings;
  const calories = Math.round(nutrition.perServing.calories * scaleFactor);
  const protein = Math.round(nutrition.perServing.protein * scaleFactor * 10) / 10;
  const carbs = Math.round(nutrition.perServing.carbs * scaleFactor * 10) / 10;
  const fat = Math.round(nutrition.perServing.fat * scaleFactor * 10) / 10;

  container.innerHTML = `
    <div class="nutrition-badge">
      <span class="nutrition-badge__item"><strong>${calories}</strong> cal</span>
      <span class="nutrition-badge__item"><strong>${protein}g</strong> protein</span>
      <span class="nutrition-badge__item"><strong>${carbs}g</strong> carbs</span>
      <span class="nutrition-badge__item"><strong>${fat}g</strong> fat</span>
    </div>
  `;
}

/**
 * Render cooking instructions
 */
function renderInstructions(recipe, container) {
  if (!recipe.instructions || recipe.instructions.length === 0) {
    container.innerHTML = '<p class="no-instructions">No instructions available</p>';
    return;
  }

  const totalTime = recipe.prepTime + recipe.cookTime;

  const stepsHtml = recipe.instructions.map((inst, idx) => `
    <div class="instruction-step">
      <span class="instruction-step__number">${idx + 1}</span>
      <span class="instruction-step__text">${escapeHtml(inst.text)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="instructions-header">
      <h4>Cooking Steps</h4>
      <span class="instructions-time">⏱️ ${recipe.prepTime} prep + ${recipe.cookTime} cook = ${totalTime} min</span>
    </div>
    <div class="instructions-list">
      ${stepsHtml}
    </div>
  `;
}

/**
 * Render ingredient list with availability color coding
 */
function renderIngredientList(recipe, servings, container) {
  const ingredientsMap = getIngredientsMap();
  const pantryItems = getPantryItems();
  const pantryMap = new Map(pantryItems.map(p => [p.ingredientId, p]));

  // Calculate scaling factor based on servings
  const scaleFactor = servings / recipe.servings;

  // Count available vs missing
  let haveCount = 0;
  let missingCount = 0;

  const ingredientsHtml = recipe.ingredients.map(ing => {
    const ingredientData = ingredientsMap.get(ing.ingredientId);
    const ingredientName = ingredientData?.name || ing.name || 'Unknown';
    const pantryItem = pantryMap.get(ing.ingredientId);

    // Scale the required quantity
    const neededQty = (ing.quantity || 0) * scaleFactor;
    const haveQty = pantryItem?.quantity || 0;

    // Determine status
    let statusClass = '';
    let statusIcon = '';

    if (ing.optional) {
      statusClass = 'ingredient--optional';
      statusIcon = '○';
    } else if (haveQty >= neededQty && neededQty > 0) {
      statusClass = 'ingredient--have';
      statusIcon = '✓';
      haveCount++;
    } else if (haveQty > 0) {
      statusClass = 'ingredient--low';
      statusIcon = '◐';
      missingCount++;
    } else {
      statusClass = 'ingredient--missing';
      statusIcon = '✗';
      missingCount++;
    }

    // Format quantities
    const neededStr = neededQty > 0 ? `${formatQty(neededQty)} ${ing.unit}` : ing.unit;
    const haveStr = haveQty > 0 ? `(have ${formatQty(haveQty)})` : '(none)';

    return `
      <div class="confirm-ingredient ${statusClass}">
        <span class="confirm-ingredient__status">${statusIcon}</span>
        <span class="confirm-ingredient__name">${escapeHtml(ingredientName)}</span>
        <span class="confirm-ingredient__qty">${neededStr}</span>
        <span class="confirm-ingredient__have">${haveStr}</span>
      </div>
    `;
  }).join('');

  // Summary
  const totalRequired = recipe.ingredients.filter(i => !i.optional).length;
  const summaryClass = missingCount === 0 ? 'summary--ok' : 'summary--warning';
  const summaryText = missingCount === 0
    ? `✓ All ${totalRequired} ingredients available`
    : `⚠️ ${haveCount}/${totalRequired} ingredients available (${missingCount} missing)`;

  container.innerHTML = `
    <div class="confirm-ingredients-summary ${summaryClass}">${summaryText}</div>
    <div class="confirm-ingredients-list">${ingredientsHtml}</div>
  `;
}

/**
 * Format quantity for display
 */
function formatQty(qty) {
  if (qty === Math.floor(qty)) return qty.toString();
  if (Math.abs(qty - 0.25) < 0.01) return '¼';
  if (Math.abs(qty - 0.5) < 0.01) return '½';
  if (Math.abs(qty - 0.75) < 0.01) return '¾';
  if (Math.abs(qty - 0.33) < 0.05) return '⅓';
  if (Math.abs(qty - 0.67) < 0.05) return '⅔';
  return qty.toFixed(1);
}

/**
 * Handle confirm add meal
 */
function handleConfirmAddMeal() {
  const panel = document.getElementById('recipeConfirmPanel');
  const recipeId = panel?.dataset.recipeId;
  const servings = parseInt(document.getElementById('confirmServings')?.value) || 4;
  const mealType = document.getElementById('confirmMealType')?.value || 'dinner';

  if (!recipeId || !selectedDate) return;

  const meal = addMealToDate(selectedDate, recipeId, mealType, servings, '');

  if (meal && onMealAddedCallback) {
    onMealAddedCallback(selectedDate, meal);
  }

  // Close modal
  closeRecipeBrowserModal();
}

/**
 * Utility functions
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

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCuisineEmoji(cuisine) {
  const emojis = {
    italian: '🇮🇹', mexican: '🇲🇽', asian: '🥢', american: '🇺🇸',
    chinese: '🇨🇳', japanese: '🇯🇵', indian: '🇮🇳', mediterranean: '🫒',
    french: '🇫🇷', thai: '🇹🇭', greek: '🇬🇷', korean: '🇰🇷', spanish: '🇪🇸'
  };
  return emojis[cuisine?.toLowerCase()] || '🍽️';
}

function getMealEmoji(mealType) {
  const type = Array.isArray(mealType) ? mealType[0] : mealType;
  const emojis = { breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍪' };
  return emojis[type] || '🍲';
}

export default {
  initRecipeBrowserModal,
  openRecipeBrowserModal,
  closeRecipeBrowserModal
};
