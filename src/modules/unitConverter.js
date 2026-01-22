/**
 * Unit Converter Module
 * Handles unit conversions for ingredient quantities
 */

// Define unit type groups with conversion ratios to base unit
const UNIT_TYPES = {
  weight: {
    baseUnit: 'g',
    conversions: {
      g: 1,
      kg: 1000,
      oz: 28.3495,
      lb: 453.592
    }
  },
  volume: {
    baseUnit: 'ml',
    conversions: {
      ml: 1,
      l: 1000,
      tsp: 4.92892,
      tbsp: 14.7868,
      cup: 236.588,
      cups: 236.588
    }
  },
  count: {
    baseUnit: 'pieces',
    conversions: {
      pieces: 1,
      piece: 1,
      cloves: 1,
      clove: 1,
      stalks: 1,
      stalk: 1,
      heads: 1,
      head: 1,
      can: 1,
      cans: 1,
      slices: 1,
      slice: 1
    }
  }
};

// Build reverse map: unit -> type
const UNIT_TYPE_MAP = {};
Object.entries(UNIT_TYPES).forEach(([type, config]) => {
  Object.keys(config.conversions).forEach(unit => {
    UNIT_TYPE_MAP[unit.toLowerCase()] = type;
  });
});

/**
 * Normalize unit string (lowercase, handle plurals)
 */
function normalizeUnit(unit) {
  if (!unit) return null;
  let normalized = unit.toLowerCase().trim();

  // Handle common plural forms
  const pluralMap = {
    'grams': 'g',
    'kilograms': 'kg',
    'ounces': 'oz',
    'pounds': 'lb',
    'tablespoons': 'tbsp',
    'tablespoon': 'tbsp',
    'teaspoons': 'tsp',
    'teaspoon': 'tsp',
    'liters': 'l',
    'liter': 'l',
    'milliliters': 'ml',
    'milliliter': 'ml'
  };

  if (pluralMap[normalized]) {
    normalized = pluralMap[normalized];
  }

  return normalized;
}

/**
 * Get the unit type for a given unit
 * @param {string} unit - The unit to check
 * @returns {'weight'|'volume'|'count'|null} The unit type or null if unknown
 */
export function getUnitType(unit) {
  const normalized = normalizeUnit(unit);
  if (!normalized) return null;
  return UNIT_TYPE_MAP[normalized] || null;
}

/**
 * Check if two units are compatible (same type)
 * @param {string} unit1 - First unit
 * @param {string} unit2 - Second unit
 * @returns {boolean} True if units can be converted between
 */
export function areUnitsCompatible(unit1, unit2) {
  const type1 = getUnitType(unit1);
  const type2 = getUnitType(unit2);

  if (!type1 || !type2) return false;
  return type1 === type2;
}

/**
 * Convert quantity from one unit to another
 * @param {number} quantity - The amount to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number|null} Converted quantity or null if incompatible
 */
export function convertQuantity(quantity, fromUnit, toUnit) {
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);

  if (!normalizedFrom || !normalizedTo) return null;

  const fromType = UNIT_TYPE_MAP[normalizedFrom];
  const toType = UNIT_TYPE_MAP[normalizedTo];

  if (!fromType || !toType || fromType !== toType) return null;

  const typeConfig = UNIT_TYPES[fromType];
  const fromRatio = typeConfig.conversions[normalizedFrom];
  const toRatio = typeConfig.conversions[normalizedTo];

  if (!fromRatio || !toRatio) return null;

  // Convert to base unit, then to target unit
  const inBaseUnit = quantity * fromRatio;
  const converted = inBaseUnit / toRatio;

  // Round to reasonable precision
  return Math.round(converted * 1000) / 1000;
}

/**
 * Convert quantity to base unit of its type
 * @param {number} quantity - The amount to convert
 * @param {string} unit - The unit
 * @returns {{value: number, baseUnit: string}|null} Value in base unit or null
 */
export function toBaseUnit(quantity, unit) {
  const normalized = normalizeUnit(unit);
  if (!normalized) return null;

  const unitType = UNIT_TYPE_MAP[normalized];
  if (!unitType) return null;

  const typeConfig = UNIT_TYPES[unitType];
  const ratio = typeConfig.conversions[normalized];

  if (!ratio) return null;

  return {
    value: quantity * ratio,
    baseUnit: typeConfig.baseUnit
  };
}

/**
 * Check if pantry quantity is sufficient for a recipe requirement
 * @param {number} pantryQty - Quantity in pantry
 * @param {string} pantryUnit - Unit of pantry item
 * @param {number} neededQty - Quantity needed by recipe
 * @param {string} neededUnit - Unit required by recipe
 * @returns {boolean} True if sufficient (or incompatible units - falls back to true)
 */
export function isSufficient(pantryQty, pantryUnit, neededQty, neededUnit) {
  // If units are incompatible, fall back to binary check (has ingredient)
  if (!areUnitsCompatible(pantryUnit, neededUnit)) {
    return true; // Can't compare, assume sufficient if ingredient exists
  }

  // Convert pantry quantity to recipe's unit
  const convertedPantry = convertQuantity(pantryQty, pantryUnit, neededUnit);

  if (convertedPantry === null) {
    return true; // Conversion failed, assume sufficient
  }

  return convertedPantry >= neededQty;
}

/**
 * Calculate how much is missing to meet a requirement
 * @param {number} pantryQty - Quantity in pantry
 * @param {string} pantryUnit - Unit of pantry item
 * @param {number} neededQty - Quantity needed
 * @param {string} neededUnit - Unit required
 * @returns {{missing: number, unit: string}|null} Missing amount or null if sufficient/incompatible
 */
export function getMissingQuantity(pantryQty, pantryUnit, neededQty, neededUnit) {
  if (!areUnitsCompatible(pantryUnit, neededUnit)) {
    return null; // Can't calculate
  }

  const convertedPantry = convertQuantity(pantryQty, pantryUnit, neededUnit);

  if (convertedPantry === null || convertedPantry >= neededQty) {
    return null; // Sufficient or can't convert
  }

  return {
    missing: Math.round((neededQty - convertedPantry) * 100) / 100,
    unit: neededUnit
  };
}

/**
 * Get all units for a given type
 * @param {string} unitType - 'weight', 'volume', or 'count'
 * @returns {string[]} Array of unit names
 */
export function getUnitsForType(unitType) {
  const typeConfig = UNIT_TYPES[unitType];
  if (!typeConfig) return [];

  // Return unique main units (not plurals)
  const mainUnits = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pieces', 'cloves', 'stalks', 'can'];
  return mainUnits.filter(u => UNIT_TYPE_MAP[u] === unitType);
}

/**
 * Get compatible units for a given unit
 * @param {string} unit - The unit to find compatibles for
 * @returns {string[]} Array of compatible unit names
 */
export function getCompatibleUnits(unit) {
  const unitType = getUnitType(unit);
  if (!unitType) return [unit]; // Return original if unknown
  return getUnitsForType(unitType);
}

export default {
  getUnitType,
  areUnitsCompatible,
  convertQuantity,
  toBaseUnit,
  isSufficient,
  getMissingQuantity,
  getUnitsForType,
  getCompatibleUnits
};
