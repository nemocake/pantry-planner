import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Import core modules
import { initAllParallax, refreshParallax } from './modules/parallax.js';
import { initNavigation, initHeaderScroll } from './modules/navigation.js';
import { initLottieScroll, createScrollIndicatorFallback } from './modules/lottieScroll.js';

// Import pantry modules
import { loadIngredients, getCategories, getCategoryIcon, getIngredientById } from './modules/ingredientManager.js';
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

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

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

/**
 * Initialize section entry animations
 */
function initSectionAnimations() {
  const sections = document.querySelectorAll('.section');

  sections.forEach(section => {
    const content = section.querySelector('.section__content');
    const title = section.querySelector('.section__title');
    const text = section.querySelectorAll('.section__subtitle, .section__text');

    // Create timeline for each section
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'top 20%',
        toggleActions: 'play none none reverse'
      }
    });

    // Animate title
    if (title) {
      tl.from(title, {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    }

    // Animate text elements
    if (text.length > 0) {
      tl.from(text, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out'
      }, '-=0.5');
    }
  });
}

/**
 * Initialize card animations for a container
 */
function initCardAnimations(containerSelector, cardSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const cards = container.querySelectorAll(cardSelector);

  cards.forEach((card, index) => {
    gsap.from(card, {
      y: 60,
      opacity: 0,
      duration: 0.5,
      delay: index * 0.05,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 90%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

/**
 * Initialize stats counter animation
 */
function initStatsAnimation() {
  const stats = document.querySelectorAll('.stat');

  stats.forEach((stat, index) => {
    gsap.from(stat, {
      y: 50,
      opacity: 0,
      duration: 0.6,
      delay: index * 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: stat,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

/**
 * Initialize intro animation on page load
 */
function initIntroAnimation() {
  const tl = gsap.timeline();

  // Hide everything initially
  gsap.set('.header', { y: -100, opacity: 0 });
  gsap.set('.section--home .section__content', { y: 100, opacity: 0 });
  gsap.set('.section--home .layer', { scale: 1.1, opacity: 0 });

  // Animate in
  tl.to('.section--home .layer--back', {
    scale: 1,
    opacity: 1,
    duration: 1.5,
    ease: 'power2.out'
  })
  .to('.section--home .layer--mid', {
    scale: 1,
    opacity: 0.7,
    duration: 1.2,
    ease: 'power2.out'
  }, '-=1')
  .to('.section--home .layer--front', {
    scale: 1,
    opacity: 0.9,
    duration: 1,
    ease: 'power2.out'
  }, '-=0.8')
  .to('.header', {
    y: 0,
    opacity: 1,
    duration: 0.8,
    ease: 'power2.out'
  }, '-=0.5')
  .to('.section--home .section__content', {
    y: 0,
    opacity: 1,
    duration: 1,
    ease: 'power3.out'
  }, '-=0.5');

  return tl;
}

/**
 * Add scroll indicator fallback styles
 */
function addFallbackStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .scroll-indicator--fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .scroll-indicator__mouse {
      width: 25px;
      height: 40px;
      border: 2px solid rgba(255, 255, 255, 0.7);
      border-radius: 15px;
      position: relative;
    }
    .scroll-indicator__wheel {
      width: 4px;
      height: 8px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 2px;
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      animation: scrollWheel 1.5s ease-in-out infinite;
    }
    @keyframes scrollWheel {
      0%, 100% { opacity: 1; transform: translateX(-50%) translateY(0); }
      50% { opacity: 0.3; transform: translateX(-50%) translateY(10px); }
    }
    .scroll-indicator__arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .scroll-indicator__arrow span {
      display: block;
      width: 10px;
      height: 10px;
      border-right: 2px solid rgba(255, 255, 255, 0.5);
      border-bottom: 2px solid rgba(255, 255, 255, 0.5);
      transform: rotate(45deg);
      margin: -5px;
      animation: scrollArrow 1.5s ease-in-out infinite;
    }
    .scroll-indicator__arrow span:nth-child(2) {
      animation-delay: 0.15s;
    }
    @keyframes scrollArrow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// Pantry Functions
// ============================================

/**
 * Initialize pantry UI
 */
function initPantryUI() {
  const categoryFilter = document.getElementById('categoryFilter');
  const ingredientBrowser = document.getElementById('ingredientBrowser');
  const browserGrid = document.getElementById('browserGrid');
  const browserTitle = document.getElementById('browserTitle');
  const closeBrowserBtn = document.getElementById('closeBrowser');

  // Dropdown elements (center top)
  const pantryDropdown = document.getElementById('pantryDropdown');
  const dropdownToggle = document.getElementById('togglePantryDropdown');
  const dropdownCount = document.getElementById('sidepanelCount');
  const pantryList = document.getElementById('pantryList');
  const dropdownEmpty = document.getElementById('sidepanelEmpty');

  let currentBrowserCategory = null;

  // Render dropdown pantry list
  function renderDropdownList() {
    const items = getPantryItems();

    // Update count
    dropdownCount.textContent = items.length;

    // Show/hide empty state
    if (items.length === 0) {
      pantryList.style.display = 'none';
      dropdownEmpty.style.display = 'block';
      return;
    }

    pantryList.style.display = 'block';
    dropdownEmpty.style.display = 'none';

    // Sort by name
    const sorted = [...items].sort((a, b) => {
      const ingA = getIngredientById(a.ingredientId);
      const ingB = getIngredientById(b.ingredientId);
      return (ingA?.name || '').localeCompare(ingB?.name || '');
    });

    pantryList.innerHTML = sorted.map(item => {
      const ingredient = getIngredientById(item.ingredientId);
      if (!ingredient) return '';

      const icon = getCategoryIcon(ingredient.category);
      // Use ingredient's default unit if stored unit is generic "unit"
      const displayUnit = (item.unit === 'unit' || !item.unit) ? ingredient.defaultUnit : item.unit;
      const qtyDisplay = `${item.quantity} ${displayUnit}`;

      return `
        <div class="dropdown-item" data-ingredient-id="${item.ingredientId}">
          <span class="dropdown-item__icon">${icon}</span>
          <div class="dropdown-item__info">
            <div class="dropdown-item__name">${ingredient.name}</div>
            <div class="dropdown-item__qty">${qtyDisplay}</div>
          </div>
          <button class="dropdown-item__remove" data-action="remove" title="Remove">×</button>
        </div>
      `;
    }).join('');
  }

  // Handle dropdown item removal
  pantryList.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-action="remove"]');
    if (!removeBtn) return;

    const item = removeBtn.closest('.dropdown-item');
    const ingredientId = item.dataset.ingredientId;

    // Animate out
    gsap.to(item, {
      opacity: 0,
      x: 20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        removePantryItem(ingredientId);
      }
    });
  });

  // Toggle dropdown
  dropdownToggle.addEventListener('click', () => {
    pantryDropdown.classList.toggle('pantry-dropdown--open');
  });

  // Render pantry items
  function updatePantryUI() {
    renderDropdownList();
    updatePantryStats();
    updateRecipeGrid(); // Update recipes when pantry changes

    // Refresh browser if open
    if (currentBrowserCategory && ingredientBrowser.style.display !== 'none') {
      renderIngredientBrowser(currentBrowserCategory, browserGrid, updatePantryUI);
    }
  }

  // Show ingredient browser for a category
  function showIngredientBrowser(categoryId) {
    currentBrowserCategory = categoryId;
    const categoryName = getCategoryDisplayName(categoryId);
    browserTitle.textContent = `Browse ${categoryName}`;
    ingredientBrowser.style.display = 'block';

    renderIngredientBrowser(categoryId, browserGrid, updatePantryUI);

    // Animate in
    gsap.fromTo(ingredientBrowser,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }

  // Hide ingredient browser
  function hideIngredientBrowser() {
    gsap.to(ingredientBrowser, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        ingredientBrowser.style.display = 'none';
        currentBrowserCategory = null;
      }
    });
  }

  // Build category filter buttons
  function buildCategoryFilter() {
    const categories = getCategories();
    categoryFilter.innerHTML = '<button class="category-btn category-btn--active" data-category="all">All</button>';

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.dataset.category = cat.id;
      btn.innerHTML = `${getCategoryIcon(cat.id)} ${cat.name}`;
      categoryFilter.appendChild(btn);
    });

    // Category filter click handler
    categoryFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-btn');
      if (!btn) return;

      const category = btn.dataset.category;

      categoryFilter.querySelectorAll('.category-btn').forEach(b => b.classList.remove('category-btn--active'));
      btn.classList.add('category-btn--active');

      // Show/hide ingredient browser
      if (category === 'all') {
        hideIngredientBrowser();
      } else {
        showIngredientBrowser(category);
      }
    });
  }

  // Close browser button
  closeBrowserBtn.addEventListener('click', () => {
    hideIngredientBrowser();
    // Reset to "All" category
    categoryFilter.querySelectorAll('.category-btn').forEach(b => b.classList.remove('category-btn--active'));
    categoryFilter.querySelector('[data-category="all"]').classList.add('category-btn--active');
  });

  buildCategoryFilter();
  updatePantryUI();

  // Listen for pantry changes
  onPantryChange(() => {
    updatePantryUI();
  });
}

/**
 * Update pantry stats display
 */
function updatePantryStats() {
  const stats = getPantryStats();
  const makeableCount = countMakeableRecipes(allRecipes);

  document.getElementById('statTotal').textContent = stats.totalItems;
  document.getElementById('statCategories').textContent = Object.keys(stats.byCategory).length;
  document.getElementById('statRecipes').textContent = makeableCount;
}

/**
 * Handle edit pantry item (for now, just re-add modal)
 */
function handleEditPantryItem(item) {
  // For simplicity, remove and re-add via modal
  openModal('addIngredientModal');
}

/**
 * Handle remove pantry item
 */
function handleRemovePantryItem(ingredientId) {
  removePantryItem(ingredientId);
}

/**
 * Initialize add ingredient modal
 */
function initAddIngredientModal() {
  const modal = document.getElementById('addIngredientModal');
  const form = document.getElementById('addIngredientForm');
  const searchInput = document.getElementById('ingredientSearchInput');
  const resultsContainer = document.getElementById('autocompleteResults');
  const selectedIdInput = document.getElementById('selectedIngredientId');
  const submitBtn = document.getElementById('submitAddIngredient');
  const cancelBtn = document.getElementById('cancelAddIngredient');
  const addBtn = document.getElementById('addIngredientBtn');

  // Open modal button
  addBtn.addEventListener('click', () => {
    selectedIngredient = null;
    selectedIdInput.value = '';
    submitBtn.disabled = true;
    clearAutocomplete(searchInput, resultsContainer);
    form.reset();
    openModal('addIngredientModal');
  });

  // Initialize autocomplete
  initAutocomplete(searchInput, resultsContainer, (ingredient) => {
    selectedIngredient = ingredient;
    selectedIdInput.value = ingredient.id;
    submitBtn.disabled = false;

    // Set default unit
    const unitSelect = document.getElementById('ingredientUnit');
    if (ingredient.defaultUnit) {
      unitSelect.value = ingredient.defaultUnit;
    }
  });

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    closeModal('addIngredientModal');
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!selectedIngredient) return;

    const quantity = parseFloat(document.getElementById('ingredientQuantity').value) || 1;
    const unit = document.getElementById('ingredientUnit').value;
    const storage = document.getElementById('ingredientStorage').value;
    const notes = document.getElementById('ingredientNotes').value;

    addPantryItem(selectedIngredient.id, quantity, unit, storage, notes);

    closeModal('addIngredientModal');
    selectedIngredient = null;
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

  exportBtn.addEventListener('click', () => {
    const filename = downloadPantryJson();
    console.log('Exported pantry to:', filename);
  });

  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pendingFile = file;
    openModal('importModal');
    importInput.value = ''; // Reset for next use
  });

  mergeBtn.addEventListener('click', async () => {
    if (pendingFile) {
      const result = await importPantryFromFile(pendingFile, 'merge');
      console.log('Import result:', result);
      pendingFile = null;
    }
    closeModal('importModal');
  });

  replaceBtn.addEventListener('click', async () => {
    if (pendingFile) {
      const result = await importPantryFromFile(pendingFile, 'replace');
      console.log('Import result:', result);
      pendingFile = null;
    }
    closeModal('importModal');
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

  // Populate cuisine filter
  const cuisines = getUniqueCuisines(allRecipes);
  cuisineFilter.innerHTML = '<option value="all">All Cuisines</option>';
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.value = cuisine;
    option.textContent = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
    cuisineFilter.appendChild(option);
  });

  // Search input
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilters.search = e.target.value;
      updateRecipeGrid();
    }, 200);
  });

  // Filter changes
  matchFilter.addEventListener('change', (e) => {
    currentFilters.matchType = e.target.value;
    updateRecipeGrid();
  });

  difficultyFilter.addEventListener('change', (e) => {
    currentFilters.difficulty = e.target.value;
    updateRecipeGrid();
  });

  cuisineFilter.addEventListener('change', (e) => {
    currentFilters.cuisine = e.target.value;
    updateRecipeGrid();
  });

  // Initial render
  updateRecipeGrid();
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
    // Shuffle and take first N for preview
    recipesToShow = shuffleArray(final).slice(0, RECIPE_PREVIEW_COUNT);
    showViewAllButton = true;
  }

  // Render recipes
  renderRecipeGrid(recipesToShow, recipeGrid, handleRecipeClick);

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
      viewAllContainer.className = 'view-all-container';
      viewAllContainer.innerHTML = `
        <button class="btn btn--secondary view-all-btn" id="viewAllRecipesBtn">
          View All ${totalCount} Recipes
        </button>
      `;
      const recipeGrid = document.getElementById('recipeGrid');
      recipeGrid.parentNode.insertBefore(viewAllContainer, recipeGrid.nextSibling);

      document.getElementById('viewAllRecipesBtn').addEventListener('click', () => {
        showAllRecipes = true;
        updateRecipeGrid();
      });
    } else {
      viewAllContainer.querySelector('.view-all-btn').textContent = `View All ${totalCount} Recipes`;
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

  // Render initial calendar
  function renderCalendar() {
    weekTitle.textContent = formatWeekTitle(currentWeekStart);
    renderWeekView(calendarContainer, currentWeekStart, {
      onAddClick: (dateStr) => openAddMealModal(dateStr),
      onMealClick: (meal, recipe) => openMealDetailModal(meal, recipe),
      onRemoveClick: (mealId) => removeMeal(mealId)
    });
    updateMealPlanStats();
  }

  // Week navigation
  prevWeekBtn.addEventListener('click', () => {
    currentWeekStart = navigateWeek(currentWeekStart, -1);
    renderCalendar();
  });

  nextWeekBtn.addEventListener('click', () => {
    currentWeekStart = navigateWeek(currentWeekStart, 1);
    renderCalendar();
  });

  todayBtn.addEventListener('click', () => {
    currentWeekStart = goToCurrentWeek();
    renderCalendar();
  });

  // Clear week button
  clearWeekBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all meals for this week?')) {
      const removed = clearWeek(currentWeekStart);
      console.log(`Cleared ${removed} meals`);
      renderCalendar();
    }
  });

  // Shopping list button
  generateShoppingListBtn.addEventListener('click', () => {
    openShoppingListModal();
  });

  // Initialize add meal modal
  initAddMealModal((date, meal) => {
    renderCalendar();
  });

  // Listen for meal plan changes
  onMealPlanChange(() => {
    renderCalendar();
  });

  // Listen for pantry changes to update availability
  onPantryChange(() => {
    renderCalendar();
  });

  // Set up callback for "Add to Meal Plan" button in recipe detail
  setAddToMealPlanCallback((recipe) => {
    // Close recipe modal and open add meal modal with today's date and recipe pre-selected
    closeModal('recipeModal');
    const today = formatDate(new Date());
    openAddMealModal(today, recipe);
  });

  // Initial render
  renderCalendar();
}

/**
 * Update meal plan stats display
 */
function updateMealPlanStats() {
  const stats = getMealPlanStats(currentWeekStart);
  document.getElementById('statPlannedMeals').textContent = stats.totalMeals;
  document.getElementById('statCanMake').textContent = stats.canMake;
  document.getElementById('statNeedShopping').textContent = stats.needShopping;
}

/**
 * Open meal detail modal
 */
function openMealDetailModal(meal, recipe) {
  const container = document.getElementById('mealDetailContent');
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

  // Scale ingredients for meal servings
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
    <div class="meal-detail__header">
      <span class="meal-detail__icon">${mealTypeIcons[meal.mealType] || '🍽️'}</span>
      <div>
        <h3 class="meal-detail__title">${escapeHtml(recipe.title)}</h3>
        <p class="meal-detail__meta">${mealTypeNames[meal.mealType]} | ${meal.servings} servings</p>
      </div>
    </div>
    ${meal.notes ? `<p class="meal-detail__notes"><em>${escapeHtml(meal.notes)}</em></p>` : ''}
    <div class="meal-detail__section">
      <h4 class="meal-detail__section-title">Ingredients</h4>
      <div class="meal-detail__ingredients">
        ${scaledIngredients.map(ing => `
          <div class="meal-detail__ingredient ${ing.hasIngredient ? 'meal-detail__ingredient--have' : 'meal-detail__ingredient--missing'}">
            <span>${ing.hasIngredient ? '✓' : '✗'}</span>
            <span>${escapeHtml(ing.name)}</span>
            <span class="meal-detail__ingredient-qty">${ing.scaledQty.toFixed(1)} ${escapeHtml(ing.unit)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="meal-detail__actions">
      <button class="btn btn--secondary" id="viewFullRecipeBtn">View Full Recipe</button>
      <button class="btn btn--danger" id="removeMealBtn">Remove from Plan</button>
    </div>
  `;

  // View full recipe button
  container.querySelector('#viewFullRecipeBtn').addEventListener('click', () => {
    closeModal('mealDetailModal');
    handleRecipeClick(recipe);
  });

  // Remove meal button
  container.querySelector('#removeMealBtn').addEventListener('click', () => {
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

  // Get shopping list for the current week
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const shoppingList = getShoppingList(currentWeekStart, endDate);

  subtitle.textContent = `Items needed for ${formatWeekTitle(currentWeekStart)}`;

  if (shoppingList.length === 0) {
    container.innerHTML = `
      <div class="shopping-list__empty">
        <span class="shopping-list__empty-icon">🎉</span>
        <p>You have everything you need!</p>
        <p>All planned meals can be made with your pantry.</p>
      </div>
    `;
  } else {
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
      <div class="shopping-list__category">
        <div class="shopping-list__category-header">
          <span class="shopping-list__category-icon">${categoryIcons[category] || '📦'}</span>
          <span class="shopping-list__category-name">${escapeHtml(category.replace('_', ' '))}</span>
        </div>
        ${items.map(item => `
          <div class="shopping-list__item">
            <span class="shopping-list__item-name">${escapeHtml(item.name)}</span>
            <span class="shopping-list__item-qty">${item.shortage.toFixed(1)} ${escapeHtml(item.unit)}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Copy to clipboard
  copyBtn.onclick = () => {
    const text = shoppingList.map(item =>
      `- ${item.name}: ${item.shortage.toFixed(1)} ${item.unit}`
    ).join('\n');

    navigator.clipboard.writeText(`Shopping List\n${formatWeekTitle(currentWeekStart)}\n\n${text || 'Nothing needed!'}`).then(() => {
      copyBtn.innerHTML = '<span class="btn__icon">✓</span> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<span class="btn__icon">📋</span> Copy to Clipboard';
      }, 2000);
    });
  };

  // Close button
  closeBtn.onclick = () => closeModal('shoppingListModal');

  openModal('shoppingListModal');
}

// ============================================
// Main Initialization
// ============================================

/**
 * Load all data
 */
async function loadData() {
  try {
    // Load ingredients first (needed for pantry)
    await loadIngredients();

    // Initialize pantry from localStorage
    initPantry();

    // Initialize meal plan from localStorage
    initMealPlan();

    // Load recipes
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
  // Add fallback styles for scroll indicator
  addFallbackStyles();

  // Create scroll indicator fallback
  createScrollIndicatorFallback();

  // Load data
  await loadData();

  // Initialize intro animation first
  const introTl = initIntroAnimation();

  // After intro, initialize other animations
  introTl.eventCallback('onComplete', () => {
    // Initialize parallax system
    initAllParallax();

    // Initialize navigation
    initNavigation();
    initHeaderScroll();

    // Initialize section animations
    initSectionAnimations();
    initStatsAnimation();

    // Initialize pantry
    initPantryUI();
    initAddIngredientModal();
    initExportImport();

    // Initialize recipes
    initRecipeUI();

    // Initialize meal planner
    initMealPlannerUI();

    // Initialize Lottie
    initLottieScroll();

    // Refresh ScrollTrigger after all content is ready
    refreshParallax();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle resize events
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
});

// Log info
console.log('GSAP version:', gsap.version);
console.log('Pantry Planner initialized');
