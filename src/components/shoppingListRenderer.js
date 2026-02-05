/**
 * Shopping List Renderer
 * Shared component for rendering shopping list items by category
 */

import { CATEGORY_ICONS } from '../data/icons.js';

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Group shopping list items by category
 * @param {Array} items - Shopping list items
 * @returns {Object} Items grouped by category
 */
export function groupByCategory(items) {
  const byCategory = {};
  items.forEach(item => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  });
  return byCategory;
}

/**
 * Render shopping list empty state
 * @param {boolean} isModal - Whether this is for modal (different message style)
 * @returns {string} HTML string
 */
export function renderEmptyState(isModal = false) {
  if (isModal) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">🎉</div>
        <h3 class="empty-state__title">You have everything you need!</h3>
        <p class="empty-state__text">All planned meals can be made with your pantry.</p>
      </div>
    `;
  }
  return '';
}

/**
 * Render a shopping list item
 * @param {Object} item - Shopping list item
 * @param {Object} options - Render options
 * @param {boolean} options.showRecipes - Show recipe tags
 * @param {boolean} options.isChecked - Whether item is checked
 * @param {string} options.itemKey - Unique key for persistence
 * @returns {string} HTML string
 */
export function renderListItem(item, options = {}) {
  const { showRecipes = false, isChecked = false, itemKey = '' } = options;

  const dataAttr = itemKey ? `data-item-key="${itemKey}"` : '';
  const checkedClass = isChecked ? ' checked' : '';

  let recipesHtml = '';
  if (showRecipes && item.recipes && item.recipes.length > 0) {
    recipesHtml = `
      <div class="item-recipes" title="For: ${item.recipes.join(', ')}">
        ${item.recipes.slice(0, 2).map(r => `<span class="recipe-tag">${escapeHtml(r)}</span>`).join('')}
        ${item.recipes.length > 2 ? `<span class="recipe-tag">+${item.recipes.length - 2}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="list-item${checkedClass}" ${dataAttr}>
      <div class="checkbox-wrapper">
        <div class="custom-checkbox${checkedClass}"></div>
      </div>
      <div class="item-details">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <span class="item-qty">${item.shortage.toFixed(1)} ${escapeHtml(item.unit)}</span>
      </div>
      ${recipesHtml}
    </div>
  `;
}

/**
 * Render shopping list grouped by category
 * @param {Array} shoppingList - Array of shopping list items
 * @param {Object} options - Render options
 * @param {boolean} options.showRecipes - Show recipe tags on items
 * @param {Set} options.checkedItems - Set of checked item keys (for persistence)
 * @returns {string} HTML string
 */
export function renderShoppingListHtml(shoppingList, options = {}) {
  const { showRecipes = false, checkedItems = new Set() } = options;

  const byCategory = groupByCategory(shoppingList);

  return Object.entries(byCategory).map(([category, items]) => `
    <div class="shopping-category">
      <div class="category-header">
        <span>${CATEGORY_ICONS[category] || '📦'}</span>
        <span class="category-name">${escapeHtml(category.replace('_', ' '))}</span>
        <span class="category-count">${items.length}</span>
      </div>
      <div class="shopping-list-items">
        ${items.map(item => {
          const itemKey = `${item.ingredientId}-${item.shortage.toFixed(1)}`;
          const isChecked = checkedItems.has(itemKey);
          return renderListItem(item, { showRecipes, isChecked, itemKey });
        }).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Setup checkbox click handlers on a container
 * @param {HTMLElement} container - The container element
 * @param {Set} checkedItems - Set to track checked items (optional, for persistence)
 * @param {Function} onToggle - Callback when item is toggled (optional)
 */
export function setupCheckboxHandlers(container, checkedItems = null, onToggle = null) {
  container.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const key = item.dataset.itemKey;
      const checkbox = item.querySelector('.custom-checkbox');

      const isNowChecked = !item.classList.contains('checked');

      if (isNowChecked) {
        item.classList.add('checked');
        checkbox?.classList.add('checked');
        if (checkedItems && key) checkedItems.add(key);
      } else {
        item.classList.remove('checked');
        checkbox?.classList.remove('checked');
        if (checkedItems && key) checkedItems.delete(key);
      }

      if (onToggle) onToggle(key, isNowChecked);
    });
  });
}

/**
 * Generate plain text shopping list for clipboard
 * @param {Array} shoppingList - Array of shopping list items
 * @returns {string} Plain text list
 */
export function generatePlainTextList(shoppingList) {
  return shoppingList.map(item =>
    `- ${item.name}: ${item.shortage.toFixed(1)} ${item.unit}`
  ).join('\n');
}

export default {
  groupByCategory,
  renderEmptyState,
  renderListItem,
  renderShoppingListHtml,
  setupCheckboxHandlers,
  generatePlainTextList
};
