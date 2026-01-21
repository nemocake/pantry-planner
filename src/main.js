import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Import core modules
import { initAllParallax, refreshParallax } from './modules/parallax.js';
import { initNavigation, initHeaderScroll } from './modules/navigation.js';
import { initLottieScroll, createScrollIndicatorFallback } from './modules/lottieScroll.js';

// Import pantry modules
import { loadIngredients, getCategories, getCategoryIcon } from './modules/ingredientManager.js';
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

// Import recipe modules
import { loadRecipes, getRecipes, applyFilters, getUniqueCuisines } from './modules/recipeManager.js';
import { getMatchedRecipes, filterByMatchType, countMakeableRecipes } from './modules/matchAlgorithm.js';
import { renderRecipeGrid, renderRecipeDetail } from './components/recipeCard.js';

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
  const pantryGrid = document.getElementById('pantryGrid');
  const categoryFilter = document.getElementById('categoryFilter');

  // Render pantry items
  function updatePantryUI() {
    const items = getPantryItems();
    renderPantryGrid(items, pantryGrid, {
      onEdit: handleEditPantryItem,
      onRemove: handleRemovePantryItem
    });
    updatePantryStats();
    updateRecipeGrid(); // Update recipes when pantry changes
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

      categoryFilter.querySelectorAll('.category-btn').forEach(b => b.classList.remove('category-btn--active'));
      btn.classList.add('category-btn--active');

      filterPantryCards(pantryGrid, btn.dataset.category);
    });
  }

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

  // Render
  renderRecipeGrid(final, recipeGrid, handleRecipeClick);
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
