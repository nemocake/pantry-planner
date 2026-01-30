/**
 * Recipe Card Component
 * Renders recipe cards with match badges and nutrition info
 */

import { calculateRecipeNutrition, formatNutritionBadge, generateNutritionHTML } from '../modules/nutritionCalculator.js';
import { getIngredientsMap } from '../modules/ingredientManager.js';

// Callback for adding to meal plan
let onAddToMealPlanCallback = null;

/**
 * Set callback for adding recipes to meal plan
 */
export function setAddToMealPlanCallback(callback) {
  onAddToMealPlanCallback = callback;
}

/**
 * Get cuisine emoji
 */
function getCuisineEmoji(cuisine) {
  const emojis = {
    italian: '🇮🇹',
    mexican: '🇲🇽',
    asian: '🥢',
    american: '🇺🇸',
    mediterranean: '🫒',
    indian: '🇮🇳',
    french: '🇫🇷',
    japanese: '🇯🇵',
    chinese: '🇨🇳',
    thai: '🇹🇭',
    greek: '🇬🇷',
    spanish: '🇪🇸',
    korean: '🇰🇷'
  };
  return emojis[cuisine] || '🍽️';
}

/**
 * Get meal type emoji for placeholder
 */
function getMealEmoji(mealType) {
  const emojis = {
    breakfast: '🍳',
    lunch: '🥪',
    dinner: '🍽️',
    snack: '🍿',
    dessert: '🍰',
    appetizer: '🥗'
  };
  return emojis[mealType] || '🍲';
}

/**
 * Create a recipe card HTML element
 */
export function createRecipeCard(recipe, onClick) {
  const { matchResult } = recipe;
  const totalTime = recipe.prepTime + recipe.cookTime;

  const card = document.createElement('div');
  card.className = 'recipe-card';
  card.dataset.recipeId = recipe.id;
  card.dataset.speed = (1 + Math.random() * 0.12).toFixed(2);

  // Match badge text and class
  let matchBadgeClass = '';
  let matchBadgeText = '';

  switch (matchResult?.matchType) {
    case 'full':
      matchBadgeClass = 'recipe-card__match--full';
      matchBadgeText = '100% Match';
      break;
    case 'partial':
      matchBadgeClass = 'recipe-card__match--partial';
      matchBadgeText = `${matchResult.requiredPercent}% Match`;
      break;
    case 'minimal':
      matchBadgeClass = 'recipe-card__match--minimal';
      matchBadgeText = `${matchResult.requiredPercent}% Match`;
      break;
    default:
      matchBadgeClass = 'recipe-card__match--none';
      matchBadgeText = `${matchResult?.requiredPercent || 0}% Match`;
  }

  const imageBackground = recipe.imageUrl
    ? `background-image: url('${recipe.imageUrl}')`
    : '';

  const imagePlaceholder = !recipe.imageUrl
    ? `<span class="recipe-card__placeholder">${getMealEmoji(recipe.mealType)}</span>`
    : '';

  // Calculate nutrition
  const ingredientsMap = getIngredientsMap();
  const nutrition = calculateRecipeNutrition(recipe, ingredientsMap);
  const nutritionBadge = formatNutritionBadge(nutrition);

  card.innerHTML = `
    <div class="recipe-card__image ${!recipe.imageUrl ? 'recipe-card__image--placeholder' : ''}" style="${imageBackground}">
      ${imagePlaceholder}
      <div class="recipe-card__overlay">
        <span class="recipe-card__view-btn">View Recipe</span>
      </div>
    </div>
    <div class="recipe-card__content">
      <span class="recipe-card__match ${matchBadgeClass}">${matchBadgeText}</span>
      <h3 class="recipe-card__title">${recipe.title}</h3>
      <div class="recipe-card__meta">${totalTime} min · ${capitalize(recipe.difficulty)} · ${recipe.servings} servings</div>
      <div class="recipe-card__nutrition">${nutritionBadge}</div>
      <span class="recipe-card__cuisine">${getCuisineEmoji(recipe.cuisine)} ${capitalize(recipe.cuisine)}</span>
    </div>
  `;

  if (onClick) {
    card.addEventListener('click', () => onClick(recipe));
  }

  return card;
}

/**
 * Render recipe grid
 */
export function renderRecipeGrid(recipes, container, onClick) {
  container.innerHTML = '';

  if (recipes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `
      <div class="empty-state__icon">🍳</div>
      <h3 class="empty-state__title">No recipes found</h3>
      <p class="empty-state__text">Try adjusting your filters or add more ingredients to your pantry</p>
    `;
    container.appendChild(empty);
    return;
  }

  recipes.forEach(recipe => {
    const card = createRecipeCard(recipe, onClick);
    container.appendChild(card);
  });
}

/**
 * Format quantity for display (handles fractions)
 */
function formatQuantity(qty) {
  if (!qty || qty === 0) return '';
  if (qty === Math.floor(qty)) return qty.toString();

  // Common fractions
  if (Math.abs(qty - 0.25) < 0.01) return '¼';
  if (Math.abs(qty - 0.5) < 0.01) return '½';
  if (Math.abs(qty - 0.75) < 0.01) return '¾';
  if (Math.abs(qty - 0.33) < 0.05) return '⅓';
  if (Math.abs(qty - 0.67) < 0.05) return '⅔';
  if (Math.abs(qty - 1.5) < 0.01) return '1½';
  if (Math.abs(qty - 2.5) < 0.01) return '2½';

  // Mixed numbers
  const whole = Math.floor(qty);
  const frac = qty - whole;
  if (whole > 0 && frac > 0.1) {
    if (Math.abs(frac - 0.25) < 0.05) return `${whole}¼`;
    if (Math.abs(frac - 0.5) < 0.05) return `${whole}½`;
    if (Math.abs(frac - 0.75) < 0.05) return `${whole}¾`;
    if (Math.abs(frac - 0.33) < 0.08) return `${whole}⅓`;
    if (Math.abs(frac - 0.67) < 0.08) return `${whole}⅔`;
  }

  // Fall back to decimal
  return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
}

/**
 * Generate ingredients HTML with scaled quantities
 */
function generateIngredientsHtml(recipe, servings, pantryIds) {
  const ingredientsMap = getIngredientsMap();
  const scaleFactor = servings / recipe.servings;

  return recipe.ingredients.map(ing => {
    const hasIt = pantryIds?.has(ing.ingredientId);
    let statusClass = ing.optional
      ? 'ingredient-status--optional'
      : (hasIt ? 'ingredient-status--have' : 'ingredient-status--missing');

    const scaledQty = ing.quantity ? ing.quantity * scaleFactor : 0;
    const quantityStr = scaledQty ? `${formatQuantity(scaledQty)} ${ing.unit}` : ing.unit;
    const optionalStr = ing.optional ? ' (optional)' : '';

    // Get ingredient name from ingredients map, fallback to ing.name if provided
    const ingredientData = ingredientsMap.get(ing.ingredientId);
    const ingredientName = ingredientData?.name || ing.name || 'Unknown ingredient';

    return `
      <li>
        <span class="ingredient-status ${statusClass}"></span>
        ${quantityStr} ${ingredientName}${optionalStr}
      </li>
    `;
  }).join('');
}

/**
 * Generate scaled nutrition HTML
 */
function generateScaledNutritionHtml(recipe, servings) {
  const ingredientsMap = getIngredientsMap();
  const baseNutrition = calculateRecipeNutrition(recipe, ingredientsMap);

  if (!baseNutrition || !baseNutrition.total) {
    return '<p class="nutrition-unavailable">Nutrition information unavailable</p>';
  }

  // Scale from total recipe nutrition to new servings
  const scaleFactor = servings / recipe.servings;

  // Create properly structured nutrition object for generateNutritionHTML
  const scaledNutrition = {
    perServing: {
      calories: Math.round(baseNutrition.perServing.calories * scaleFactor),
      protein: Math.round(baseNutrition.perServing.protein * scaleFactor * 10) / 10,
      carbs: Math.round(baseNutrition.perServing.carbs * scaleFactor * 10) / 10,
      fat: Math.round(baseNutrition.perServing.fat * scaleFactor * 10) / 10,
      fiber: Math.round(baseNutrition.perServing.fiber * scaleFactor * 10) / 10
    },
    total: {
      calories: Math.round(baseNutrition.total.calories * scaleFactor),
      protein: Math.round(baseNutrition.total.protein * scaleFactor * 10) / 10,
      carbs: Math.round(baseNutrition.total.carbs * scaleFactor * 10) / 10,
      fat: Math.round(baseNutrition.total.fat * scaleFactor * 10) / 10,
      fiber: Math.round(baseNutrition.total.fiber * scaleFactor * 10) / 10
    },
    servings: servings
  };

  return generateNutritionHTML(scaledNutrition);
}

/**
 * Render recipe detail modal content
 */
export function renderRecipeDetail(recipe, container, pantryIds) {
  const { matchResult } = recipe;
  const totalTime = recipe.prepTime + recipe.cookTime;

  // Track current servings
  let currentServings = recipe.servings;

  // Calculate initial nutrition
  const ingredientsMap = getIngredientsMap();
  const nutrition = calculateRecipeNutrition(recipe, ingredientsMap);
  const nutritionHtml = generateNutritionHTML(nutrition);

  const ingredientsHtml = generateIngredientsHtml(recipe, currentServings, pantryIds);

  const instructionsHtml = recipe.instructions
    .map(inst => `<li>${inst.text}</li>`)
    .join('');

  container.innerHTML = `
    <div class="recipe-detail__header">
      <h2 class="recipe-detail__title">${recipe.title}</h2>
      <div class="recipe-detail__meta">
        <span>${getCuisineEmoji(recipe.cuisine)} ${capitalize(recipe.cuisine)}</span>
        <span>⏱️ ${totalTime} min</span>
        <span>📊 ${capitalize(recipe.difficulty)}</span>
      </div>
    </div>

    <p class="recipe-detail__description">${recipe.description}</p>

    <!-- Servings Adjuster -->
    <div class="servings-adjuster">
      <span class="servings-adjuster__label">Servings:</span>
      <div class="servings-adjuster__controls">
        <button class="servings-adjuster__btn" id="decreaseServings" aria-label="Decrease servings">−</button>
        <span class="servings-adjuster__value" id="currentServings">${currentServings}</span>
        <button class="servings-adjuster__btn" id="increaseServings" aria-label="Increase servings">+</button>
      </div>
      <span class="servings-adjuster__original">(Original: ${recipe.servings})</span>
    </div>

    <div id="nutritionContainer">
      ${nutritionHtml}
    </div>

    <div class="recipe-detail__section">
      <h3>Ingredients (${matchResult?.requiredHave || 0}/${matchResult?.requiredCount || recipe.ingredients.length} available)</h3>
      <ul class="recipe-detail__ingredients" id="ingredientsList">
        ${ingredientsHtml}
      </ul>
    </div>

    <div class="recipe-detail__section">
      <h3>Instructions</h3>
      <ol class="recipe-detail__instructions">
        ${instructionsHtml}
      </ol>
    </div>

    <div class="recipe-detail__actions">
      <button class="btn btn--primary" id="addToMealPlanBtn">
        <span class="btn__icon">📅</span> Add to Meal Plan
      </button>
    </div>
  `;

  // Servings adjustment handlers
  const servingsDisplay = container.querySelector('#currentServings');
  const ingredientsList = container.querySelector('#ingredientsList');
  const nutritionContainer = container.querySelector('#nutritionContainer');
  const decreaseBtn = container.querySelector('#decreaseServings');
  const increaseBtn = container.querySelector('#increaseServings');

  function updateServings(newServings) {
    if (newServings < 1 || newServings > 99) return;
    currentServings = newServings;
    servingsDisplay.textContent = currentServings;
    ingredientsList.innerHTML = generateIngredientsHtml(recipe, currentServings, pantryIds);
    nutritionContainer.innerHTML = generateScaledNutritionHtml(recipe, currentServings);
  }

  decreaseBtn?.addEventListener('click', () => updateServings(currentServings - 1));
  increaseBtn?.addEventListener('click', () => updateServings(currentServings + 1));

  // Add click handler for "Add to Meal Plan" button
  const addBtn = container.querySelector('#addToMealPlanBtn');
  if (addBtn && onAddToMealPlanCallback) {
    addBtn.addEventListener('click', () => {
      onAddToMealPlanCallback(recipe, currentServings);
    });
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default {
  createRecipeCard,
  renderRecipeGrid,
  renderRecipeDetail,
  setAddToMealPlanCallback
};
