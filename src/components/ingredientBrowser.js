/**
 * Ingredient Browser Component
 * Displays browsable ingredients by category with quick add/remove functionality
 * Clean Swiss Style - No emojis, list layout
 */

import { getIngredientsByCategory, getCategories } from '../modules/ingredientManager.js';
import { getPantryItems } from '../modules/pantryManager.js';

// Track if event listener has been added to avoid duplicates
const initializedContainers = new WeakSet();

/**
 * Get pantry quantity for an ingredient
 */
function getPantryQuantity(ingredientId, pantryItems) {
  const item = pantryItems.find(p => p.ingredientId === ingredientId);
  return item ? item.quantity : 0;
}

/**
 * Create a single ingredient item for the browser
 * Clean row layout with +/- controls and unit dropdown
 */
function createBrowserItem(ingredient, quantity, unit = null) {
  const item = document.createElement('div');
  item.className = `browser-item ${quantity > 0 ? 'browser-item--in-pantry' : ''}`;
  item.dataset.ingredientId = ingredient.id;

  const currentUnit = unit || ingredient.defaultUnit || 'pieces';

  item.innerHTML = `
    <div class="browser-item__content">
      <span class="browser-item__name">${ingredient.name}</span>
      <span class="browser-item__quantity ${quantity > 0 ? 'browser-item__quantity--visible' : ''}">${quantity > 0 ? 'In pantry: ' + quantity + ' ' + currentUnit : ''}</span>
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
        <span class="browser-item__qty-display">${quantity}</span>
        <button class="browser-item__btn browser-item__btn--increase" data-action="increase" title="Increase">+</button>
      </div>
    </div>
  `;

  return item;
}

/**
 * Update a browser item's display based on quantity
 */
function updateBrowserItemDisplay(item, quantity) {
  const quantityEl = item.querySelector('.browser-item__quantity');

  if (quantity > 0) {
    item.classList.add('browser-item--in-pantry');
    quantityEl.classList.add('browser-item__quantity--visible');
    quantityEl.textContent = 'In pantry: ' + quantity;
  } else {
    item.classList.remove('browser-item--in-pantry');
    quantityEl.classList.remove('browser-item__quantity--visible');
    quantityEl.textContent = '';
  }
}

// Store onUpdate callback for use by modal
let browserOnUpdateCallback = null;

/**
 * Handle click events for ingredient browser
 */
function handleBrowserClick(e, onUpdate) {
  const btn = e.target.closest('.browser-item__btn');
  if (!btn) return;

  const item = btn.closest('.browser-item');
  const ingredientId = item.dataset.ingredientId;
  const action = btn.dataset.action;

  if (action === 'add') {
    // Open quantity modal - will be connected in Phase 5
    // For now, store the callback and dispatch a custom event
    browserOnUpdateCallback = onUpdate;

    // Dispatch custom event for quantity modal to handle
    const event = new CustomEvent('openQuantityModal', {
      detail: { ingredientId, browserItem: item }
    });
    document.dispatchEvent(event);
  }
}

/**
 * Get the stored onUpdate callback (used by quantityModal)
 */
export function getBrowserUpdateCallback() {
  return browserOnUpdateCallback;
}

/**
 * Render the ingredient browser grid for a category
 */
export function renderIngredientBrowser(categoryId, container, onUpdate) {
  const ingredients = getIngredientsByCategory(categoryId);
  const pantryItems = getPantryItems();

  container.innerHTML = '';

  if (ingredients.length === 0) {
    container.innerHTML = '<p class="browser-empty">No ingredients in this category</p>';
    return;
  }

  // Sort ingredients alphabetically
  const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name));

  // Group by subcategory if available
  const bySubcategory = new Map();
  sorted.forEach(ing => {
    const sub = ing.subcategory || 'other';
    if (!bySubcategory.has(sub)) {
      bySubcategory.set(sub, []);
    }
    bySubcategory.get(sub).push(ing);
  });

  // Render each subcategory group
  bySubcategory.forEach((items, subcategory) => {
    // Add subcategory header if there are multiple subcategories
    if (bySubcategory.size > 1) {
      const header = document.createElement('div');
      header.className = 'browser-subcategory';
      header.textContent = formatSubcategory(subcategory);
      container.appendChild(header);
    }

    // Render items in this subcategory
    items.forEach(ingredient => {
      const quantity = getPantryQuantity(ingredient.id, pantryItems);
      const item = createBrowserItem(ingredient, quantity);
      container.appendChild(item);
    });
  });

  // Only add event listener once per container
  if (!initializedContainers.has(container)) {
    container.addEventListener('click', (e) => handleBrowserClick(e, onUpdate));
    initializedContainers.add(container);
  }
}

/**
 * Format subcategory name for display
 */
function formatSubcategory(subcategory) {
  return subcategory
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(categoryId) {
  const categories = getCategories();
  const category = categories.find(c => c.id === categoryId);
  return category ? category.name : categoryId;
}

// Export updateBrowserItemDisplay for quantity modal to use
export { updateBrowserItemDisplay, getPantryQuantity };

export default {
  renderIngredientBrowser,
  getCategoryDisplayName,
  updateBrowserItemDisplay,
  getPantryQuantity,
  getBrowserUpdateCallback
};
