/**
 * Add Meal Modal Component
 * Handles adding meals to the meal plan with recipe search and availability checking
 */

import gsap from 'gsap';
import { openModal, closeModal } from '../modules/modalManager.js';
import { getRecipes, searchRecipes, getRecipeById } from '../modules/recipeManager.js';
import { addMealToDate, checkRecipeAvailability, formatDate, parseDate } from '../modules/mealPlanManager.js';
import { getIngredientById, getCategoryIcon } from '../modules/ingredientManager.js';

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

const MODAL_ID = 'addMealModal';
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { value: 'lunch', label: 'Lunch', icon: '🥗' },
  { value: 'dinner', label: 'Dinner', icon: '🍽️' },
  { value: 'snack', label: 'Snack', icon: '🍪' }
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let selectedDate = null;
let selectedRecipe = null;
let searchDebounceTimer = null;
let onMealAddedCallback = null;

/**
 * Format date for display
 */
function formatDisplayDate(dateStr) {
  const date = parseDate(dateStr);
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  return `${dayName}, ${monthName} ${day}`;
}

/**
 * Initialize the add meal modal
 */
export function initAddMealModal(onMealAdded) {
  onMealAddedCallback = onMealAdded;

  const form = document.getElementById('addMealForm');
  const recipeSearchInput = document.getElementById('mealRecipeSearch');
  const recipeResultsContainer = document.getElementById('mealRecipeResults');
  const selectedRecipeDisplay = document.getElementById('selectedRecipeDisplay');
  const availabilityWarning = document.getElementById('mealAvailabilityWarning');
  const servingsInput = document.getElementById('mealServings');
  const submitBtn = document.getElementById('submitAddMeal');
  const cancelBtn = document.getElementById('cancelAddMeal');

  // Recipe search with debounce
  recipeSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(searchDebounceTimer);

    if (query.length < 2) {
      recipeResultsContainer.innerHTML = '';
      recipeResultsContainer.style.display = 'none';
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      const allRecipes = getRecipes();
      const results = searchRecipes(allRecipes, query).slice(0, 8);

      renderRecipeResults(results, recipeResultsContainer, (recipe) => {
        selectRecipe(recipe, recipeSearchInput, recipeResultsContainer, selectedRecipeDisplay, availabilityWarning, servingsInput, submitBtn);
      });
    }, 150);
  });

  // Keyboard navigation for results
  recipeSearchInput.addEventListener('keydown', (e) => {
    const items = recipeResultsContainer.querySelectorAll('.recipe-result-item');
    const highlighted = recipeResultsContainer.querySelector('.recipe-result-item--highlighted');
    let currentIndex = Array.from(items).indexOf(highlighted);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < items.length - 1) {
        if (highlighted) highlighted.classList.remove('recipe-result-item--highlighted');
        items[currentIndex + 1].classList.add('recipe-result-item--highlighted');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        if (highlighted) highlighted.classList.remove('recipe-result-item--highlighted');
        items[currentIndex - 1].classList.add('recipe-result-item--highlighted');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted) {
        highlighted.click();
      }
    } else if (e.key === 'Escape') {
      recipeResultsContainer.innerHTML = '';
      recipeResultsContainer.style.display = 'none';
    }
  });

  // Click outside to close results
  document.addEventListener('click', (e) => {
    if (!recipeSearchInput.contains(e.target) && !recipeResultsContainer.contains(e.target)) {
      recipeResultsContainer.innerHTML = '';
      recipeResultsContainer.style.display = 'none';
    }
  });

  // Servings change updates availability
  servingsInput.addEventListener('input', () => {
    if (selectedRecipe) {
      updateAvailabilityWarning(availabilityWarning, selectedRecipe, parseInt(servingsInput.value) || 1);
    }
  });

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    closeAddMealModal();
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!selectedRecipe || !selectedDate) return;

    const mealType = document.getElementById('mealType').value;
    const servings = parseInt(servingsInput.value) || selectedRecipe.servings;
    const notes = document.getElementById('mealNotes').value;

    const meal = addMealToDate(selectedDate, selectedRecipe.id, mealType, servings, notes);

    if (meal && onMealAddedCallback) {
      onMealAddedCallback(selectedDate, meal);
    }

    closeAddMealModal();
  });
}

/**
 * Render recipe search results
 */
function renderRecipeResults(recipes, container, onSelect) {
  if (recipes.length === 0) {
    container.innerHTML = '<div class="recipe-results-empty">No recipes found</div>';
    container.style.display = 'block';
    return;
  }

  container.innerHTML = recipes.map((recipe, index) => {
    const cuisineFlag = getCuisineFlag(recipe.cuisine);
    const safeTitle = escapeHtml(recipe.title);
    const safeDifficulty = escapeHtml(recipe.difficulty);
    return `
      <div class="recipe-result-item ${index === 0 ? 'recipe-result-item--highlighted' : ''}" data-recipe-id="${escapeHtml(recipe.id)}">
        <span class="recipe-result-item__icon">${cuisineFlag}</span>
        <div class="recipe-result-item__info">
          <div class="recipe-result-item__name">${safeTitle}</div>
          <div class="recipe-result-item__meta">${recipe.prepTime + recipe.cookTime} min | ${safeDifficulty} | ${recipe.servings} servings</div>
        </div>
      </div>
    `;
  }).join('');

  container.style.display = 'block';

  // Add click handlers
  container.querySelectorAll('.recipe-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const recipeId = item.dataset.recipeId;
      const recipe = getRecipeById(recipeId);
      if (recipe) {
        onSelect(recipe);
      }
    });
  });
}

/**
 * Get cuisine flag emoji
 */
function getCuisineFlag(cuisine) {
  const flags = {
    italian: '🇮🇹',
    mexican: '🇲🇽',
    american: '🇺🇸',
    chinese: '🇨🇳',
    japanese: '🇯🇵',
    indian: '🇮🇳',
    thai: '🇹🇭',
    french: '🇫🇷',
    spanish: '🇪🇸',
    greek: '🇬🇷',
    korean: '🇰🇷',
    vietnamese: '🇻🇳',
    mediterranean: '🫒',
    asian: '🥢'
  };
  return flags[cuisine.toLowerCase()] || '🍴';
}

/**
 * Select a recipe
 */
function selectRecipe(recipe, searchInput, resultsContainer, displayContainer, warningContainer, servingsInput, submitBtn) {
  selectedRecipe = recipe;

  // Clear search
  searchInput.value = '';
  resultsContainer.innerHTML = '';
  resultsContainer.style.display = 'none';

  // Show selected recipe
  const cuisineFlag = getCuisineFlag(recipe.cuisine);
  const safeTitle = escapeHtml(recipe.title);
  const safeDifficulty = escapeHtml(recipe.difficulty);
  displayContainer.innerHTML = `
    <div class="selected-recipe">
      <span class="selected-recipe__icon">${cuisineFlag}</span>
      <div class="selected-recipe__info">
        <div class="selected-recipe__name">${safeTitle}</div>
        <div class="selected-recipe__meta">${recipe.prepTime + recipe.cookTime} min | ${safeDifficulty}</div>
      </div>
      <button type="button" class="selected-recipe__clear" title="Clear selection">&times;</button>
    </div>
  `;
  displayContainer.style.display = 'block';

  // Set default servings
  servingsInput.value = recipe.servings;

  // Update availability warning
  updateAvailabilityWarning(warningContainer, recipe, recipe.servings);

  // Enable submit
  submitBtn.disabled = false;

  // Clear selection button
  displayContainer.querySelector('.selected-recipe__clear').addEventListener('click', () => {
    clearRecipeSelection(displayContainer, warningContainer, submitBtn);
  });

  // Animate in
  gsap.fromTo(displayContainer,
    { opacity: 0, y: -10 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
  );
}

/**
 * Clear recipe selection
 */
function clearRecipeSelection(displayContainer, warningContainer, submitBtn) {
  selectedRecipe = null;
  displayContainer.innerHTML = '';
  displayContainer.style.display = 'none';
  warningContainer.innerHTML = '';
  warningContainer.style.display = 'none';
  submitBtn.disabled = true;
}

/**
 * Update availability warning
 */
function updateAvailabilityWarning(container, recipe, servings) {
  const availability = checkRecipeAvailability(recipe, servings);

  if (availability.canMake) {
    container.innerHTML = `
      <div class="availability-ok">
        <span class="availability-ok__icon">✓</span>
        <span>All ingredients available</span>
      </div>
    `;
    container.style.display = 'block';
    container.className = 'availability-warning availability-warning--ok';
  } else {
    const issues = [...availability.missing, ...availability.warnings];
    const issuesList = issues.slice(0, 3).map(item =>
      `<li>${escapeHtml(item.name)}: need ${item.needed.toFixed(1)} ${escapeHtml(item.unit)}, have ${item.available.toFixed(1)}</li>`
    ).join('');

    const moreCount = issues.length - 3;
    const moreText = moreCount > 0 ? `<li class="more">+${moreCount} more...</li>` : '';

    container.innerHTML = `
      <div class="availability-issues">
        <span class="availability-issues__icon">⚠️</span>
        <div class="availability-issues__content">
          <div class="availability-issues__title">
            ${availability.missing.length > 0 ? 'Missing ingredients' : 'Low on ingredients'}
          </div>
          <ul class="availability-issues__list">${issuesList}${moreText}</ul>
        </div>
      </div>
    `;
    container.style.display = 'block';
    container.className = 'availability-warning availability-warning--issues';
  }

  // Animate
  gsap.fromTo(container,
    { opacity: 0 },
    { opacity: 1, duration: 0.3 }
  );
}

/**
 * Open the add meal modal
 */
export function openAddMealModal(date, recipe = null) {
  selectedDate = date;
  selectedRecipe = null;

  // Update modal title with date
  const dateDisplay = document.getElementById('addMealDateDisplay');
  if (dateDisplay) {
    dateDisplay.textContent = formatDisplayDate(date);
  }

  // Reset form
  const form = document.getElementById('addMealForm');
  form.reset();

  // Clear previous selections
  const selectedRecipeDisplay = document.getElementById('selectedRecipeDisplay');
  const availabilityWarning = document.getElementById('mealAvailabilityWarning');
  const submitBtn = document.getElementById('submitAddMeal');
  const recipeSearchInput = document.getElementById('mealRecipeSearch');
  const recipeResultsContainer = document.getElementById('mealRecipeResults');
  const servingsInput = document.getElementById('mealServings');

  selectedRecipeDisplay.innerHTML = '';
  selectedRecipeDisplay.style.display = 'none';
  availabilityWarning.innerHTML = '';
  availabilityWarning.style.display = 'none';
  recipeResultsContainer.innerHTML = '';
  recipeResultsContainer.style.display = 'none';
  submitBtn.disabled = true;

  // If recipe pre-selected, set it
  if (recipe) {
    selectRecipe(recipe, recipeSearchInput, recipeResultsContainer, selectedRecipeDisplay, availabilityWarning, servingsInput, submitBtn);
  }

  openModal(MODAL_ID);
}

/**
 * Close the add meal modal
 */
export function closeAddMealModal() {
  selectedDate = null;
  selectedRecipe = null;
  closeModal(MODAL_ID);
}

export default {
  initAddMealModal,
  openAddMealModal,
  closeAddMealModal
};
