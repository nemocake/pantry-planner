import './styles/main.css';
import gsap from 'gsap';

// Import core modules
import { initNavigation, switchView, onViewChange } from './modules/navigation.js';

// Import auth modules
import { initAuthModal, openAuthModal, closeAuthModal } from './components/authModal.js';
import { getCurrentUser, getCurrentProfile, signOut, onAuthStateChange } from './services/authService.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { initSyncOrchestrator } from './services/syncOrchestrator.js';

// Import profile modules
import { initProfileSection, navigateToProfile } from './components/profileSection.js';

// Import pantry modules
import { loadIngredients, getCategories, getCategoryIcon, getIngredientById, getIngredientsByCategory, searchIngredients } from './modules/ingredientManager.js';
import { CATEGORY_ICONS } from './data/icons.js';
import {
  initPantry,
  onPantryChange,
  getPantryItems,
  addPantryItem,
  updatePantryQuantity,
  removePantryItem,
  downloadPantryJson,
  importPantryFromFile,
  getPantryStats,
  getPantryIngredientIds
} from './modules/pantryManager.js';
import { openModal, closeModal } from './modules/modalManager.js';
import { initAutocomplete, clearAutocomplete } from './components/autocomplete.js';
import { renderPantryGrid, filterPantryCards } from './components/pantryCard.js';
import { renderIngredientBrowser, getCategoryDisplayName } from './components/ingredientBrowser.js';
import { renderPantryList, handlePantryListClick, filterPantryList } from './components/pantryListRenderer.js';
import { renderShoppingListHtml, renderEmptyState, setupCheckboxHandlers, generatePlainTextList } from './components/shoppingListRenderer.js';

// Import recipe modules
import { loadRecipes, getRecipes, getRecipeById, applyFilters, getUniqueCuisines } from './modules/recipeManager.js';
import { getMatchedRecipes, filterByMatchType, countMakeableRecipes } from './modules/matchAlgorithm.js';
import { renderRecipeGrid, renderRecipeDetail, setAddToMealPlanCallback } from './components/recipeCard.js';

// Import meal planner modules
import {
  initMealPlan,
  onMealPlanChange,
  getMealsForWeek,
  getMealsForDate,
  getMealPlanStats,
  removeMeal,
  clearWeek,
  getShoppingList,
  getWeekStart,
  formatDate,
  getMealDate,
  createLeftover,
  parseDate,
  MEAL_STATUS,
  markMealAsEaten,
  dismissMeal,
  moveMeal,
  undoMealStatus
} from './modules/mealPlanManager.js';
import { renderWeekView, navigateWeek, goToCurrentWeek, formatWeekTitle } from './components/calendarView.js';
import { initAddMealModal, openAddMealModal } from './components/addMealModal.js';
import { initRecipeBrowserModal, openRecipeBrowserModal } from './components/recipeBrowserModal.js';
import { initQuantityModal } from './components/quantityModal.js';

// Import nutrition modules
import { initNutritionPrefs, isTrackingEnabled, getAllDailyGoals } from './modules/nutritionPrefsManager.js';
import { calculateWeekNutrition, calculateWeekActualNutrition, calculateActualDayNutrition } from './modules/nutritionAggregator.js';
import { initNutritionPrefsModal } from './components/nutritionPrefsModal.js';
import { initNutritionWidget, renderWidget as renderNutritionWidget } from './components/nutritionWidget.js';

// State
let allRecipes = [];
let currentFilters = {
  search: '',
  difficulty: 'all',
  cuisine: 'all',
  matchType: 'all'
};
let selectedIngredient = null;
let showAllRecipes = false;
const RECIPE_PREVIEW_COUNT = 6;

// Meal planner state
let currentWeekStart = goToCurrentWeek();

// Auth state
let currentUser = null;
let currentProfile = null;

// ============================================
// Pantry Functions
// ============================================

/**
 * Initialize pantry UI for new dashboard view
 */
function initPantryUI() {
  const categoryFilter = document.getElementById('categoryFilter');
  const browserGrid = document.getElementById('browserGrid');
  const pantryGrid = document.getElementById('pantryGrid');
  const pantryTabs = document.getElementById('pantryTabs');

  // Render pantry items as clean list
  function renderPantryCards() {
    renderPantryList(browserGrid, { showAddRow: true, emptyStateAction: 'modal' });
  }

  // Handle grid clicks (quantity changes and add new item)
  browserGrid.addEventListener('click', (e) => handlePantryListClick(e, browserGrid));

  // Handle category filter clicks
  categoryFilter?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;

    const category = btn.dataset.category;

    categoryFilter.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    filterPantryList(browserGrid, category);
  });

  // Listen for global category filter events
  window.addEventListener('categoryfilter', (e) => {
    const category = e.detail.category;
    filterPantryList(browserGrid, category);

    // Update filter tab UI
    categoryFilter?.querySelectorAll('.filter-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.category === category);
    });
  });

  // Render to Pantry view grid as well
  function renderPantryViewGrid() {
    renderPantryList(pantryGrid, { showAddRow: false, emptyStateAction: 'data-action' });
  }

  // Handle pantry view grid clicks
  pantryGrid?.addEventListener('click', (e) => handlePantryListClick(e, pantryGrid));

  // Handle pantry tab clicks - squared tabs above list
  pantryTabs?.addEventListener('click', (e) => {
    const tab = e.target.closest('.pantry-tab');
    if (!tab) return;

    const category = tab.dataset.category;

    // Update active tab
    pantryTabs.querySelectorAll('.pantry-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Filter pantry grid by category
    filterPantryList(pantryGrid, category);

    // Also filter individual cards
    const cards = pantryGrid?.querySelectorAll('.item-card') || [];
    cards.forEach(card => {
      const cardCategory = card.dataset.category;
      if (category === 'all' || cardCategory === category) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });

  // Handle Pantry view action buttons
  const pantryView = document.getElementById('view-pantry');
  pantryView?.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    switch (action) {
      case 'add-ingredient':
        openModal('addIngredientModal');
        break;
      case 'export':
        downloadPantryJson();
        break;
      case 'import':
        document.getElementById('importFileInput')?.click();
        break;
    }
  });

  // Update UI
  function updatePantryUI() {
    renderPantryCards();
    renderPantryViewGrid();
    updatePantryStats();
    updateRecipeGrid();
  }

  // Initial render
  updatePantryUI();

  // Listen for pantry changes
  onPantryChange(() => {
    updatePantryUI();
  });

  // Return update function for other modules to use
  return updatePantryUI;
}

/**
 * Update pantry stats display
 */
function updatePantryStats() {
  const stats = getPantryStats();
  const makeableCount = countMakeableRecipes(allRecipes);

  const statTotal = document.getElementById('statTotal');
  const statRecipes = document.getElementById('statRecipes');
  const statExpiring = document.getElementById('statExpiring');
  const statLowStock = document.getElementById('statLowStock');

  if (statTotal) statTotal.textContent = stats.totalItems;
  if (statRecipes) statRecipes.textContent = makeableCount;
  if (statExpiring) statExpiring.textContent = '0'; // Placeholder
  if (statLowStock) {
    const lowStockCount = getPantryItems().filter(item => item.quantity <= 1).length;
    statLowStock.textContent = lowStockCount;
  }

  // Also update dashboard preview cards
  updateDashboardPreviews();
}

/**
 * Initialize dashboard with 4 preview cards
 */
function initDashboard() {
  const dashboardGrid = document.querySelector('.dashboard-grid');
  if (!dashboardGrid) return;

  // Handle preview card clicks - navigate to subpages
  dashboardGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.preview-card');
    if (!card) return;

    const target = card.dataset.navigate;
    if (target) {
      // Map card targets to view IDs
      const viewMap = {
        'pantry': 'pantry',
        'recipes': 'recipes',
        'planner': 'mealplanner',
        'shopping': 'shoppinglist'
      };
      const viewId = viewMap[target] || target;
      switchView(viewId);
    }
  });

  // Initial render
  updateDashboardPreviews();

  // Listen for pantry changes
  onPantryChange(() => {
    updateDashboardPreviews();
  });

  // Listen for meal plan changes
  onMealPlanChange(() => {
    updateDashboardPreviews();
  });
}

/**
 * Update dashboard preview cards with current data
 */
function updateDashboardPreviews() {
  updatePantryPreview();
  updateRecipePreview();
  updateMealPreview();
  updateShoppingPreview();
}

/**
 * Update pantry preview card
 */
function updatePantryPreview() {
  const countEl = document.getElementById('dashPantryCount');
  const previewEl = document.getElementById('dashPantryPreview');
  if (!previewEl) return;

  const items = getPantryItems();
  const count = items.length;

  if (countEl) countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  if (count === 0) {
    previewEl.innerHTML = '<div class="preview-card__empty">No items in pantry</div>';
    return;
  }

  // Show first 5 items
  const displayItems = items.slice(0, 5);
  let html = '<div class="preview-list">';

  displayItems.forEach(item => {
    const ingredient = getIngredientById(item.ingredientId);
    if (ingredient) {
      html += `
        <div class="preview-list__item">
          <span class="preview-list__name">${escapeHtml(ingredient.name)}</span>
          <span class="preview-list__meta">${item.quantity} ${item.unit || ''}</span>
        </div>
      `;
    }
  });

  if (count > 5) {
    html += `<div class="preview-list__more">+${count - 5} more items</div>`;
  }

  html += '</div>';
  previewEl.innerHTML = html;
}

/**
 * Update recipe preview card
 */
function updateRecipePreview() {
  const countEl = document.getElementById('dashRecipeCount');
  const previewEl = document.getElementById('dashRecipePreview');
  if (!previewEl) return;

  const makeableCount = countMakeableRecipes(allRecipes);

  if (countEl) countEl.textContent = `${makeableCount} can make`;

  if (allRecipes.length === 0) {
    previewEl.innerHTML = '<div class="preview-card__empty">No recipes loaded</div>';
    return;
  }

  // Get makeable recipes
  const pantryIds = getPantryIngredientIds();
  const makeableRecipes = allRecipes.filter(recipe => {
    if (!recipe.ingredients) return false;
    return recipe.ingredients.every(ing => pantryIds.has(ing.ingredientId));
  }).slice(0, 3);

  if (makeableRecipes.length === 0) {
    previewEl.innerHTML = '<div class="preview-card__empty">Add more ingredients to unlock recipes</div>';
    return;
  }

  let html = '<div class="preview-list">';
  makeableRecipes.forEach(recipe => {
    html += `
      <div class="preview-list__item">
        <span class="preview-list__name">${escapeHtml(recipe.title)}</span>
        <span class="preview-recipe__badge">Ready</span>
      </div>
    `;
  });
  html += '</div>';
  previewEl.innerHTML = html;
}

/**
 * Update meal plan preview card
 */
function updateMealPreview() {
  const countEl = document.getElementById('dashMealCount');
  const previewEl = document.getElementById('dashMealPreview');
  if (!previewEl) return;

  // Get this week's meals
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let mealsThisWeek = 0;
  let html = '<div class="preview-list">';
  let hasAnyMeals = false;

  // Check next 5 days
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    const meals = getMealsForDate(dateStr);

    if (meals.length > 0) {
      hasAnyMeals = true;
      mealsThisWeek += meals.length;
      const dayName = i === 0 ? 'Today' : dayNames[date.getDay()];

      meals.slice(0, 1).forEach(meal => {
        const recipe = getRecipeById(meal.recipeId);
        if (recipe) {
          html += `
            <div class="preview-meal">
              <span class="preview-meal__day">${dayName}</span>
              <span class="preview-meal__name">${escapeHtml(recipe.title)}</span>
            </div>
          `;
        }
      });
    }
  }

  html += '</div>';

  if (countEl) countEl.textContent = mealsThisWeek > 0 ? `${mealsThisWeek} planned` : 'This Week';

  if (!hasAnyMeals) {
    previewEl.innerHTML = '<div class="preview-card__empty">No meals planned this week</div>';
  } else {
    previewEl.innerHTML = html;
  }
}

/**
 * Update shopping list preview card
 */
function updateShoppingPreview() {
  const countEl = document.getElementById('dashShoppingCount');
  const previewEl = document.getElementById('dashShoppingPreview');
  if (!previewEl) return;

  // Get shopping list from meal plan (ingredients needed but not in pantry)
  const shoppingList = getShoppingList();
  const count = shoppingList.length;

  if (countEl) countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  if (count === 0) {
    previewEl.innerHTML = '<div class="preview-card__empty">Shopping list is empty</div>';
    return;
  }

  // Show first 5 items
  const displayItems = shoppingList.slice(0, 5);
  let html = '<div class="preview-list">';

  displayItems.forEach(item => {
    const ingredient = getIngredientById(item.ingredientId);
    const name = ingredient ? ingredient.name : 'Unknown';
    html += `
      <div class="preview-list__item">
        <span class="preview-list__name">${escapeHtml(name)}</span>
        <span class="preview-list__meta">${item.needed.toFixed(1)} ${item.unit || ''}</span>
      </div>
    `;
  });

  if (count > 5) {
    html += `<div class="preview-list__more">+${count - 5} more items</div>`;
  }

  html += '</div>';
  previewEl.innerHTML = html;
}

/**
 * Initialize add ingredient modal
 */
function initAddIngredientModal() {
  const searchInput = document.getElementById('ingredientSearchInput');
  const selectedIdInput = document.getElementById('selectedIngredientId');
  const submitBtn = document.getElementById('submitAddIngredient');
  const addBtn = document.getElementById('addIngredientBtn');
  const categoryTabsContainer = document.getElementById('ingredientCategoryTabs');
  const ingredientGrid = document.getElementById('ingredientBrowserGrid');
  const selectionPanel = document.getElementById('ingredientSelectionPanel');
  const selectionIcon = document.getElementById('selectionIcon');
  const selectionName = document.getElementById('selectionName');

  let currentCategory = null;
  let searchDebounce = null;

  // Populate category tabs - Clean text-only tabs
  function populateCategoryTabs() {
    const categories = getCategories();
    categoryTabsContainer.innerHTML = `
      <button class="category-tab active" data-category="all">
        <span class="category-tab__name">All</span>
      </button>
      ${categories.map(cat => `
        <button class="category-tab" data-category="${cat.id}">
          <span class="category-tab__name">${cat.name}</span>
        </button>
      `).join('')}
    `;
  }

  // Render ingredients list - Clean rows with +/- controls
  function renderIngredientsGrid(ingredients) {
    const pantryItems = getPantryItems();

    if (ingredients.length === 0) {
      ingredientGrid.innerHTML = `
        <div class="ingredient-browser__empty" style="width: 100%; padding: 48px; text-align: center;">
          <p>No ingredients found</p>
        </div>
      `;
      return;
    }

    ingredientGrid.innerHTML = ingredients.map(ing => {
      const pantryItem = pantryItems.find(p => p.ingredientId === ing.id);
      const inPantry = !!pantryItem;
      const currentQty = pantryItem ? pantryItem.quantity : 0;
      const currentUnit = pantryItem ? pantryItem.unit : (ing.defaultUnit || 'pieces');

      return `
        <div class="browser-item ${inPantry ? 'browser-item--in-pantry' : ''}"
             data-ingredient-id="${ing.id}" data-default-unit="${ing.defaultUnit || 'pieces'}">
          <div class="browser-item__content">
            <span class="browser-item__name">${escapeHtml(ing.name)}</span>
            <span class="browser-item__quantity ${inPantry ? 'browser-item__quantity--visible' : ''}">${inPantry ? 'In pantry: ' + currentQty + ' ' + currentUnit : ''}</span>
          </div>
          <div class="browser-item__controls">
            <select class="browser-item__unit" data-action="unit">
              <option value="pieces" ${currentUnit === 'pieces' ? 'selected' : ''}>pieces</option>
              <option value="cup" ${currentUnit === 'cup' ? 'selected' : ''}>cups</option>
              <option value="tbsp" ${currentUnit === 'tbsp' ? 'selected' : ''}>tbsp</option>
              <option value="tsp" ${currentUnit === 'tsp' ? 'selected' : ''}>tsp</option>
              <option value="oz" ${currentUnit === 'oz' ? 'selected' : ''}>oz</option>
              <option value="lb" ${currentUnit === 'lb' ? 'selected' : ''}>lb</option>
              <option value="g" ${currentUnit === 'g' ? 'selected' : ''}>grams</option>
              <option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>kg</option>
              <option value="ml" ${currentUnit === 'ml' ? 'selected' : ''}>ml</option>
              <option value="l" ${currentUnit === 'l' ? 'selected' : ''}>liters</option>
              <option value="cloves" ${currentUnit === 'cloves' ? 'selected' : ''}>cloves</option>
              <option value="stalks" ${currentUnit === 'stalks' ? 'selected' : ''}>stalks</option>
              <option value="can" ${currentUnit === 'can' ? 'selected' : ''}>can</option>
            </select>
            <div class="browser-item__qty-group">
              <button class="browser-item__btn browser-item__btn--decrease" data-action="decrease" title="Decrease">−</button>
              <span class="browser-item__qty-display">${currentQty}</span>
              <button class="browser-item__btn browser-item__btn--increase" data-action="increase" title="Increase">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Load ingredients for a category
  function loadCategoryIngredients(categoryId) {
    currentCategory = categoryId;
    let ingredients;

    if (categoryId === 'all') {
      // Get some popular/common ingredients from each category
      const categories = getCategories();
      ingredients = [];
      categories.forEach(cat => {
        const catIngredients = getIngredientsByCategory(cat.id).slice(0, 8);
        ingredients.push(...catIngredients);
      });
    } else {
      ingredients = getIngredientsByCategory(categoryId);
    }

    renderIngredientsGrid(ingredients);
  }

  // Handle category tab click
  categoryTabsContainer?.addEventListener('click', (e) => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;

    categoryTabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const categoryId = tab.dataset.category;
    searchInput.value = '';
    loadCategoryIngredients(categoryId);
  });

  // Handle ingredient row click - +/- buttons and unit changes
  ingredientGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.browser-item__btn');
    const row = e.target.closest('.browser-item');
    if (!row) return;

    const ingredientId = row.dataset.ingredientId;
    const ingredient = getIngredientById(ingredientId);
    if (!ingredient) return;

    // Handle +/- button clicks
    if (btn) {
      e.stopPropagation();
      const action = btn.dataset.action;
      const unitSelect = row.querySelector('.browser-item__unit');
      const qtyDisplay = row.querySelector('.browser-item__qty-display');
      const quantityLabel = row.querySelector('.browser-item__quantity');
      const unit = unitSelect?.value || 'pieces';

      let currentQty = parseInt(qtyDisplay.textContent) || 0;

      if (action === 'increase') {
        currentQty += 1;
      } else if (action === 'decrease' && currentQty > 0) {
        currentQty -= 1;
      }

      // Update display
      qtyDisplay.textContent = currentQty;

      // Update pantry
      if (currentQty > 0) {
        // Add or update pantry item
        const existingItem = getPantryItems().find(p => p.ingredientId === ingredientId);
        if (existingItem) {
          updatePantryQuantity(ingredientId, currentQty);
        } else {
          addPantryItem(ingredientId, currentQty, unit, 'pantry', '');
        }
        row.classList.add('browser-item--in-pantry');
        quantityLabel.classList.add('browser-item__quantity--visible');
        quantityLabel.textContent = `In pantry: ${currentQty} ${unit}`;
      } else {
        // Remove from pantry
        removePantryItem(ingredientId);
        row.classList.remove('browser-item--in-pantry');
        quantityLabel.classList.remove('browser-item__quantity--visible');
        quantityLabel.textContent = '';
      }
      return;
    }
  });

  // Handle unit dropdown changes
  ingredientGrid?.addEventListener('change', (e) => {
    if (!e.target.matches('.browser-item__unit')) return;

    const row = e.target.closest('.browser-item');
    if (!row) return;

    const ingredientId = row.dataset.ingredientId;
    const newUnit = e.target.value;
    const qtyDisplay = row.querySelector('.browser-item__qty-display');
    const quantityLabel = row.querySelector('.browser-item__quantity');
    const currentQty = parseInt(qtyDisplay.textContent) || 0;

    // Update pantry item unit if it exists
    if (currentQty > 0) {
      const pantryItem = getPantryItems().find(p => p.ingredientId === ingredientId);
      if (pantryItem) {
        // Update the unit by removing and re-adding
        removePantryItem(ingredientId);
        addPantryItem(ingredientId, currentQty, newUnit, 'pantry', '');
        quantityLabel.textContent = `In pantry: ${currentQty} ${newUnit}`;
      }
    }
  });

  // Search functionality
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(searchDebounce);

    if (query.length < 2) {
      // Return to category view
      loadCategoryIngredients(currentCategory || 'all');
      return;
    }

    searchDebounce = setTimeout(() => {
      const results = searchIngredients(query, 50);
      renderIngredientsGrid(results);

      // Deselect category tabs when searching
      categoryTabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    }, 200);
  });

  // Open modal function
  function openAddIngredientModal() {
    selectedIngredient = null;
    if (selectedIdInput) selectedIdInput.value = '';
    selectionPanel.style.display = 'none';
    searchInput.value = '';

    populateCategoryTabs();
    loadCategoryIngredients('all');

    openModal('addIngredientModal');
  }

  // Open modal button
  addBtn?.addEventListener('click', openAddIngredientModal);

  // Handle add buttons in other views
  document.querySelectorAll('[data-action="add-ingredient"]').forEach(btn => {
    btn.addEventListener('click', openAddIngredientModal);
  });

  // Selection panel is no longer needed - inline +/- controls handle everything
  // Keep it hidden
  if (selectionPanel) selectionPanel.style.display = 'none';
}

/**
 * Initialize export/import buttons
 */
function initExportImport() {
  const exportBtn = document.getElementById('exportPantryBtn');
  const importBtn = document.getElementById('importPantryBtn');
  const importInput = document.getElementById('importFileInput');
  const importModal = document.getElementById('importModal');
  const mergeBtn = document.getElementById('importMerge');
  const replaceBtn = document.getElementById('importReplace');

  let pendingFile = null;

  exportBtn?.addEventListener('click', () => {
    const filename = downloadPantryJson();
    console.log('Exported pantry to:', filename);
  });

  importBtn?.addEventListener('click', () => {
    importInput?.click();
  });

  importInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pendingFile = file;
    openModal('importModal');
    importInput.value = '';
  });

  mergeBtn?.addEventListener('click', async () => {
    if (pendingFile) {
      const result = await importPantryFromFile(pendingFile, 'merge');
      console.log('Import result:', result);
      pendingFile = null;
    }
    closeModal('importModal');
  });

  replaceBtn?.addEventListener('click', async () => {
    if (pendingFile) {
      const result = await importPantryFromFile(pendingFile, 'replace');
      console.log('Import result:', result);
      pendingFile = null;
    }
    closeModal('importModal');
  });

  // Handle export/import buttons in other views
  document.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const filename = downloadPantryJson();
      console.log('Exported pantry to:', filename);
    });
  });

  document.querySelectorAll('[data-action="import"]').forEach(btn => {
    btn.addEventListener('click', () => {
      importInput?.click();
    });
  });
}

// ============================================
// Recipe Functions
// ============================================

/**
 * Initialize recipe UI
 */
function initRecipeUI() {
  const recipeGrid = document.getElementById('recipeGrid');
  const searchInput = document.getElementById('recipeSearch');
  const matchFilter = document.getElementById('matchFilter');
  const difficultyFilter = document.getElementById('difficultyFilter');
  const cuisineFilter = document.getElementById('cuisineFilter');
  const quickFilter = document.getElementById('recipeQuickFilter');

  // Populate cuisine filter
  const cuisines = getUniqueCuisines(allRecipes);
  if (cuisineFilter) {
    cuisineFilter.innerHTML = '<option value="all">All Cuisines</option>';
    cuisines.forEach(cuisine => {
      const option = document.createElement('option');
      option.value = cuisine;
      option.textContent = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
      cuisineFilter.appendChild(option);
    });
  }

  // Quick filter tabs
  quickFilter?.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    const matchType = tab.dataset.match;

    // Update active state
    quickFilter.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update filter and grid
    currentFilters.matchType = matchType;
    if (matchFilter) matchFilter.value = matchType;
    updateRecipeGrid();
  });

  // Search input
  let searchTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilters.search = e.target.value;
      updateRecipeGrid();
    }, 200);
  });

  // Filter changes
  matchFilter?.addEventListener('change', (e) => {
    currentFilters.matchType = e.target.value;
    // Sync quick filter tabs
    quickFilter?.querySelectorAll('.filter-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.match === e.target.value);
    });
    updateRecipeGrid();
  });

  difficultyFilter?.addEventListener('change', (e) => {
    currentFilters.difficulty = e.target.value;
    updateRecipeGrid();
  });

  cuisineFilter?.addEventListener('change', (e) => {
    currentFilters.cuisine = e.target.value;
    updateRecipeGrid();
  });

  // Initial render
  updateRecipeGrid();
  updateRecipeStats();

  // Update recipe stats when pantry changes
  onPantryChange(() => {
    updateRecipeGrid();
    updateRecipeStats();
  });
}

/**
 * Update recipe statistics display
 */
function updateRecipeStats() {
  const matched = getMatchedRecipes(allRecipes);

  const canMakeCount = matched.filter(r => r.matchResult?.matchType === 'full').length;
  const almostCount = matched.filter(r => r.matchResult?.matchType === 'partial').length;
  const totalCount = allRecipes.length;

  const statCanMake = document.getElementById('recipeStatCanMake');
  const statAlmost = document.getElementById('recipeStatAlmost');
  const statTotal = document.getElementById('recipeStatTotal');

  if (statCanMake) statCanMake.textContent = canMakeCount;
  if (statAlmost) statAlmost.textContent = almostCount;
  if (statTotal) statTotal.textContent = totalCount;
}

/**
 * Shuffle array randomly
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Update recipe grid based on filters
 */
function updateRecipeGrid() {
  const recipeGrid = document.getElementById('recipeGrid');
  if (!recipeGrid) return;

  // Apply text/difficulty/cuisine filters
  let filtered = applyFilters(allRecipes, currentFilters);

  // Calculate match scores
  const matched = getMatchedRecipes(filtered);

  // Apply match type filter
  const final = filterByMatchType(matched, currentFilters.matchType);

  // Determine if we're in preview mode (no active filters)
  const hasActiveFilters = currentFilters.search ||
    currentFilters.difficulty !== 'all' ||
    currentFilters.cuisine !== 'all' ||
    currentFilters.matchType !== 'all';

  // Show limited recipes in preview mode, all recipes when filters active or "View All" clicked
  let recipesToShow = final;
  let showViewAllButton = false;

  if (!hasActiveFilters && !showAllRecipes && final.length > RECIPE_PREVIEW_COUNT) {
    recipesToShow = shuffleArray(final).slice(0, RECIPE_PREVIEW_COUNT);
    showViewAllButton = true;
  }

  // Render recipes
  renderRecipeGrid(recipesToShow, recipeGrid, handleRecipeClick);

  // Update result count
  const resultCount = document.getElementById('recipeResultCount');
  if (resultCount) {
    resultCount.textContent = final.length;
  }

  // Add or remove "View All" button
  updateViewAllButton(showViewAllButton, final.length);
}

/**
 * Update View All button visibility
 */
function updateViewAllButton(show, totalCount) {
  let viewAllContainer = document.getElementById('viewAllContainer');

  if (show) {
    if (!viewAllContainer) {
      viewAllContainer = document.createElement('div');
      viewAllContainer.id = 'viewAllContainer';
      viewAllContainer.className = 'text-center mt-xl';
      viewAllContainer.innerHTML = `
        <button class="btn btn--secondary" id="viewAllRecipesBtn">
          View All ${totalCount} Recipes
        </button>
      `;
      const recipeGrid = document.getElementById('recipeGrid');
      recipeGrid?.parentNode?.insertBefore(viewAllContainer, recipeGrid.nextSibling);

      document.getElementById('viewAllRecipesBtn')?.addEventListener('click', () => {
        showAllRecipes = true;
        updateRecipeGrid();
      });
    } else {
      const btn = viewAllContainer.querySelector('.btn');
      if (btn) btn.textContent = `View All ${totalCount} Recipes`;
      viewAllContainer.style.display = 'block';
    }
  } else if (viewAllContainer) {
    viewAllContainer.style.display = 'none';
  }
}

/**
 * Handle recipe card click
 */
function handleRecipeClick(recipe) {
  const detailContainer = document.getElementById('recipeDetail');
  const pantryIds = getPantryIngredientIds();

  renderRecipeDetail(recipe, detailContainer, pantryIds);
  openModal('recipeModal');
}

// ============================================
// Meal Planner Functions
// ============================================

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

/**
 * Initialize meal planner UI
 */
function initMealPlannerUI() {
  const calendarContainer = document.getElementById('calendarWeek');
  const weekTitle = document.getElementById('weekTitle');
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const todayBtn = document.getElementById('todayBtn');
  const generateShoppingListBtn = document.getElementById('generateShoppingListBtn');
  const clearWeekBtn = document.getElementById('clearWeekBtn');
  const bannerShoppingBtn = document.getElementById('bannerShoppingBtn');
  const shoppingBannerText = document.getElementById('shoppingBannerText');

  // Track selected day for daily macro display
  let selectedDay = formatDate(new Date());

  // Update macro value with color coding
  function updateMacroValue(valueEl, goalEl, value, goal, goalType, unit) {
    if (valueEl) {
      const displayValue = unit === '' ? Math.round(value).toLocaleString() : `${Math.round(value)}${unit}`;
      valueEl.textContent = displayValue;

      // Calculate percentage and apply color
      const percent = goal > 0 ? (value / goal) * 100 : 0;
      valueEl.classList.remove('macro-overview__value--over', 'macro-overview__value--near', 'macro-overview__value--good');

      if (goalType === 'limit') {
        if (percent > 100) valueEl.classList.add('macro-overview__value--over');
        else if (percent >= 80) valueEl.classList.add('macro-overview__value--near');
        else valueEl.classList.add('macro-overview__value--good');
      } else {
        if (percent >= 100) valueEl.classList.add('macro-overview__value--good');
        else if (percent >= 80) valueEl.classList.add('macro-overview__value--near');
        else valueEl.classList.add('macro-overview__value--over');
      }
    }

    if (goalEl) {
      const displayGoal = unit === '' ? goal.toLocaleString() : `${goal}${unit}`;
      goalEl.textContent = `/ ${displayGoal}`;
    }
  }

  // Update both weekly and daily macro overviews (planned + actual)
  function updateMacroOverview() {
    const trackingSection = document.getElementById('macroTrackingSection');
    const actualSection = document.getElementById('actualMacroSection');
    if (!trackingSection) return;

    // Hide if tracking is disabled
    if (!isTrackingEnabled()) {
      trackingSection.style.display = 'none';
      return;
    }
    trackingSection.style.display = 'flex';

    const weekData = calculateWeekNutrition(currentWeekStart);
    const actualWeekData = calculateWeekActualNutrition(currentWeekStart);
    const goals = getAllDailyGoals();

    const macros = [
      { key: 'calories', unit: '' },
      { key: 'protein', unit: 'g' },
      { key: 'carbs', unit: 'g' },
      { key: 'fat', unit: 'g' },
      { key: 'fiber', unit: 'g' }
    ];

    // Update WEEKLY PLANNED totals
    macros.forEach(({ key, unit }) => {
      const id = key.charAt(0).toUpperCase() + key.slice(1);
      const valueEl = document.getElementById(`weekly${id}`);
      const goalEl = document.getElementById(`weekly${id}Goal`);
      const weeklyGoal = (goals[key]?.target || 0) * 7;
      const goalType = goals[key]?.type || 'limit';

      updateMacroValue(valueEl, goalEl, weekData.total[key], weeklyGoal, goalType, unit);
    });

    // Update WEEKLY ACTUAL totals
    macros.forEach(({ key, unit }) => {
      const id = key.charAt(0).toUpperCase() + key.slice(1);
      const valueEl = document.getElementById(`weeklyActual${id}`);
      const goalEl = document.getElementById(`weeklyActual${id}Goal`);
      const weeklyGoal = (goals[key]?.target || 0) * 7;
      const goalType = goals[key]?.type || 'limit';

      updateMacroValue(valueEl, goalEl, actualWeekData.total[key], weeklyGoal, goalType, unit);
    });

    // Show/hide actual section based on whether there's eaten data
    if (actualSection) {
      const hasActualData = actualWeekData.daysWithMeals > 0;
      actualSection.style.display = hasActualData ? 'block' : 'none';
    }

    // Update DAILY views for selected day
    updateDailyMacroDisplay();
  }

  // Update daily macro display for selected day (planned + actual)
  function updateDailyMacroDisplay() {
    const goals = getAllDailyGoals();
    const weekData = calculateWeekNutrition(currentWeekStart);
    const dayData = weekData.days[selectedDay];
    const actualDayData = calculateActualDayNutrition(selectedDay);

    const macros = [
      { key: 'calories', unit: '' },
      { key: 'protein', unit: 'g' },
      { key: 'carbs', unit: 'g' },
      { key: 'fat', unit: 'g' },
      { key: 'fiber', unit: 'g' }
    ];

    // Update titles with selected day name
    const date = new Date(selectedDay + 'T00:00:00');
    const isToday = selectedDay === formatDate(new Date());
    const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });

    const titleEl = document.getElementById('dailyMacroTitle');
    if (titleEl) {
      titleEl.textContent = dayName;
    }

    const actualTitleEl = document.getElementById('dailyActualTitle');
    if (actualTitleEl) {
      actualTitleEl.textContent = dayName;
    }

    // Update DAILY PLANNED
    macros.forEach(({ key, unit }) => {
      const id = key.charAt(0).toUpperCase() + key.slice(1);
      const valueEl = document.getElementById(`daily${id}`);
      const goalEl = document.getElementById(`daily${id}Goal`);
      const dailyGoal = goals[key]?.target || 0;
      const goalType = goals[key]?.type || 'limit';
      const consumed = dayData?.total?.[key] || 0;

      updateMacroValue(valueEl, goalEl, consumed, dailyGoal, goalType, unit);
    });

    // Update DAILY ACTUAL
    macros.forEach(({ key, unit }) => {
      const id = key.charAt(0).toUpperCase() + key.slice(1);
      const valueEl = document.getElementById(`dailyActual${id}`);
      const goalEl = document.getElementById(`dailyActual${id}Goal`);
      const dailyGoal = goals[key]?.target || 0;
      const goalType = goals[key]?.type || 'limit';
      const consumed = actualDayData?.total?.[key] || 0;

      updateMacroValue(valueEl, goalEl, consumed, dailyGoal, goalType, unit);
    });

    // Update selected state on day cards
    document.querySelectorAll('.day-card').forEach(card => {
      card.classList.toggle('day-card--selected', card.dataset.date === selectedDay);
    });
  }

  // Handle day card click for selecting a day
  function setupDayCardSelection() {
    const calendarContainer = document.getElementById('calendarWeek');
    if (!calendarContainer) return;

    calendarContainer.addEventListener('click', (e) => {
      const dayCard = e.target.closest('.day-card');
      if (dayCard && dayCard.dataset.date) {
        // Don't interfere with add button or meal card clicks
        if (e.target.closest('.day-card__add-btn') || e.target.closest('.meal-card')) return;

        selectedDay = dayCard.dataset.date;
        updateDailyMacroDisplay();
      }
    });
  }

  // Render initial calendar
  function renderCalendar() {
    if (weekTitle) weekTitle.textContent = formatWeekTitle(currentWeekStart);
    if (calendarContainer) {
      renderWeekView(calendarContainer, currentWeekStart, {
        onAddClick: (dateStr, mealType) => openRecipeBrowserModal(dateStr, mealType),
        onMealClick: (meal, recipe) => openMealDetailModal(meal, recipe),
        onRemoveClick: (mealId) => removeMeal(mealId)
      });
    }
    updateMealPlanStats();
    updateShoppingBanner();
    updateMacroOverview();
  }

  // Update shopping banner text
  function updateShoppingBanner() {
    const stats = getMealPlanStats(currentWeekStart);
    const mealsPlanned = stats.totalMeals || 0;
    const needShopping = stats.needShopping || 0;

    if (mealsPlanned === 0) {
      if (shoppingBannerText) shoppingBannerText.textContent = 'Add meals to your plan to see missing ingredients.';
    } else if (needShopping > 0) {
      if (shoppingBannerText) shoppingBannerText.textContent = `You have ${needShopping} meal${needShopping > 1 ? 's' : ''} that need${needShopping === 1 ? 's' : ''} ingredients from the store.`;
    } else {
      if (shoppingBannerText) shoppingBannerText.textContent = 'Great! You have all ingredients for your planned meals.';
    }
  }

  // Week navigation
  prevWeekBtn?.addEventListener('click', () => {
    currentWeekStart = navigateWeek(currentWeekStart, -1);
    selectedDay = formatDate(currentWeekStart); // Select Monday of new week
    renderCalendar();
  });

  nextWeekBtn?.addEventListener('click', () => {
    currentWeekStart = navigateWeek(currentWeekStart, 1);
    selectedDay = formatDate(currentWeekStart); // Select Monday of new week
    renderCalendar();
  });

  todayBtn?.addEventListener('click', () => {
    currentWeekStart = goToCurrentWeek();
    selectedDay = formatDate(new Date()); // Select today
    renderCalendar();
  });

  // Clear week button
  clearWeekBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all meals for this week?')) {
      const removed = clearWeek(currentWeekStart);
      console.log(`Cleared ${removed} meals`);
      renderCalendar();
    }
  });

  // Shopping list buttons
  generateShoppingListBtn?.addEventListener('click', () => {
    openShoppingListModal();
  });

  bannerShoppingBtn?.addEventListener('click', () => {
    openShoppingListModal();
  });

  // Initialize add meal modal
  initAddMealModal((date, meal) => {
    renderCalendar();
  });

  // Initialize recipe browser modal
  initRecipeBrowserModal((date, meal) => {
    renderCalendar();
  });

  // Initialize quantity modal
  initQuantityModal();

  // Listen for pantry updates
  document.addEventListener('pantryUpdated', () => {
    updateRecipeGrid();
    renderCalendar();
  });

  // Listen for meal plan changes
  onMealPlanChange(() => {
    renderCalendar();
    // Refresh shopping list if view is active
    const shoppingView = document.getElementById('view-shoppinglist');
    if (shoppingView?.classList.contains('active')) {
      renderShoppingListView();
    }
  });

  // Listen for pantry changes
  onPantryChange(() => {
    renderCalendar();
    // Refresh shopping list if view is active
    const shoppingView = document.getElementById('view-shoppinglist');
    if (shoppingView?.classList.contains('active')) {
      renderShoppingListView();
      renderLowStockSuggestions();
    }
  });

  // Set up callback for "Add to Meal Plan" button
  setAddToMealPlanCallback((recipe, servings) => {
    closeModal('recipeModal');
    const today = formatDate(new Date());
    openAddMealModal(today, recipe, servings);
  });

  // Initial render
  renderCalendar();

  // Setup day card click selection for daily macro view
  setupDayCardSelection();

  // Initialize sidebar recipe list
  initSidebarRecipeList();
}

/**
 * Initialize sidebar recipe list for quick adding
 */
function initSidebarRecipeList() {
  const searchInput = document.getElementById('sidebarRecipeSearch');
  const recipeList = document.getElementById('sidebarRecipeList');

  if (!recipeList) return;

  function renderSidebarRecipes(searchTerm = '') {
    const matched = getMatchedRecipes(allRecipes);
    let recipes = matched.filter(r => r.matchResult && r.matchResult.requiredPercent > 0);

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      recipes = recipes.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.cuisine?.toLowerCase().includes(term)
      );
    }

    // Take top 10
    recipes = recipes.slice(0, 10);

    if (recipes.length === 0) {
      recipeList.innerHTML = `
        <div class="text-center text-light" style="padding: var(--spacing-xl);">
          No matching recipes found
        </div>
      `;
      return;
    }

    recipeList.innerHTML = recipes.map(recipe => {
      const percent = recipe.matchResult?.requiredPercent || 0;
      const matchType = recipe.matchResult?.matchType || 'none';
      let matchClass = 'recipe-sidebar__match--none';
      if (matchType === 'full') matchClass = 'recipe-sidebar__match--full';
      else if (matchType === 'partial') matchClass = 'recipe-sidebar__match--partial';
      else if (matchType === 'minimal') matchClass = 'recipe-sidebar__match--minimal';

      return `
        <div class="recipe-sidebar__item" data-recipe-id="${recipe.id}" draggable="true">
          <h4>${escapeHtml(recipe.title)}</h4>
          <div class="recipe-sidebar__meta">
            <span>${recipe.cookTime || '30'} min</span>
            <span class="recipe-sidebar__match ${matchClass}">${percent}% ingredients</span>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    recipeList.querySelectorAll('.recipe-sidebar__item').forEach(item => {
      item.addEventListener('click', () => {
        const recipeId = item.dataset.recipeId;
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
          const today = formatDate(new Date());
          openRecipeBrowserModal(today);
        }
      });
    });
  }

  // Search handler
  let searchTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderSidebarRecipes(e.target.value);
    }, 200);
  });

  // Initial render
  renderSidebarRecipes();

  // Update when pantry changes
  onPantryChange(() => {
    renderSidebarRecipes(searchInput?.value || '');
  });
}

/**
 * Update meal plan stats display
 */
function updateMealPlanStats() {
  const stats = getMealPlanStats(currentWeekStart);
  const canMake = document.getElementById('statCanMake');
  const needShopping = document.getElementById('statNeedShopping');

  if (canMake) canMake.textContent = stats.canMake;
  if (needShopping) needShopping.textContent = stats.needShopping;
}

/**
 * Format leftover source date for display
 */
function formatLeftoverSourceDate(dateStr) {
  const date = parseDate(dateStr);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
}

/**
 * Open meal detail modal
 */
function openMealDetailModal(meal, recipe) {
  const container = document.getElementById('mealDetailContent');
  if (!container) return;

  const pantryIds = getPantryIngredientIds();
  const mealDate = getMealDate(meal.id);
  const mealStatus = meal.status || MEAL_STATUS.PLANNED;
  const isEaten = mealStatus === MEAL_STATUS.EATEN;
  const isDismissed = mealStatus === MEAL_STATUS.DISMISSED;
  const isPlanned = mealStatus === MEAL_STATUS.PLANNED;

  const mealTypeIcons = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🍪'
  };

  const mealTypeNames = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
  };

  const scaledIngredients = recipe.ingredients.map(ing => {
    const scaled = (ing.quantity * meal.servings) / recipe.servings;
    const hasIngredient = pantryIds.has(ing.ingredientId);
    const ingredient = getIngredientById(ing.ingredientId);
    return {
      ...ing,
      name: ingredient?.name || ing.ingredientId,
      scaledQty: scaled,
      hasIngredient
    };
  });

  // Build status badge HTML
  let statusBadgeHtml = '';
  if (isEaten) {
    const consumedAt = meal.consumedAt ? new Date(meal.consumedAt).toLocaleDateString() : '';
    statusBadgeHtml = `
      <div class="meal-status-badge meal-status-badge--eaten">
        ✓ Eaten${meal.consumedServings ? ` (${meal.consumedServings} serving${meal.consumedServings !== 1 ? 's' : ''})` : ''}
        ${consumedAt ? `<span class="meal-status-badge__date">on ${consumedAt}</span>` : ''}
      </div>
    `;
  } else if (isDismissed) {
    statusBadgeHtml = `
      <div class="meal-status-badge meal-status-badge--dismissed">
        ✗ Dismissed${meal.movedTo ? ` → Moved to ${new Date(meal.movedTo).toLocaleDateString()}` : ''}
      </div>
    `;
  }

  // Build consumption tracking section (only for planned meals)
  let consumptionTrackingHtml = '';
  if (isPlanned) {
    consumptionTrackingHtml = `
      <div class="consumption-tracking">
        <h4 style="font-weight: 700; margin-bottom: var(--spacing-md);">Track This Meal</h4>
        <p style="color: var(--text-body); font-size: var(--font-size-sm); margin-bottom: var(--spacing-md);">How many servings did you eat?</p>
        <div class="servings-stepper">
          <button class="servings-stepper__btn" id="decreaseServings">−</button>
          <span class="servings-stepper__value" id="servingsValue">${meal.servings}</span>
          <button class="servings-stepper__btn" id="increaseServings">+</button>
        </div>
        <button class="btn btn--primary" id="markEatenBtn" style="width: 100%; margin-top: var(--spacing-md);">
          ✓ Mark as Eaten
        </button>
        <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
          <button class="btn btn--secondary" id="moveMealBtn" style="flex: 1;">
            📅 Move to Another Day
          </button>
          <button class="btn btn--secondary" id="dismissMealBtn" style="flex: 1; color: var(--text-light);">
            ✗ Dismiss
          </button>
        </div>
        <div class="move-meal-picker" id="moveMealPicker">
          <label class="move-meal-picker__label">Select new date:</label>
          <input type="date" class="move-meal-picker__input" id="moveDateInput" min="${formatDate(new Date())}">
          <div class="move-meal-picker__actions">
            <button class="btn btn--primary btn--small" id="confirmMoveBtn">Move Meal</button>
            <button class="btn btn--secondary btn--small" id="cancelMoveBtn">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  // Build undo section (for eaten/dismissed meals)
  let undoSectionHtml = '';
  if (isEaten || isDismissed) {
    undoSectionHtml = `
      <div class="undo-section" style="margin-top: var(--spacing-lg);">
        <button class="btn btn--secondary" id="undoStatusBtn" style="width: 100%;">
          ↩ Undo - Return to Planned
        </button>
      </div>
    `;
  }

  // Build leftover section HTML (only for planned, non-leftover meals)
  let leftoverSectionHtml = '';
  if (meal.isLeftover && meal.sourceDate) {
    leftoverSectionHtml = `
      <div class="leftover-badge" style="margin-bottom: var(--spacing-lg);">
        🍲 Leftovers from ${formatLeftoverSourceDate(meal.sourceDate)}
      </div>
    `;
  } else if (isPlanned) {
    leftoverSectionHtml = `
      <div class="leftover-section">
        <button class="btn btn--secondary" id="saveAsLeftoversBtn" style="width: 100%;">
          🍲 Save as Leftovers
        </button>
        <div class="leftover-picker" id="leftoverPicker">
          <label class="leftover-picker__label">Select date for leftovers:</label>
          <input type="date" class="leftover-picker__input" id="leftoverDateInput" min="${formatDate(new Date())}">
          <div class="leftover-picker__actions">
            <button class="btn btn--primary btn--small" id="confirmLeftoverBtn">Confirm</button>
            <button class="btn btn--secondary btn--small" id="cancelLeftoverBtn">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="modal__header" style="display: flex; align-items: center; gap: var(--spacing-md); padding: 0; margin-bottom: var(--spacing-lg);">
      <span style="font-size: 32px;">${mealTypeIcons[meal.mealType] || '🍽️'}</span>
      <div>
        <h3 class="modal__title" style="margin-bottom: var(--spacing-xs);">${escapeHtml(recipe.title)}</h3>
        <p style="color: var(--text-body); font-size: var(--font-size-sm);">${mealTypeNames[meal.mealType]} | ${meal.servings} serving${meal.servings !== 1 ? 's' : ''}</p>
      </div>
    </div>
    ${statusBadgeHtml}
    ${meal.notes ? `<p style="color: var(--text-body); font-style: italic; margin-bottom: var(--spacing-lg);">${escapeHtml(meal.notes)}</p>` : ''}
    <div style="margin-bottom: var(--spacing-xl);">
      <h4 style="font-weight: 700; margin-bottom: var(--spacing-md);">Ingredients</h4>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
        ${scaledIngredients.map(ing => `
          <div style="display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-sm); background: ${ing.hasIngredient ? 'var(--accent-green-light)' : 'var(--accent-red-light)'}; border-radius: var(--radius-sm);">
            <span>${ing.hasIngredient ? '✓' : '✗'}</span>
            <span style="flex: 1;">${escapeHtml(ing.name)}</span>
            <span style="color: var(--text-body);">${ing.scaledQty.toFixed(1)} ${escapeHtml(ing.unit)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ${consumptionTrackingHtml}
    ${undoSectionHtml}
    ${leftoverSectionHtml}
    <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
      <button class="btn btn--secondary" id="viewFullRecipeBtn">View Full Recipe</button>
      ${isPlanned ? `<button class="btn btn--secondary" style="color: var(--accent-red);" id="removeMealBtn">Remove from Plan</button>` : ''}
    </div>
  `;

  // Store servings value for stepper
  let currentServings = meal.servings;

  // Event listeners for consumption tracking
  const decreaseBtn = container.querySelector('#decreaseServings');
  const increaseBtn = container.querySelector('#increaseServings');
  const servingsDisplay = container.querySelector('#servingsValue');
  const markEatenBtn = container.querySelector('#markEatenBtn');
  const dismissBtn = container.querySelector('#dismissMealBtn');
  const moveMealBtn = container.querySelector('#moveMealBtn');
  const movePicker = container.querySelector('#moveMealPicker');
  const moveDateInput = container.querySelector('#moveDateInput');
  const confirmMoveBtn = container.querySelector('#confirmMoveBtn');
  const cancelMoveBtn = container.querySelector('#cancelMoveBtn');
  const undoBtn = container.querySelector('#undoStatusBtn');

  // Servings stepper
  decreaseBtn?.addEventListener('click', () => {
    if (currentServings > 0.5) {
      currentServings = Math.max(0.5, currentServings - 0.5);
      if (servingsDisplay) servingsDisplay.textContent = currentServings;
    }
  });

  increaseBtn?.addEventListener('click', () => {
    currentServings = currentServings + 0.5;
    if (servingsDisplay) servingsDisplay.textContent = currentServings;
  });

  // Mark as eaten
  markEatenBtn?.addEventListener('click', () => {
    const result = markMealAsEaten(meal.id, currentServings);
    if (result) {
      closeModal('mealDetailModal');
      console.log(`Meal marked as eaten: ${currentServings} servings`);
    } else {
      alert('Failed to mark meal as eaten.');
    }
  });

  // Dismiss meal
  dismissBtn?.addEventListener('click', () => {
    if (confirm('Dismiss this meal? It will be removed from your nutrition tracking.')) {
      const result = dismissMeal(meal.id);
      if (result) {
        closeModal('mealDetailModal');
        console.log('Meal dismissed');
      } else {
        alert('Failed to dismiss meal.');
      }
    }
  });

  // Move meal flow
  moveMealBtn?.addEventListener('click', () => {
    movePicker?.classList.add('active');
    moveMealBtn.style.display = 'none';
    // Set default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (moveDateInput) moveDateInput.value = formatDate(tomorrow);
  });

  cancelMoveBtn?.addEventListener('click', () => {
    movePicker?.classList.remove('active');
    if (moveMealBtn) moveMealBtn.style.display = '';
  });

  confirmMoveBtn?.addEventListener('click', () => {
    const targetDate = moveDateInput?.value;
    if (!targetDate) {
      alert('Please select a date.');
      return;
    }
    const result = moveMeal(meal.id, targetDate);
    if (result) {
      closeModal('mealDetailModal');
      console.log(`Meal moved to ${targetDate}`);
    } else {
      alert('Failed to move meal.');
    }
  });

  // Undo status
  undoBtn?.addEventListener('click', () => {
    const result = undoMealStatus(meal.id);
    if (result) {
      closeModal('mealDetailModal');
      console.log('Meal status reset to planned');
    } else {
      alert('Failed to undo meal status.');
    }
  });

  // Core event listeners
  container.querySelector('#viewFullRecipeBtn')?.addEventListener('click', () => {
    closeModal('mealDetailModal');
    handleRecipeClick(recipe);
  });

  container.querySelector('#removeMealBtn')?.addEventListener('click', () => {
    removeMeal(meal.id);
    closeModal('mealDetailModal');
  });

  // Leftover flow event listeners (only for planned, non-leftover meals)
  if (isPlanned && !meal.isLeftover) {
    const saveBtn = container.querySelector('#saveAsLeftoversBtn');
    const picker = container.querySelector('#leftoverPicker');
    const dateInput = container.querySelector('#leftoverDateInput');
    const confirmBtn = container.querySelector('#confirmLeftoverBtn');
    const cancelBtn = container.querySelector('#cancelLeftoverBtn');

    saveBtn?.addEventListener('click', () => {
      picker?.classList.add('active');
      saveBtn.style.display = 'none';
      // Set default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateInput) dateInput.value = formatDate(tomorrow);
    });

    cancelBtn?.addEventListener('click', () => {
      picker?.classList.remove('active');
      if (saveBtn) saveBtn.style.display = '';
    });

    confirmBtn?.addEventListener('click', () => {
      const targetDate = dateInput?.value;
      if (!targetDate) {
        alert('Please select a date for the leftovers.');
        return;
      }

      // Create the leftover
      const leftover = createLeftover(meal, mealDate, targetDate);
      if (leftover) {
        closeModal('mealDetailModal');
        console.log(`Leftover created for ${targetDate}`);
      } else {
        alert('Failed to create leftover. Please try again.');
      }
    });
  }

  openModal('mealDetailModal');
}

/**
 * Open shopping list modal
 */
function openShoppingListModal() {
  const container = document.getElementById('shoppingListContent');
  const subtitle = document.getElementById('shoppingListSubtitle');
  const copyBtn = document.getElementById('copyShoppingList');
  const closeBtn = document.getElementById('closeShoppingList');

  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const shoppingList = getShoppingList(currentWeekStart, endDate);

  if (subtitle) subtitle.textContent = `Items needed for ${formatWeekTitle(currentWeekStart)}`;

  if (shoppingList.length === 0) {
    container.innerHTML = renderEmptyState(true);
  } else {
    container.innerHTML = renderShoppingListHtml(shoppingList, { showRecipes: false });
    setupCheckboxHandlers(container);
  }

  // Copy to clipboard
  if (copyBtn) {
    copyBtn.onclick = () => {
      const text = generatePlainTextList(shoppingList);
      navigator.clipboard.writeText(`Shopping List\n${formatWeekTitle(currentWeekStart)}\n\n${text || 'Nothing needed!'}`).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy to Clipboard';
        }, 2000);
      });
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => closeModal('shoppingListModal');
  }

  openModal('shoppingListModal');
}

// ============================================
// Shopping List View Functions
// ============================================

// Track checked items in the view (persists during session)
let checkedShoppingItems = new Set();

/**
 * Render the full-page shopping list view
 */
function renderShoppingListView() {
  const container = document.getElementById('shoppingListView');
  const emptyState = document.getElementById('shoppingEmptyState');

  if (!container) return;

  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const shoppingList = getShoppingList(currentWeekStart, endDate);

  // Update stats
  updateShoppingStats(shoppingList);

  if (shoppingList.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = renderShoppingListHtml(shoppingList, {
    showRecipes: true,
    checkedItems: checkedShoppingItems
  });

  setupCheckboxHandlers(container, checkedShoppingItems, () => {
    updateShoppingStats(shoppingList);
  });
}

/**
 * Render low stock suggestions panel
 */
function renderLowStockSuggestions() {
  const container = document.getElementById('lowStockSuggestions');
  if (!container) return;

  // Get pantry items with low quantities (less than 2 units)
  const pantryItems = getPantryItems();
  const lowStockItems = pantryItems.filter(item => {
    return item.quantity < 2;
  }).map(item => {
    const ingredient = getIngredientById(item.ingredientId);
    return {
      ...item,
      name: ingredient?.name || item.ingredientId,
      category: ingredient?.category || 'other'
    };
  }).slice(0, 10); // Limit to 10 items

  if (lowStockItems.length === 0) {
    container.innerHTML = `
      <div class="empty-suggestions">
        <p>All pantry items are well stocked!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = lowStockItems.map(item => `
    <div class="suggested-item" data-ingredient-id="${item.ingredientId}">
      <div class="suggested-item__info">
        <span class="suggested-item__name">${escapeHtml(item.name)}</span>
        <span class="suggested-item__qty">${item.quantity} ${item.unit || 'units'} left</span>
      </div>
      <button class="suggested-item__add" title="Add to shopping consideration">+</button>
    </div>
  `).join('');

  // Add click handlers for add buttons (future: could add to a separate list)
  container.querySelectorAll('.suggested-item__add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.suggested-item');
      item?.classList.add('added');
      btn.textContent = '✓';
      btn.disabled = true;
    });
  });
}

/**
 * Update shopping list stats
 */
function updateShoppingStats(shoppingList = null) {
  if (!shoppingList) {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    shoppingList = getShoppingList(currentWeekStart, endDate);
  }

  const totalEl = document.getElementById('shoppingTotalItems');
  const checkedEl = document.getElementById('shoppingCheckedItems');
  const remainingEl = document.getElementById('shoppingRemainingItems');

  const total = shoppingList.length;
  const checked = checkedShoppingItems.size;
  const remaining = Math.max(0, total - checked);

  if (totalEl) totalEl.textContent = total;
  if (checkedEl) checkedEl.textContent = checked;
  if (remainingEl) remainingEl.textContent = remaining;
}

/**
 * Initialize shopping list view event handlers
 */
function initShoppingListView() {
  const copyBtn = document.getElementById('copyShoppingListView');
  const clearCheckedBtn = document.getElementById('clearCheckedBtn');
  const refreshBtn = document.getElementById('refreshShoppingList');
  const addAllBtn = document.getElementById('addAllLowStock');

  // Copy shopping list to clipboard
  copyBtn?.addEventListener('click', () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const shoppingList = getShoppingList(currentWeekStart, endDate);

    // Filter out checked items
    const uncheckedItems = shoppingList.filter(item => {
      const key = `${item.ingredientId}-${item.shortage.toFixed(1)}`;
      return !checkedShoppingItems.has(key);
    });

    const text = uncheckedItems.map(item =>
      `- ${item.name}: ${item.shortage.toFixed(1)} ${item.unit}`
    ).join('\n');

    navigator.clipboard.writeText(`Shopping List\n${formatWeekTitle(currentWeekStart)}\n\n${text || 'Nothing needed!'}`).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    });
  });

  // Clear checked items
  clearCheckedBtn?.addEventListener('click', () => {
    checkedShoppingItems.clear();
    renderShoppingListView();
  });

  // Refresh shopping list
  refreshBtn?.addEventListener('click', () => {
    renderShoppingListView();
    renderLowStockSuggestions();
  });

  // Add all low stock items (mark as consideration)
  addAllBtn?.addEventListener('click', () => {
    const suggestedItems = document.querySelectorAll('#lowStockSuggestions .suggested-item:not(.added)');
    suggestedItems.forEach(item => {
      item.classList.add('added');
      const btn = item.querySelector('.suggested-item__add');
      if (btn) {
        btn.textContent = '✓';
        btn.disabled = true;
      }
    });
  });
}

// ============================================
// Auth Functions
// ============================================

/**
 * Initialize auth UI and state management
 */
function initAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  // Initialize auth modal
  initAuthModal(handleAuthSuccess);

  // Login button opens auth modal
  loginBtn?.addEventListener('click', () => {
    openAuthModal('login');
  });

  // Logout button
  logoutBtn?.addEventListener('click', async () => {
    profileDropdown?.classList.remove('profile-dropdown--open');
    const result = await signOut();
    if (!result.error) {
      handleAuthLogout();
    }
  });

  // Listen for auth state changes
  if (isSupabaseConfigured()) {
    onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        await handleAuthSuccess(session.user, session);
      } else if (event === 'SIGNED_OUT') {
        handleAuthLogout();
      }
    });

    checkInitialAuthState();
  }
}

/**
 * Check initial auth state on page load
 */
async function checkInitialAuthState() {
  try {
    const user = await getCurrentUser();
    if (user) {
      const profile = await getCurrentProfile();
      updateAuthUI(user, profile);
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
}

/**
 * Handle successful authentication
 */
async function handleAuthSuccess(user, session) {
  currentUser = user;

  try {
    currentProfile = await getCurrentProfile();
  } catch (error) {
    console.error('Error fetching profile:', error);
    currentProfile = null;
  }

  updateAuthUI(user, currentProfile);
  console.log('User signed in:', user.email);
}

/**
 * Handle user logout
 */
function handleAuthLogout() {
  currentUser = null;
  currentProfile = null;
  updateAuthUI(null, null);
  switchView('dashboard');
  console.log('User signed out');
}

/**
 * Update UI based on auth state
 */
function updateAuthUI(user, profile) {
  const loginBtn = document.getElementById('loginBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');

  if (user) {
    loginBtn?.classList.add('hidden');
    profileDropdown?.classList.remove('hidden');

    const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
    const avatarLetter = displayName.charAt(0).toUpperCase();

    if (profileAvatar) profileAvatar.textContent = avatarLetter;
    if (profileName) profileName.textContent = displayName;
  } else {
    loginBtn?.classList.remove('hidden');
    profileDropdown?.classList.add('hidden');
    profileDropdown?.classList.remove('profile-dropdown--open');
  }
}

// ============================================
// Main Initialization
// ============================================

/**
 * Load all data
 */
async function loadData() {
  try {
    await loadIngredients();
    initPantry();
    initMealPlan();

    const recipesData = await loadRecipes();
    allRecipes = recipesData.recipes || [];

    console.log(`Loaded ${allRecipes.length} recipes`);
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

/**
 * Main initialization
 */
async function init() {
  // Load data
  await loadData();

  // Initialize navigation
  initNavigation();

  // Initialize dashboard
  initDashboard();

  // Initialize pantry UI
  initPantryUI();
  initAddIngredientModal();
  initExportImport();

  // Initialize recipes
  initRecipeUI();

  // Initialize meal planner
  initMealPlannerUI();

  // Initialize shopping list view
  initShoppingListView();

  // Initialize auth UI
  initAuthUI();

  // Initialize cloud sync
  initSyncOrchestrator();

  // Initialize profile section
  initProfileSection();

  // Initialize nutrition tracking
  initNutritionPrefs();
  initNutritionPrefsModal(() => {
    // Refresh displays when nutrition prefs change
    renderNutritionWidget();
    // Re-render calendar to update nutrition bars
    const calendarContainer = document.getElementById('calendarWeek');
    if (calendarContainer) {
      renderWeekView(calendarContainer, currentWeekStart, {
        onAddClick: (dateStr, mealType) => openRecipeBrowserModal(dateStr, mealType),
        onMealClick: (meal, recipe) => openMealDetailModal(meal, recipe),
        onRemoveClick: (mealId) => removeMeal(mealId)
      });
    }
  });
  initNutritionWidget();

  // Listen for view changes
  onViewChange((viewId, previousView) => {
    console.log(`View changed: ${previousView} -> ${viewId}`);

    // Refresh content when switching views
    if (viewId === 'dashboard') {
      updateDashboardPreviews();
      renderNutritionWidget();
    } else if (viewId === 'recipes') {
      updateRecipeGrid();
    } else if (viewId === 'pantry') {
      updatePantryStats();
    } else if (viewId === 'shoppinglist') {
      renderShoppingListView();
      renderLowStockSuggestions();
    }
  });

  console.log('Pantry Planner initialized with new design');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('GSAP version:', gsap.version);
