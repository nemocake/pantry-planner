/**
 * Quantity Modal Component
 * Handles the quantity selection popup for adding ingredients to pantry
 */

import { openModal, closeModal } from '../modules/modalManager.js';
import { getIngredientById, getIngredientIcon } from '../modules/ingredientManager.js';
import { addPantryItem, updatePantryItemQuantity, getPantryItem } from '../modules/pantryManager.js';
import { getPresetsForIngredient } from '../data/commonSizes.js';
import { getCompatibleUnits } from '../modules/unitConverter.js';

const MODAL_ID = 'quantityModal';

// State
let currentIngredientId = null;
let currentBrowserItem = null;
let selectedQuantity = null;
let selectedUnit = null;

// DOM references
let modalIcon = null;
let modalTitle = null;
let presetsContainer = null;
let quantityInput = null;
let unitSelect = null;
let submitBtn = null;

/**
 * Initialize the quantity modal
 */
export function initQuantityModal() {
  // Cache DOM elements
  modalIcon = document.getElementById('quantityModalIcon');
  modalTitle = document.getElementById('quantityModalTitle');
  presetsContainer = document.getElementById('quantityPresets');
  quantityInput = document.getElementById('quantityInput');
  unitSelect = document.getElementById('quantityUnit');
  submitBtn = document.getElementById('quantitySubmit');

  if (!presetsContainer || !quantityInput || !unitSelect || !submitBtn) {
    console.error('Quantity modal elements not found');
    return;
  }

  // Listen for custom event from ingredient browser
  document.addEventListener('openQuantityModal', (e) => {
    const { ingredientId, browserItem } = e.detail;
    openQuantityModal(ingredientId, browserItem);
  });

  // Preset button clicks (delegated)
  presetsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;

    const quantity = parseFloat(btn.dataset.quantity);
    const unit = btn.dataset.unit;

    selectPreset(quantity, unit);
  });

  // Custom input changes
  quantityInput.addEventListener('input', handleCustomInput);
  unitSelect.addEventListener('change', handleCustomInput);

  // Submit button
  submitBtn.addEventListener('click', handleSubmit);
}

/**
 * Open the quantity modal for an ingredient
 */
export function openQuantityModal(ingredientId, browserItem = null) {
  const ingredient = getIngredientById(ingredientId);
  if (!ingredient) {
    console.error('Ingredient not found:', ingredientId);
    return;
  }

  // Store state
  currentIngredientId = ingredientId;
  currentBrowserItem = browserItem;
  selectedQuantity = null;
  selectedUnit = ingredient.defaultUnit;

  // Update modal header
  const icon = getIngredientIcon(ingredient);
  modalIcon.textContent = icon;
  modalTitle.textContent = ingredient.name;

  // Render presets
  renderPresets(ingredient);

  // Setup unit dropdown
  setupUnitDropdown(ingredient);

  // Reset custom inputs
  quantityInput.value = '';
  submitBtn.disabled = true;

  // Clear any preset selection
  clearPresetSelection();

  // Check if item already in pantry
  const existingItem = getPantryItem(ingredientId);
  if (existingItem) {
    submitBtn.textContent = 'Update Pantry';
  } else {
    submitBtn.textContent = 'Add to Pantry';
  }

  // Open modal
  openModal(MODAL_ID);
}

/**
 * Render preset buttons for an ingredient
 */
function renderPresets(ingredient) {
  const presets = getPresetsForIngredient(ingredient.id, ingredient.category);

  presetsContainer.innerHTML = presets.map(preset => `
    <button class="preset-btn"
            data-quantity="${preset.quantity}"
            data-unit="${preset.unit}">
      ${preset.label}
    </button>
  `).join('');
}

/**
 * Setup the unit dropdown based on ingredient's default unit
 */
function setupUnitDropdown(ingredient) {
  const compatibleUnits = getCompatibleUnits(ingredient.defaultUnit);

  // Common display names
  const unitLabels = {
    g: 'g',
    kg: 'kg',
    oz: 'oz',
    lb: 'lb',
    ml: 'ml',
    l: 'L',
    tsp: 'tsp',
    tbsp: 'tbsp',
    cup: 'cups',
    pieces: 'pieces',
    cloves: 'cloves',
    stalks: 'stalks',
    can: 'cans'
  };

  unitSelect.innerHTML = compatibleUnits.map(unit => {
    const label = unitLabels[unit] || unit;
    const selected = unit === ingredient.defaultUnit ? 'selected' : '';
    return `<option value="${unit}" ${selected}>${label}</option>`;
  }).join('');

  selectedUnit = ingredient.defaultUnit;
}

/**
 * Handle preset button selection
 */
function selectPreset(quantity, unit) {
  selectedQuantity = quantity;
  selectedUnit = unit;

  // Update UI
  clearPresetSelection();
  const btn = presetsContainer.querySelector(`[data-quantity="${quantity}"][data-unit="${unit}"]`);
  if (btn) {
    btn.classList.add('preset-btn--selected');
  }

  // Clear custom input
  quantityInput.value = '';

  // Update unit dropdown
  unitSelect.value = unit;

  // Enable submit
  submitBtn.disabled = false;
}

/**
 * Clear all preset selections
 */
function clearPresetSelection() {
  presetsContainer.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('preset-btn--selected');
  });
}

/**
 * Handle custom input changes
 */
function handleCustomInput() {
  const value = parseFloat(quantityInput.value);

  if (value > 0) {
    selectedQuantity = value;
    selectedUnit = unitSelect.value;

    // Clear preset selection
    clearPresetSelection();

    // Enable submit
    submitBtn.disabled = false;
  } else {
    // Only disable if no preset selected
    if (!presetsContainer.querySelector('.preset-btn--selected')) {
      submitBtn.disabled = true;
    }
  }
}

/**
 * Handle form submission
 */
function handleSubmit() {
  if (!currentIngredientId || !selectedQuantity || selectedQuantity <= 0) {
    return;
  }

  const existingItem = getPantryItem(currentIngredientId);

  if (existingItem) {
    // Update existing item - add to current quantity
    const newQuantity = existingItem.quantity + selectedQuantity;
    updatePantryItemQuantity(currentIngredientId, newQuantity);
  } else {
    // Add new item
    addPantryItem(currentIngredientId, selectedQuantity, selectedUnit, 'pantry', '');
  }

  // Update browser item display if available
  if (currentBrowserItem) {
    const updatedItem = getPantryItem(currentIngredientId);
    const quantity = updatedItem ? updatedItem.quantity : 0;
    updateBrowserItemDisplayFromModal(currentBrowserItem, quantity);
  }

  // Trigger update callback
  triggerBrowserUpdate();

  // Close modal
  closeQuantityModal();
}

/**
 * Update browser item display (imported function pattern)
 */
function updateBrowserItemDisplayFromModal(item, quantity) {
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
 * Trigger browser update callback
 */
function triggerBrowserUpdate() {
  // Dispatch event for any listeners
  document.dispatchEvent(new CustomEvent('pantryUpdated'));
}

/**
 * Close the quantity modal
 */
export function closeQuantityModal() {
  currentIngredientId = null;
  currentBrowserItem = null;
  selectedQuantity = null;
  closeModal(MODAL_ID);
}

export default {
  initQuantityModal,
  openQuantityModal,
  closeQuantityModal
};
