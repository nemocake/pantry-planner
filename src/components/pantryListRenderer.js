/**
 * Pantry List Renderer
 * Shared component for rendering pantry items as a categorized list
 */

import { getPantryItems, addPantryItem, removePantryItem } from '../modules/pantryManager.js';
import { getIngredientById } from '../modules/ingredientManager.js';
import { openModal } from '../modules/modalManager.js';

/**
 * Render pantry items to a container
 * @param {HTMLElement} container - The container element to render into
 * @param {Object} options - Rendering options
 * @param {boolean} options.showAddRow - Show "Add New Item" row at bottom
 * @param {string} options.emptyStateAction - Action for empty state button ('modal' or 'data-action')
 */
export function renderPantryList(container, options = {}) {
  if (!container) return;

  const { showAddRow = false, emptyStateAction = 'modal' } = options;
  const items = getPantryItems();

  if (items.length === 0) {
    const buttonHtml = emptyStateAction === 'modal'
      ? `<button class="btn btn--primary" style="margin-top: var(--spacing-lg);" onclick="document.getElementById('addIngredientModal').classList.add('active')">Add First Item</button>`
      : `<button class="btn btn--primary" data-action="add-ingredient">Add First Item</button>`;

    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-state__title">Your pantry is empty</h3>
        <p class="empty-state__text">Add ingredients to start tracking your inventory</p>
        ${buttonHtml}
      </div>
    `;
    return;
  }

  // Group by category
  const grouped = {};
  items.forEach(item => {
    const ingredient = getIngredientById(item.ingredientId);
    if (!ingredient) return;
    const cat = ingredient.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ item, ingredient });
  });

  // Sort categories alphabetically
  const sortedCategories = Object.keys(grouped).sort();

  // Build list HTML
  let listHTML = `
    <div class="pantry-list">
      <div class="pantry-list__header">
        <span>Item</span>
        <span>Category</span>
        <span>Quantity</span>
        <span></span>
      </div>
  `;

  sortedCategories.forEach(category => {
    const categoryItems = grouped[category].sort((a, b) =>
      a.ingredient.name.localeCompare(b.ingredient.name)
    );

    listHTML += `<div class="pantry-category-group" data-category="${category}">`;
    listHTML += `<div class="pantry-category-label">${category}</div>`;

    categoryItems.forEach(({ item, ingredient }) => {
      const displayUnit = (item.unit === 'unit' || !item.unit) ? ingredient.defaultUnit : item.unit;
      const isLowStock = item.quantity <= 1;

      listHTML += `
        <div class="item-card" data-ingredient-id="${item.ingredientId}" data-category="${category}">
          <span class="item-card__name">${ingredient.name}</span>
          <span class="item-card__category">${category}</span>
          <span class="item-card__quantity ${isLowStock ? 'item-card__quantity--low' : ''}">${item.quantity} ${displayUnit}</span>
          <div class="item-card__actions">
            <button class="qty-btn" data-action="decrease" title="Decrease">−</button>
            <button class="qty-btn" data-action="increase" title="Increase">+</button>
          </div>
        </div>
      `;
    });

    listHTML += `</div>`;
  });

  // Add new item row if requested
  if (showAddRow) {
    listHTML += `
      <div class="item-card item-card--add" id="addItemCard">
        <span class="add-label">
          <span class="add-icon">+</span>
          Add New Item
        </span>
      </div>
    `;
  }

  listHTML += `</div>`;
  container.innerHTML = listHTML;
}

/**
 * Handle pantry list click events (quantity changes, add item)
 * @param {Event} e - Click event
 * @param {HTMLElement} container - The container element
 */
export function handlePantryListClick(e, container) {
  const card = e.target.closest('.item-card');
  if (!card) return;

  // Handle "Add Item" card click
  if (card.classList.contains('item-card--add')) {
    openModal('addIngredientModal');
    return;
  }

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
}

/**
 * Filter pantry list by category
 * @param {HTMLElement} container - The container element
 * @param {string} category - Category to filter by ('all' for all categories)
 */
export function filterPantryList(container, category) {
  if (!container) return;

  // Filter category groups
  const groups = container.querySelectorAll('.pantry-category-group');
  groups.forEach(group => {
    const groupCategory = group.dataset.category;
    if (category === 'all' || groupCategory === category) {
      group.style.display = '';
    } else {
      group.style.display = 'none';
    }
  });

  // Also handle individual cards (fallback)
  const cards = container.querySelectorAll('.item-card:not(.item-card--add)');
  cards.forEach(card => {
    const cardCategory = card.dataset.category;
    if (category === 'all' || cardCategory === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

export default {
  renderPantryList,
  handlePantryListClick,
  filterPantryList
};
