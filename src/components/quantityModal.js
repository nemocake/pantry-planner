/**
 * Quantity Modal Component
 * Handles the quantity selection popup for adding ingredients to pantry
 */

import { openModal, closeModal } from '../modules/modalManager.js';
import { getIngredientById, getIngredientIcon } from '../modules/ingredientManager.js';
import { addPantryItem, updatePantryItemQuantity, getPantryItem } from '../modules/pantryManager.js';
import { getPresetsForIngredient } from '../data/commonSizes.js';
import { getCompatibleUnits, convertQuantity } from '../modules/unitConverter.js';

const MODAL_ID = 'quantityModal';

// State
let currentIngredientId = null;
let currentBrowserItem = null;
let selectedQuantity = null;
let selectedUnit = null;
let originalPresets = []; // Store original presets for unit conversion
let currentIngredient = null; // Store current ingredient for re-rendering

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
  unitSelect.addEventListener('change', handleUnitChange);

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
  currentIngredient = ingredient;
  selectedQuantity = null;
  selectedUnit = ingredient.defaultUnit;

  // Store original presets for unit conversion
  originalPresets = getPresetsForIngredient(ingredient.id, ingredient.category);

  // Update modal header
  const icon = getIngredientIcon(ingredient);
  modalIcon.textContent = icon;
  modalTitle.textContent = ingredient.name;

  // Setup unit dropdown first (so we know the selected unit)
  setupUnitDropdown(ingredient);

  // Render presets in the default unit
  renderPresetsInUnit(ingredient.defaultUnit);

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
 * Render preset buttons converted to the specified unit
 */
function renderPresetsInUnit(targetUnit) {
  const convertedPresets = originalPresets.map(preset => {
    // Try to convert the preset quantity to the target unit
    const converted = convertQuantity(preset.quantity, preset.unit, targetUnit);

    if (converted !== null && preset.unit !== targetUnit) {
      // Successfully converted - format the label nicely
      const formattedQty = formatQuantityLabel(converted, targetUnit);
      return {
        quantity: converted,
        unit: targetUnit,
        label: formattedQty
      };
    } else {
      // Same unit or conversion failed - use original
      return preset;
    }
  });

  presetsContainer.innerHTML = convertedPresets.map(preset => `
    <button class="preset-btn"
            data-quantity="${preset.quantity}"
            data-unit="${preset.unit}">
      ${preset.label}
    </button>
  `).join('');
}

/**
 * Format a quantity with unit for display as a preset label
 */
function formatQuantityLabel(quantity, unit) {
  // Round to reasonable precision based on unit
  let displayQty;

  if (unit === 'g' || unit === 'ml') {
    // For small units, round to whole numbers
    displayQty = Math.round(quantity);
  } else if (unit === 'kg' || unit === 'l') {
    // For large units, show 1-2 decimals
    displayQty = Math.round(quantity * 10) / 10;
  } else if (unit === 'oz') {
    // Ounces - round to nearest 0.5
    displayQty = Math.round(quantity * 2) / 2;
  } else if (unit === 'lb') {
    // Pounds - show nice fractions or decimals
    displayQty = Math.round(quantity * 4) / 4; // Round to nearest 1/4
  } else if (unit === 'cup' || unit === 'tbsp' || unit === 'tsp') {
    // Volume measures - round to nearest 0.25
    displayQty = Math.round(quantity * 4) / 4;
  } else {
    // Default - round to 2 decimals
    displayQty = Math.round(quantity * 100) / 100;
  }

  // Format common fractions nicely
  const fractionMap = {
    0.25: '1/4',
    0.5: '1/2',
    0.75: '3/4',
    0.33: '1/3',
    0.67: '2/3'
  };

  const decimal = displayQty % 1;
  const whole = Math.floor(displayQty);

  if (decimal > 0 && fractionMap[Math.round(decimal * 100) / 100]) {
    const fraction = fractionMap[Math.round(decimal * 100) / 100];
    if (whole > 0) {
      return `${whole} ${fraction} ${unit}`;
    }
    return `${fraction} ${unit}`;
  }

  // Unit display names
  const unitDisplay = {
    g: 'g',
    kg: 'kg',
    oz: 'oz',
    lb: 'lb',
    ml: 'ml',
    l: 'L',
    tsp: 'tsp',
    tbsp: 'tbsp',
    cup: displayQty === 1 ? 'cup' : 'cups',
    pieces: displayQty === 1 ? 'piece' : 'pieces',
    cloves: displayQty === 1 ? 'clove' : 'cloves',
    stalks: displayQty === 1 ? 'stalk' : 'stalks',
    can: displayQty === 1 ? 'can' : 'cans'
  };

  return `${displayQty} ${unitDisplay[unit] || unit}`;
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
 * Handle unit dropdown change - re-render presets in new unit
 */
function handleUnitChange() {
  const newUnit = unitSelect.value;
  selectedUnit = newUnit;

  // Re-render presets in the new unit
  renderPresetsInUnit(newUnit);

  // Clear preset selection since values changed
  clearPresetSelection();

  // Update custom input state
  handleCustomInput();
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
