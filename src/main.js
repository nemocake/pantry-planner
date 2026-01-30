import './styles/main.css';
import gsap from 'gsap';

// Import core modules
import { initNavigation, switchView, onViewChange } from './modules/navigation.js';

// Import auth modules
import { initAuthModal, openAuthModal, closeAuthModal } from './components/authModal.js';
import { getCurrentUser, getCurrentProfile, signOut, onAuthStateChange } from './services/authService.js';
import { isSupabaseConfigured } from './lib/supabase.js';

// Import profile modules
import { initProfileSection, navigateToProfile } from './components/profileSection.js';

// Import pantry modules
import { loadIngredients, getCategories, getCategoryIcon, getIngredientById, getIngredientsByCategory, searchIngredients } from './modules/ingredientManager.js';
import {
  initPantry,
  onPantryChange,
  getPantryItems,
  addPantryItem,
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

// Import recipe modules
import { loadRecipes, getRecipes, getRecipeById, applyFilters, getUniqueCuisines } from './modules/recipeManager.js';
import { getMatchedRecipes, filterByMatchType, countMakeableRecipes } from './modules/matchAlgorithm.js';
import { renderRecipeGrid, renderRecipeDetail, setAddToMealPlanCallback } from './components/recipeCard.js';

// Import meal planner modules
import {
  initMealPlan,
  onMealPlanChange,
  getMealsForWeek,
  getMealPlanStats,
  removeMeal,
  clearWeek,
  getShoppingList,
  getWeekStart,
  formatDate
} from './modules/mealPlanManager.js';
import { renderWeekView, navigateWeek, goToCurrentWeek, formatWeekTitle } from './components/calendarView.js';
import { initAddMealModal, openAddMealModal } from './components/addMealModal.js';
import { initRecipeBrowserModal, openRecipeBrowserModal } from './components/recipeBrowserModal.js';
import { initQuantityModal } from './components/quantityModal.js';

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
  const pantryCategories = document.getElementById('pantryCategories');

  // Render pantry items as cards in the grid
  function renderPantryCards() {
    const items = getPantryItems();

    if (items.length === 0) {
      browserGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">📦</div>
          <h3 class="empty-state__title">Your pantry is empty</h3>
          <p class="empty-state__text">Add ingredients to start tracking your inventory</p>
        </div>
      `;
      return;
    }

    // Sort by name
    const sorted = [...items].sort((a, b) => {
      const ingA = getIngredientById(a.ingredientId);
      const ingB = getIngredientById(b.ingredientId);
      return (ingA?.name || '').localeCompare(ingB?.name || '');
    });

    const itemCards = sorted.map(item => {
      const ingredient = getIngredientById(item.ingredientId);
      if (!ingredient) return '';

      const icon = getCategoryIcon(ingredient.category);
      const displayUnit = (item.unit === 'unit' || !item.unit) ? ingredient.defaultUnit : item.unit;
      const isLowStock = item.quantity <= 1;

      // Normalize category for CSS class
      const categoryClass = ingredient.category?.toLowerCase().replace(/[^a-z]/g, '') || 'other';

      return `
        <div class="item-card" data-ingredient-id="${item.ingredientId}">
          <div class="item-image item-image--${categoryClass}">
            <span style="font-size: 48px;">${icon}</span>
            ${isLowStock ? '<span class="item-badge low">Low</span>' : ''}
          </div>
          <div class="item-info">
            <h3>${ingredient.name}</h3>
            <div class="item-meta">
              <span>${ingredient.category}</span>
              <span>${item.quantity} ${displayUnit}</span>
            </div>
          </div>
          <div class="quantity-control">
            <button class="qty-btn" data-action="decrease">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" data-action="increase">+</button>
          </div>
        </div>
      `;
    }).join('');

    // Add "Add New Item" card at the end
    const addNewCard = `
      <div class="item-card item-card--add" id="addItemCard">
        <div class="item-image item-image--add">
          <span style="font-size: 48px;">+</span>
        </div>
        <div class="item-info">
          <h3>Add Item</h3>
          <div class="item-meta">
            <span>Click to add new ingredient</span>
          </div>
        </div>
      </div>
    `;

    browserGrid.innerHTML = itemCards + addNewCard;
  }

  // Handle grid clicks (quantity changes and add new item)
  browserGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.item-card');
    if (!card) return;

    // Handle "Add Item" card click
    if (card.classList.contains('item-card--add')) {
      openModal('addIngredientModal');
      return;
    }

    const ingredientId = card.dataset.ingredientId;
    const item = getPantryItems().find(i => i.ingredientId === ingredientId);
    if (!item) return;

    if (e.target.closest('[data-action="increase"]')) {
      addPantryItem(ingredientId, item.quantity + 1, item.unit, item.location, item.notes);
    } else if (e.target.closest('[data-action="decrease"]')) {
      if (item.quantity <= 1) {
        removePantryItem(ingredientId);
      } else {
        addPantryItem(ingredientId, item.quantity - 1, item.unit, item.location, item.notes);
      }
    }
  });

  // Handle category filter clicks
  categoryFilter?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;

    const category = btn.dataset.category;

    categoryFilter.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    filterPantryByCategory(category);
  });

  // Filter pantry items by category
  function filterPantryByCategory(category) {
    const cards = browserGrid.querySelectorAll('.item-card');
    cards.forEach(card => {
      const ingredientId = card.dataset.ingredientId;
      const ingredient = getIngredientById(ingredientId);

      if (category === 'all' || ingredient?.category === category) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Listen for global category filter events
  window.addEventListener('categoryfilter', (e) => {
    const category = e.detail.category;
    filterPantryByCategory(category);

    // Update filter tab UI
    categoryFilter?.querySelectorAll('.filter-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.category === category);
    });
  });

  // Render to Pantry view grid as well
  function renderPantryViewGrid() {
    if (!pantryGrid) return;

    const items = getPantryItems();
    if (items.length === 0) {
      pantryGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">📦</div>
          <h3 class="empty-state__title">Your pantry is empty</h3>
          <p class="empty-state__text">Add ingredients to start tracking your inventory</p>
          <button class="btn btn--primary" data-action="add-ingredient">Add First Item</button>
        </div>
      `;
      return;
    }

    const sorted = [...items].sort((a, b) => {
      const ingA = getIngredientById(a.ingredientId);
      const ingB = getIngredientById(b.ingredientId);
      return (ingA?.name || '').localeCompare(ingB?.name || '');
    });

    pantryGrid.innerHTML = sorted.map(item => {
      const ingredient = getIngredientById(item.ingredientId);
      if (!ingredient) return '';

      const icon = getCategoryIcon(ingredient.category);
      const displayUnit = (item.unit === 'unit' || !item.unit) ? ingredient.defaultUnit : item.unit;
      const isLowStock = item.quantity <= 1;
      const categoryClass = ingredient.category?.toLowerCase().replace(/[^a-z]/g, '') || 'other';

      return `
        <div class="item-card" data-ingredient-id="${item.ingredientId}">
          <div class="item-image item-image--${categoryClass}">
            <span style="font-size: 48px;">${icon}</span>
            ${isLowStock ? '<span class="item-badge low">Low</span>' : ''}
          </div>
          <div class="item-info">
            <h3>${ingredient.name}</h3>
            <div class="item-meta">
              <span>${ingredient.category}</span>
              <span>${item.quantity} ${displayUnit}</span>
            </div>
          </div>
          <div class="quantity-control">
            <button class="qty-btn" data-action="decrease">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" data-action="increase">+</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Handle pantry view grid clicks
  pantryGrid?.addEventListener('click', (e) => {
    const card = e.target.closest('.item-card');
    if (!card) return;

    // Handle add ingredient button in empty state
    if (e.target.closest('[data-action="add-ingredient"]')) {
      openModal('addIngredientModal');
      return;
    }

    const ingredientId = card.dataset.ingredientId;
    const item = getPantryItems().find(i => i.ingredientId === ingredientId);
    if (!item) return;

    if (e.target.closest('[data-action="increase"]')) {
      addPantryItem(ingredientId, item.quantity + 1, item.unit, item.location, item.notes);
    } else if (e.target.closest('[data-action="decrease"]')) {
      if (item.quantity <= 1) {
        removePantryItem(ingredientId);
      } else {
        addPantryItem(ingredientId, item.quantity - 1, item.unit, item.location, item.notes);
      }
    }
  });

  // Populate pantry categories
  function populatePantryCategories() {
    if (!pantryCategories) return;

    const categories = getCategories();
    const categoryBtns = categories.map(cat =>
      `<button class="category-btn" data-category="${cat.id}">${cat.icon || ''} ${cat.name}</button>`
    ).join('');

    pantryCategories.innerHTML = `
      <button class="category-btn category-btn--active" data-category="all">📦 All</button>
      ${categoryBtns}
    `;
  }

  // Handle pantry category filter
  pantryCategories?.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if (!btn) return;

    const category = btn.dataset.category;
    pantryCategories.querySelectorAll('.category-btn').forEach(b => {
      b.classList.remove('category-btn--active');
    });
    btn.classList.add('category-btn--active');

    // Filter pantry grid
    const cards = pantryGrid?.querySelectorAll('.item-card') || [];
    cards.forEach(card => {
      const ingredientId = card.dataset.ingredientId;
      const ingredient = getIngredientById(ingredientId);
      if (category === 'all' || ingredient?.category === category) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });

  // Initialize categories
  populatePantryCategories();

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

  // Populate category tabs
  function populateCategoryTabs() {
    const categories = getCategories();
    categoryTabsContainer.innerHTML = `
      <button class="category-tab active" data-category="all">
        <span class="category-tab__icon">📦</span>
        <span class="category-tab__name">All</span>
      </button>
      ${categories.map(cat => `
        <button class="category-tab" data-category="${cat.id}">
          <span class="category-tab__icon">${cat.icon || '📁'}</span>
          <span class="category-tab__name">${cat.name}</span>
        </button>
      `).join('')}
    `;
  }

  // Render ingredients grid
  function renderIngredientsGrid(ingredients) {
    const pantryIds = getPantryIngredientIds();

    if (ingredients.length === 0) {
      ingredientGrid.innerHTML = `
        <div class="ingredient-browser__empty" style="width: 100%;">
          <p>No ingredients found</p>
        </div>
      `;
      return;
    }

    ingredientGrid.innerHTML = ingredients.map(ing => {
      const inPantry = pantryIds.has(ing.id);
      const pantryItem = inPantry ? getPantryItems().find(p => p.ingredientId === ing.id) : null;

      return `
        <div class="ingredient-tile ${inPantry ? 'in-pantry' : ''} ${selectedIngredient?.id === ing.id ? 'selected' : ''}"
             data-ingredient-id="${ing.id}">
          <span class="ingredient-tile__name">${escapeHtml(ing.name)}</span>
          ${pantryItem ? `<span class="ingredient-tile__qty">${pantryItem.quantity} ${pantryItem.unit || ''}</span>` : ''}
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

  // Handle ingredient tile click
  ingredientGrid?.addEventListener('click', (e) => {
    const tile = e.target.closest('.ingredient-tile');
    if (!tile) return;

    const ingredientId = tile.dataset.ingredientId;
    const ingredient = getIngredientById(ingredientId);
    if (!ingredient) return;

    // Update selection
    selectedIngredient = ingredient;
    if (selectedIdInput) selectedIdInput.value = ingredient.id;

    // Update tile visual
    ingredientGrid.querySelectorAll('.ingredient-tile').forEach(t => t.classList.remove('selected'));
    tile.classList.add('selected');

    // Show selection panel
    selectionPanel.style.display = 'flex';
    selectionName.textContent = ingredient.name;

    // Set default unit
    const unitSelect = document.getElementById('ingredientUnit');
    if (ingredient.defaultUnit && unitSelect) {
      unitSelect.value = ingredient.defaultUnit;
    }

    // Reset quantity
    document.getElementById('ingredientQuantity').value = 1;
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

  // Submit button click
  submitBtn?.addEventListener('click', () => {
    if (!selectedIngredient) return;

    const quantity = parseFloat(document.getElementById('ingredientQuantity')?.value) || 1;
    const unit = document.getElementById('ingredientUnit')?.value || 'pieces';

    addPantryItem(selectedIngredient.id, quantity, unit, 'pantry', '');

    // Visual feedback - update the tile
    const tile = ingredientGrid.querySelector(`[data-ingredient-id="${selectedIngredient.id}"]`);
    if (tile) {
      tile.classList.add('in-pantry');
      tile.classList.remove('selected');

      // Add/update quantity display
      let qtyEl = tile.querySelector('.ingredient-tile__qty');
      if (!qtyEl) {
        qtyEl = document.createElement('span');
        qtyEl.className = 'ingredient-tile__qty';
        tile.appendChild(qtyEl);
      }
      qtyEl.textContent = `${quantity} ${unit}`;
    }

    // Reset selection but keep modal open for adding more
    selectedIngredient = null;
    selectionPanel.style.display = 'none';
    if (selectedIdInput) selectedIdInput.value = '';
  });
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
    renderCalendar();
  });

  nextWeekBtn?.addEventListener('click', () => {
    currentWeekStart = navigateWeek(currentWeekStart, 1);
    renderCalendar();
  });

  todayBtn?.addEventListener('click', () => {
    currentWeekStart = goToCurrentWeek();
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
    let recipes = matched.filter(r => r.matchScore > 0);

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

    recipeList.innerHTML = recipes.map(recipe => `
      <div class="recipe-sidebar__item" data-recipe-id="${recipe.id}" draggable="true">
        <h4>${escapeHtml(recipe.title)}</h4>
        <span>${recipe.cookTime || '30 min'} | ${Math.round(recipe.matchScore * 100)}% match</span>
      </div>
    `).join('');

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
 * Open meal detail modal
 */
function openMealDetailModal(meal, recipe) {
  const container = document.getElementById('mealDetailContent');
  if (!container) return;

  const pantryIds = getPantryIngredientIds();

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

  container.innerHTML = `
    <div class="modal__header" style="display: flex; align-items: center; gap: var(--spacing-md); padding: 0; margin-bottom: var(--spacing-lg);">
      <span style="font-size: 32px;">${mealTypeIcons[meal.mealType] || '🍽️'}</span>
      <div>
        <h3 class="modal__title" style="margin-bottom: var(--spacing-xs);">${escapeHtml(recipe.title)}</h3>
        <p style="color: var(--text-body); font-size: var(--font-size-sm);">${mealTypeNames[meal.mealType]} | ${meal.servings} servings</p>
      </div>
    </div>
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
    <div style="display: flex; gap: var(--spacing-md);">
      <button class="btn btn--secondary" id="viewFullRecipeBtn">View Full Recipe</button>
      <button class="btn btn--secondary" style="color: var(--accent-red);" id="removeMealBtn">Remove from Plan</button>
    </div>
  `;

  container.querySelector('#viewFullRecipeBtn')?.addEventListener('click', () => {
    closeModal('mealDetailModal');
    handleRecipeClick(recipe);
  });

  container.querySelector('#removeMealBtn')?.addEventListener('click', () => {
    removeMeal(meal.id);
    closeModal('mealDetailModal');
  });

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
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🎉</div>
        <h3 class="empty-state__title">You have everything you need!</h3>
        <p class="empty-state__text">All planned meals can be made with your pantry.</p>
      </div>
    `;
  } else {
    const byCategory = {};
    shoppingList.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    });

    const categoryIcons = {
      proteins: '🥩',
      dairy: '🧀',
      grains: '🌾',
      vegetables: '🥬',
      fruits: '🍎',
      pantry_staples: '🫙',
      herbs_spices: '🌿',
      other: '📦'
    };

    container.innerHTML = Object.entries(byCategory).map(([category, items]) => `
      <div class="shopping-category">
        <div class="category-header">
          <span>${categoryIcons[category] || '📦'}</span>
          <span class="category-name">${escapeHtml(category.replace('_', ' '))}</span>
          <span class="category-count">${items.length}</span>
        </div>
        <div class="shopping-list-items">
          ${items.map(item => `
            <div class="list-item">
              <div class="checkbox-wrapper">
                <div class="custom-checkbox"></div>
              </div>
              <div class="item-details">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-qty">${item.shortage.toFixed(1)} ${escapeHtml(item.unit)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Add checkbox toggle
    container.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('checked');
      });
    });
  }

  // Copy to clipboard
  if (copyBtn) {
    copyBtn.onclick = () => {
      const text = shoppingList.map(item =>
        `- ${item.name}: ${item.shortage.toFixed(1)} ${item.unit}`
      ).join('\n');

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

  // Group by category
  const byCategory = {};
  shoppingList.forEach(item => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  });

  const categoryIcons = {
    proteins: '🥩',
    dairy: '🧀',
    grains: '🌾',
    vegetables: '🥬',
    fruits: '🍎',
    pantry_staples: '🫙',
    herbs_spices: '🌿',
    other: '📦'
  };

  container.innerHTML = Object.entries(byCategory).map(([category, items]) => `
    <div class="shopping-category">
      <div class="category-header">
        <span>${categoryIcons[category] || '📦'}</span>
        <span class="category-name">${escapeHtml(category.replace('_', ' '))}</span>
        <span class="category-count">${items.length}</span>
      </div>
      <div class="shopping-list-items">
        ${items.map(item => {
          const itemKey = `${item.ingredientId}-${item.shortage.toFixed(1)}`;
          const isChecked = checkedShoppingItems.has(itemKey);
          return `
            <div class="list-item${isChecked ? ' checked' : ''}" data-item-key="${itemKey}">
              <div class="checkbox-wrapper">
                <div class="custom-checkbox${isChecked ? ' checked' : ''}"></div>
              </div>
              <div class="item-details">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-qty">${item.shortage.toFixed(1)} ${escapeHtml(item.unit)}</span>
              </div>
              <div class="item-recipes" title="For: ${item.recipes.join(', ')}">
                ${item.recipes.slice(0, 2).map(r => `<span class="recipe-tag">${escapeHtml(r)}</span>`).join('')}
                ${item.recipes.length > 2 ? `<span class="recipe-tag">+${item.recipes.length - 2}</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Add click handlers for checkboxes
  container.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const key = item.dataset.itemKey;
      const checkbox = item.querySelector('.custom-checkbox');

      if (checkedShoppingItems.has(key)) {
        checkedShoppingItems.delete(key);
        item.classList.remove('checked');
        checkbox?.classList.remove('checked');
      } else {
        checkedShoppingItems.add(key);
        item.classList.add('checked');
        checkbox?.classList.add('checked');
      }

      updateShoppingStats(shoppingList);
    });
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

  // Initialize profile section
  initProfileSection();

  // Listen for view changes
  onViewChange((viewId, previousView) => {
    console.log(`View changed: ${previousView} -> ${viewId}`);

    // Refresh content when switching views
    if (viewId === 'recipes') {
      updateRecipeGrid();
    } else if (viewId === 'dashboard' || viewId === 'pantry') {
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
