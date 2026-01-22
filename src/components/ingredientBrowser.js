/**
 * Ingredient Browser Component
 * Displays browsable ingredients by category with quick add/remove functionality
 */

import { getIngredientsByCategory, getIngredientIcon, getCategories } from '../modules/ingredientManager.js';
import { getPantryItems, addPantryItem, removePantryItem, updatePantryItemQuantity } from '../modules/pantryManager.js';

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
 */
function createBrowserItem(ingredient, quantity) {
  const item = document.createElement('div');
  item.className = `browser-item ${quantity > 0 ? 'browser-item--in-pantry' : ''}`;
  item.dataset.ingredientId = ingredient.id;

  const icon = getIngredientIcon(ingredient);

  item.innerHTML = `
    <button class="browser-item__btn browser-item__btn--remove" data-action="decrease" title="Remove one">−</button>
    <div class="browser-item__content">
      <span class="browser-item__icon">${icon}</span>
      <span class="browser-item__name">${ingredient.name}</span>
      <span class="browser-item__quantity ${quantity > 0 ? 'browser-item__quantity--visible' : ''}">${quantity}</span>
    </div>
    <button class="browser-item__btn browser-item__btn--add" data-action="increase" title="Add one">+</button>
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
    quantityEl.textContent = quantity;
  } else {
    item.classList.remove('browser-item--in-pantry');
    quantityEl.classList.remove('browser-item__quantity--visible');
    quantityEl.textContent = '0';
  }
}

/**
 * Handle click events for ingredient browser
 */
function handleBrowserClick(e, onUpdate) {
  const btn = e.target.closest('.browser-item__btn');
  if (!btn) return;

  const item = btn.closest('.browser-item');
  const ingredientId = item.dataset.ingredientId;
  const action = btn.dataset.action;

  // Get current pantry items fresh
  const currentPantryItems = getPantryItems();
  const currentQuantity = getPantryQuantity(ingredientId, currentPantryItems);

  if (action === 'increase') {
    if (currentQuantity === 0) {
      // Add new item to pantry with quantity 1
      addPantryItem(ingredientId, 1, 'unit', 'pantry', '');
    } else {
      // Increment quantity by exactly 1
      updatePantryItemQuantity(ingredientId, currentQuantity + 1);
    }
    updateBrowserItemDisplay(item, currentQuantity + 1);
  } else if (action === 'decrease') {
    if (currentQuantity > 1) {
      // Decrement quantity by exactly 1
      updatePantryItemQuantity(ingredientId, currentQuantity - 1);
      updateBrowserItemDisplay(item, currentQuantity - 1);
    } else if (currentQuantity === 1) {
      // Remove from pantry
      removePantryItem(ingredientId);
      updateBrowserItemDisplay(item, 0);
    }
    // If quantity is 0, do nothing
  }

  if (onUpdate) onUpdate();
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

export default {
  renderIngredientBrowser,
  getCategoryDisplayName
};
