/**
 * Pantry Card Component
 * Renders individual pantry item cards
 */

import { getIngredientById, getIngredientIcon } from '../modules/ingredientManager.js';

/**
 * Create a pantry card HTML element
 */
export function createPantryCard(pantryItem, onEdit, onRemove) {
  const ingredient = getIngredientById(pantryItem.ingredientId);
  if (!ingredient) return null;

  const icon = getIngredientIcon(ingredient);
  // Use ingredient's default unit if stored unit is generic "unit"
  const displayUnit = (pantryItem.unit === 'unit' || !pantryItem.unit) ? ingredient.defaultUnit : pantryItem.unit;
  const quantityDisplay = pantryItem.quantity
    ? `${pantryItem.quantity} ${displayUnit}`
    : displayUnit;

  const card = document.createElement('div');
  card.className = 'pantry-card';
  card.dataset.ingredientId = pantryItem.ingredientId;
  card.dataset.category = ingredient.category;
  card.dataset.speed = (1 + Math.random() * 0.15).toFixed(2);

  card.innerHTML = `
    <span class="pantry-card__icon">${icon}</span>
    <h3 class="pantry-card__name">${ingredient.name}</h3>
    <div class="pantry-card__quantity">${quantityDisplay}</div>
    <div class="pantry-card__storage">${pantryItem.storage}</div>
    <div class="pantry-card__actions">
      <button class="pantry-card__btn pantry-card__btn--edit" data-action="edit">Edit</button>
      <button class="pantry-card__btn pantry-card__btn--remove" data-action="remove">Remove</button>
    </div>
  `;

  // Event listeners
  card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(pantryItem);
  });

  card.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(pantryItem.ingredientId);
  });

  return card;
}

/**
 * Render the entire pantry grid
 */
export function renderPantryGrid(pantryItems, container, callbacks = {}) {
  const { onEdit, onRemove } = callbacks;

  // Clear existing content
  container.innerHTML = '';

  if (pantryItems.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'pantry-empty';
    emptyState.id = 'pantryEmpty';
    emptyState.innerHTML = `
      <p>Your pantry is empty!</p>
      <p>Add ingredients to get started</p>
    `;
    container.appendChild(emptyState);
    return;
  }

  // Sort by category then name
  const sorted = [...pantryItems].sort((a, b) => {
    const ingA = getIngredientById(a.ingredientId);
    const ingB = getIngredientById(b.ingredientId);
    if (!ingA || !ingB) return 0;

    if (ingA.category !== ingB.category) {
      return ingA.category.localeCompare(ingB.category);
    }
    return ingA.name.localeCompare(ingB.name);
  });

  sorted.forEach(item => {
    const card = createPantryCard(item, onEdit, onRemove);
    if (card) {
      container.appendChild(card);
    }
  });
}

/**
 * Filter pantry cards by category
 */
export function filterPantryCards(container, category) {
  const cards = container.querySelectorAll('.pantry-card');

  cards.forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

export default {
  createPantryCard,
  renderPantryGrid,
  filterPantryCards
};
