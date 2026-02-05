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
import { getRemainingNutrition, checkRecipeFitsNutrition } from '../modules/nutritionAggregator.js';
import { isTrackingEnabled } from '../modules/nutritionPrefsManager.js';

const MODAL_ID = 'recipeBrowserModal';

// Filter options - Clean text labels, no emojis
const CUISINES = [
  { value: '', label: 'All Cuisines' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'asian', label: 'Asian' },
  { value: 'american', label: 'American' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'indian', label: 'Indian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'french', label: 'French' },
  { value: 'thai', label: 'Thai' },
  { value: 'greek', label: 'Greek' },
  { value: 'korean', label: 'Korean' }
];

const MEAL_TYPES = [
  { value: '', label: 'All Meals' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
];

const DIFFICULTIES = [
  { value: '', label: 'Any Difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

// State
let selectedDate = null;
let currentFilters = {
  search: '',
  cuisine: '',
  mealType: '',
  difficulty: '',
  maxCalories: null,
  minProtein: null,
  fitsRemaining: false
};
let onMealAddedCallback = null;
let searchDebounceTimer = null;

// DOM References
let searchInput = null;
let cuisineSelect = null;
let mealTypeSelect = null;
let difficultySelect = null;
let maxCaloriesInput = null;
let minProteinInput = null;
let fitsRemainingBtn = null;
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

  // Nutrition filters
  maxCaloriesInput = document.getElementById('browserMaxCalories');
  minProteinInput = document.getElementById('browserMinProtein');
  fitsRemainingBtn = document.getElementById('browserFitsRemaining');

  maxCaloriesInput?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    currentFilters.maxCalories = val > 0 ? val : null;
    renderFilteredRecipes();
  });

  minProteinInput?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    currentFilters.minProtein = val > 0 ? val : null;
    renderFilteredRecipes();
  });

  fitsRemainingBtn?.addEventListener('click', () => {
    currentFilters.fitsRemaining = !currentFilters.fitsRemaining;
    fitsRemainingBtn.classList.toggle('active', currentFilters.fitsRemaining);
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
  currentFilters = {
    search: '',
    cuisine: '',
    mealType: mealType || '',
    difficulty: '',
    maxCalories: null,
    minProtein: null,
    fitsRemaining: false
  };
  if (searchInput) searchInput.value = '';
  if (cuisineSelect) cuisineSelect.value = '';
  if (mealTypeSelect) mealTypeSelect.value = mealType || '';
  if (difficultySelect) difficultySelect.value = '';
  if (maxCaloriesInput) maxCaloriesInput.value = '';
  if (minProteinInput) minProteinInput.value = '';
  if (fitsRemainingBtn) fitsRemainingBtn.classList.remove('active');

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
  const ingredientsMap = getIngredientsMap();

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

  // Max calories per serving filter
  if (currentFilters.maxCalories) {
    recipes = recipes.filter(r => {
      const nutrition = calculateRecipeNutrition(r, ingredientsMap);
      if (!nutrition || !nutrition.perServing) return true; // Keep if no data
      return nutrition.perServing.calories <= currentFilters.maxCalories;
    });
  }

  // Min protein per serving filter
  if (currentFilters.minProtein) {
    recipes = recipes.filter(r => {
      const nutrition = calculateRecipeNutrition(r, ingredientsMap);
      if (!nutrition || !nutrition.perServing) return true; // Keep if no data
      return nutrition.perServing.protein >= currentFilters.minProtein;
    });
  }

  // Fits remaining nutrition budget filter
  if (currentFilters.fitsRemaining && selectedDate && isTrackingEnabled()) {
    recipes = recipes.filter(r => {
      const fitCheck = checkRecipeFitsNutrition(r, selectedDate);
      return fitCheck.fits;
    });
  }

  return recipes;
}

/**
 * Render filtered recipes as clean list rows
 */
function renderFilteredRecipes() {
  const recipes = getFilteredRecipes();

  // Update count
  if (resultsCount) {
    resultsCount.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;
  }

  if (recipes.length === 0) {
    recipesGrid.innerHTML = `
      <div class="recipe-browser__empty">
        <p>No recipes match your filters</p>
        <button class="btn btn--secondary" id="clearAllFiltersBtn">
          Clear Filters
        </button>
      </div>
    `;

    // Add event listener for clear filters button
    document.getElementById('clearAllFiltersBtn')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (cuisineSelect) cuisineSelect.value = '';
      if (mealTypeSelect) mealTypeSelect.value = '';
      if (difficultySelect) difficultySelect.value = '';
      if (maxCaloriesInput) maxCaloriesInput.value = '';
      if (minProteinInput) minProteinInput.value = '';
      if (fitsRemainingBtn) fitsRemainingBtn.classList.remove('active');
      currentFilters = {
        search: '',
        cuisine: '',
        mealType: '',
        difficulty: '',
        maxCalories: null,
        minProtein: null,
        fitsRemaining: false
      };
      renderFilteredRecipes();
    });
    return;
  }

  // Render as clean rows with nutrition info
  const ingredientsMap = getIngredientsMap();

  recipesGrid.innerHTML = recipes.slice(0, 50).map(recipe => {
    const totalTime = recipe.prepTime + recipe.cookTime;
    const nutrition = calculateRecipeNutrition(recipe, ingredientsMap);

    // Generate nutrition badge
    let nutritionBadge = '';
    if (nutrition && nutrition.perServing) {
      const cal = nutrition.perServing.calories;
      const protein = nutrition.perServing.protein;
      nutritionBadge = `<span class="recipe-row__nutrition">${cal} cal | ${protein}g protein</span>`;
    }

    // Check if fits remaining budget (if tracking enabled)
    let fitsClass = '';
    if (selectedDate && isTrackingEnabled()) {
      const fitCheck = checkRecipeFitsNutrition(recipe, selectedDate);
      fitsClass = fitCheck.fits ? 'recipe-row--fits' : 'recipe-row--exceeds';
    }

    return `
      <div class="recipe-row ${fitsClass}" data-recipe-id="${recipe.id}">
        <span class="recipe-row__title">${escapeHtml(recipe.title)}</span>
        <span class="recipe-row__cuisine">${capitalize(recipe.cuisine || 'Other')}</span>
        ${nutritionBadge}
        <span class="recipe-row__time">${totalTime} min</span>
        <span class="recipe-row__difficulty recipe-row__difficulty--${recipe.difficulty}">${capitalize(recipe.difficulty)}</span>
      </div>
    `;
  }).join('');

  // Row click selects recipe
  recipesGrid.querySelectorAll('.recipe-row').forEach(row => {
    row.addEventListener('click', () => {
      // Remove previous selection
      recipesGrid.querySelectorAll('.recipe-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');

      const recipeId = row.dataset.recipeId;
      showRecipeConfirmation(recipeId);
    });
  });

  // Animate rows in
  gsap.fromTo('.recipe-row',
    { opacity: 0, x: -10 },
    { opacity: 1, x: 0, duration: 0.2, stagger: 0.02, ease: 'power2.out' }
  );
}

/**
 * Show recipe preview panel with ingredients and instructions
 */
function showRecipeConfirmation(recipeId) {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return;

  const panel = document.getElementById('recipeConfirmPanel');
  const nameEl = document.getElementById('confirmRecipeName');
  const servingsInput = document.getElementById('confirmServings');
  const mealTypeInput = document.getElementById('confirmMealType');
  const ingredientsEl = document.getElementById('confirmIngredientsList');
  const instructionsEl = document.getElementById('confirmInstructionsList');
  const nutritionEl = document.getElementById('confirmNutrition');

  if (!panel) return;

  // Set recipe info
  panel.dataset.recipeId = recipeId;
  nameEl.textContent = recipe.title;
  servingsInput.value = recipe.servings;

  // Set meal type based on recipe (hidden field)
  const defaultMealType = Array.isArray(recipe.mealType) ? recipe.mealType[0] : recipe.mealType || 'dinner';
  if (mealTypeInput) mealTypeInput.value = defaultMealType;

  // Render meta info
  renderNutritionBadge(recipe, recipe.servings, nutritionEl);

  // Render ingredients with availability colors
  renderIngredientList(recipe, recipe.servings, ingredientsEl);

  // Render instructions
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
    { opacity: 0 },
    { opacity: 1, duration: 0.2, ease: 'power2.out' }
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
 * Render nutrition info as clean text
 */
function renderNutritionBadge(recipe, servings, container) {
  if (!container) return;

  const ingredientsMap = getIngredientsMap();
  const nutrition = calculateRecipeNutrition(recipe, ingredientsMap);
  const totalTime = recipe.prepTime + recipe.cookTime;

  if (!nutrition || !nutrition.perServing) {
    container.textContent = `${totalTime} min · ${servings} servings`;
    return;
  }

  const scaleFactor = servings / recipe.servings;
  const calories = Math.round(nutrition.perServing.calories * scaleFactor);
  const protein = Math.round(nutrition.perServing.protein * scaleFactor);

  container.textContent = `${totalTime} min · ${calories} cal · ${protein}g protein`;
}

/**
 * Render cooking instructions - clean numbered list
 */
function renderInstructions(recipe, container) {
  if (!container) return;

  if (!recipe.instructions || recipe.instructions.length === 0) {
    container.innerHTML = '<p class="preview-empty">No instructions available</p>';
    return;
  }

  const stepsHtml = recipe.instructions.map((inst, idx) => `
    <div class="preview-step">
      <span class="preview-step__number">${idx + 1}</span>
      <span class="preview-step__text">${escapeHtml(inst.text)}</span>
    </div>
  `).join('');

  container.innerHTML = stepsHtml;
}

/**
 * Render ingredient list with availability color coding
 */
function renderIngredientList(recipe, servings, container) {
  if (!container) return;

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
      statusClass = 'preview-ingredient--optional';
      statusIcon = '~';
    } else if (haveQty >= neededQty && neededQty > 0) {
      statusClass = 'preview-ingredient--have';
      statusIcon = '+';
      haveCount++;
    } else if (haveQty > 0) {
      statusClass = 'preview-ingredient--low';
      statusIcon = '!';
      missingCount++;
    } else {
      statusClass = 'preview-ingredient--missing';
      statusIcon = '-';
      missingCount++;
    }

    // Format quantity
    const qtyStr = neededQty > 0 ? `${formatQty(neededQty)} ${ing.unit}` : ing.unit;

    return `
      <div class="preview-ingredient ${statusClass}">
        <span class="preview-ingredient__status">${statusIcon}</span>
        <span class="preview-ingredient__name">${escapeHtml(ingredientName)}</span>
        <span class="preview-ingredient__qty">${qtyStr}</span>
      </div>
    `;
  }).join('');

  // Summary bar
  const totalRequired = recipe.ingredients.filter(i => !i.optional).length;
  const summaryClass = missingCount === 0 ? 'preview-ingredients__summary--ok' : 'preview-ingredients__summary--warning';
  const summaryText = missingCount === 0
    ? `All ${totalRequired} ingredients in pantry`
    : `${missingCount} of ${totalRequired} ingredients missing`;

  container.innerHTML = `
    ${ingredientsHtml}
    <div class="preview-ingredients__summary ${summaryClass}">${summaryText}</div>
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

export default {
  initRecipeBrowserModal,
  openRecipeBrowserModal,
  closeRecipeBrowserModal
};
