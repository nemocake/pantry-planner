/**
 * Nutrition Calculator Module
 * Calculates nutritional information for recipes based on ingredient data
 */

// Unit conversion factors to grams
const UNIT_TO_GRAMS = {
  g: 1,
  kg: 1000,
  oz: 28.35,
  lb: 453.6,
  ml: 1, // Approximate for liquids (assumes water-like density)
  l: 1000,
  cup: 240, // Approximate
  tbsp: 15,
  tsp: 5,
  piece: 100, // Default estimate for "piece"
  clove: 5, // Garlic clove
  slice: 30, // Bread slice, etc.
  bunch: 100,
  sprig: 5,
  head: 500, // Head of lettuce/cabbage
  stalk: 50,
  can: 400, // Standard can size
  jar: 350,
  packet: 50,
  sheet: 5, // Nori sheet, etc.
  link: 75, // Sausage link
  fillet: 150,
  breast: 200,
  thigh: 120,
  whole: 1000, // Whole chicken, etc.
  serving: 100
};

/**
 * Convert quantity from any unit to grams
 * @param {number} quantity - Amount in original unit
 * @param {string} unit - Original unit
 * @returns {number} - Amount in grams
 */
function convertToGrams(quantity, unit) {
  const normalizedUnit = unit.toLowerCase().replace(/s$/, ''); // Remove trailing 's'
  const conversionFactor = UNIT_TO_GRAMS[normalizedUnit] || 100; // Default to 100g if unknown
  return quantity * conversionFactor;
}

/**
 * Calculate nutrition for a single ingredient
 * @param {Object} ingredient - Ingredient from recipe
 * @param {Object} ingredientData - Full ingredient data with nutrition info
 * @returns {Object} - Nutrition values for this ingredient
 */
function calculateIngredientNutrition(ingredient, ingredientData) {
  if (!ingredientData || !ingredientData.nutrition || !ingredientData.nutrition.per100g) {
    return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  }

  const nutrition = ingredientData.nutrition.per100g;
  const gramsUsed = convertToGrams(ingredient.quantity, ingredient.unit);
  const factor = gramsUsed / 100; // Nutrition data is per 100g

  return {
    calories: Math.round(nutrition.calories * factor),
    protein: Math.round(nutrition.protein * factor * 10) / 10,
    fat: Math.round(nutrition.fat * factor * 10) / 10,
    carbs: Math.round(nutrition.carbs * factor * 10) / 10,
    fiber: Math.round(nutrition.fiber * factor * 10) / 10
  };
}

/**
 * Calculate total nutrition for a recipe
 * @param {Object} recipe - Recipe object with ingredients array
 * @param {Map} ingredientsMap - Map of ingredient ID to ingredient data
 * @returns {Object} - Total nutrition and per-serving nutrition
 */
export function calculateRecipeNutrition(recipe, ingredientsMap) {
  const totalNutrition = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0
  };

  const ingredientBreakdown = [];

  for (const recipeIngredient of recipe.ingredients) {
    const ingredientData = ingredientsMap.get(recipeIngredient.ingredientId);
    const nutrition = calculateIngredientNutrition(recipeIngredient, ingredientData);

    totalNutrition.calories += nutrition.calories;
    totalNutrition.protein += nutrition.protein;
    totalNutrition.fat += nutrition.fat;
    totalNutrition.carbs += nutrition.carbs;
    totalNutrition.fiber += nutrition.fiber;

    if (ingredientData) {
      ingredientBreakdown.push({
        name: ingredientData.name,
        ...nutrition
      });
    }
  }

  // Calculate per serving
  const servings = recipe.servings || 1;
  const perServing = {
    calories: Math.round(totalNutrition.calories / servings),
    protein: Math.round(totalNutrition.protein / servings * 10) / 10,
    fat: Math.round(totalNutrition.fat / servings * 10) / 10,
    carbs: Math.round(totalNutrition.carbs / servings * 10) / 10,
    fiber: Math.round(totalNutrition.fiber / servings * 10) / 10
  };

  return {
    total: {
      calories: Math.round(totalNutrition.calories),
      protein: Math.round(totalNutrition.protein * 10) / 10,
      fat: Math.round(totalNutrition.fat * 10) / 10,
      carbs: Math.round(totalNutrition.carbs * 10) / 10,
      fiber: Math.round(totalNutrition.fiber * 10) / 10
    },
    perServing,
    servings,
    breakdown: ingredientBreakdown
  };
}

/**
 * Format nutrition for display
 * @param {Object} nutrition - Nutrition object with perServing data
 * @returns {string} - HTML string for nutrition display
 */
export function formatNutritionBadge(nutrition) {
  if (!nutrition || !nutrition.perServing) return '';

  const { calories, protein } = nutrition.perServing;
  return `${calories} cal | ${protein}g protein`;
}

/**
 * Generate detailed nutrition HTML for modal
 * @param {Object} nutrition - Full nutrition object
 * @returns {string} - HTML string for detailed nutrition display
 */
export function generateNutritionHTML(nutrition) {
  if (!nutrition || !nutrition.perServing) {
    return '<p class="nutrition-unavailable">Nutrition information unavailable</p>';
  }

  const { perServing, total, servings } = nutrition;

  return `
    <div class="nutrition-panel">
      <h4 class="nutrition-title">Nutrition Facts</h4>
      <p class="nutrition-serving">Per serving (${servings} servings total)</p>

      <div class="nutrition-grid">
        <div class="nutrition-item nutrition-item--calories">
          <span class="nutrition-value">${perServing.calories}</span>
          <span class="nutrition-label">Calories</span>
        </div>
        <div class="nutrition-item">
          <span class="nutrition-value">${perServing.protein}g</span>
          <span class="nutrition-label">Protein</span>
        </div>
        <div class="nutrition-item">
          <span class="nutrition-value">${perServing.carbs}g</span>
          <span class="nutrition-label">Carbs</span>
        </div>
        <div class="nutrition-item">
          <span class="nutrition-value">${perServing.fat}g</span>
          <span class="nutrition-label">Fat</span>
        </div>
        <div class="nutrition-item">
          <span class="nutrition-value">${perServing.fiber}g</span>
          <span class="nutrition-label">Fiber</span>
        </div>
      </div>

      <div class="nutrition-total">
        <span class="nutrition-total-label">Total recipe:</span>
        <span class="nutrition-total-value">${total.calories} cal</span>
      </div>
    </div>
  `;
}
