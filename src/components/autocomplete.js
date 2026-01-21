/**
 * Autocomplete Component
 * Provides ingredient search with dropdown suggestions
 */

import { searchIngredients, getIngredientIcon, getCategories } from '../modules/ingredientManager.js';

let currentHighlightIndex = -1;
let currentResults = [];

/**
 * Initialize autocomplete on an input element
 */
export function initAutocomplete(inputElement, resultsContainer, onSelect) {
  let debounceTimer = null;

  // Input handler with debounce
  inputElement.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(debounceTimer);

    if (query.length < 2) {
      hideResults(resultsContainer);
      return;
    }

    debounceTimer = setTimeout(() => {
      const results = searchIngredients(query, 8);
      currentResults = results;
      currentHighlightIndex = -1;
      renderResults(resultsContainer, results, onSelect, inputElement);
    }, 150);
  });

  // Keyboard navigation
  inputElement.addEventListener('keydown', (e) => {
    if (!resultsContainer.classList.contains('active')) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        navigateResults(resultsContainer, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateResults(resultsContainer, -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (currentHighlightIndex >= 0 && currentResults[currentHighlightIndex]) {
          selectResult(currentResults[currentHighlightIndex], onSelect, inputElement, resultsContainer);
        }
        break;
      case 'Escape':
        hideResults(resultsContainer);
        break;
    }
  });

  // Focus handler
  inputElement.addEventListener('focus', () => {
    if (inputElement.value.length >= 2 && currentResults.length > 0) {
      showResults(resultsContainer);
    }
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!inputElement.contains(e.target) && !resultsContainer.contains(e.target)) {
      hideResults(resultsContainer);
    }
  });
}

/**
 * Render search results
 */
function renderResults(container, results, onSelect, inputElement) {
  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = '<div class="autocomplete-empty">No ingredients found</div>';
    showResults(container);
    return;
  }

  results.forEach((ingredient, index) => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.dataset.index = index;

    const icon = getIngredientIcon(ingredient);
    const categoryLabel = getCategoryLabel(ingredient.category);

    item.innerHTML = `
      <span class="autocomplete-item__icon">${icon}</span>
      <div>
        <div class="autocomplete-item__name">${ingredient.name}</div>
        <div class="autocomplete-item__category">${categoryLabel}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      selectResult(ingredient, onSelect, inputElement, container);
    });

    item.addEventListener('mouseenter', () => {
      highlightResult(container, index);
    });

    container.appendChild(item);
  });

  showResults(container);
}

/**
 * Get human-readable category label
 */
function getCategoryLabel(categoryId) {
  const labels = {
    proteins: 'Proteins',
    vegetables: 'Vegetables',
    fruits: 'Fruits',
    dairy: 'Dairy',
    grains: 'Grains & Pasta',
    canned: 'Canned Goods',
    baking: 'Baking',
    spices: 'Spices & Seasonings',
    condiments: 'Condiments & Sauces',
    frozen: 'Fresh & Frozen',
    international: 'International',
    beverages: 'Beverages'
  };
  return labels[categoryId] || categoryId;
}

/**
 * Navigate through results with keyboard
 */
function navigateResults(container, direction) {
  const items = container.querySelectorAll('.autocomplete-item');
  if (items.length === 0) return;

  currentHighlightIndex += direction;

  if (currentHighlightIndex < 0) {
    currentHighlightIndex = items.length - 1;
  } else if (currentHighlightIndex >= items.length) {
    currentHighlightIndex = 0;
  }

  highlightResult(container, currentHighlightIndex);
}

/**
 * Highlight a specific result
 */
function highlightResult(container, index) {
  const items = container.querySelectorAll('.autocomplete-item');

  items.forEach((item, i) => {
    if (i === index) {
      item.classList.add('highlighted');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('highlighted');
    }
  });

  currentHighlightIndex = index;
}

/**
 * Select a result
 */
function selectResult(ingredient, onSelect, inputElement, container) {
  inputElement.value = ingredient.name;
  hideResults(container);

  if (onSelect) {
    onSelect(ingredient);
  }
}

/**
 * Show results dropdown
 */
function showResults(container) {
  container.classList.add('active');
}

/**
 * Hide results dropdown
 */
function hideResults(container) {
  container.classList.remove('active');
  currentHighlightIndex = -1;
}

/**
 * Clear autocomplete state
 */
export function clearAutocomplete(inputElement, resultsContainer) {
  inputElement.value = '';
  resultsContainer.innerHTML = '';
  hideResults(resultsContainer);
  currentResults = [];
  currentHighlightIndex = -1;
}

export default {
  initAutocomplete,
  clearAutocomplete
};
