/**
 * Recipe Card Component
 * Renders recipe cards with match badges
 */

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

  const imageHtml = recipe.imageUrl
    ? `<img src="${recipe.imageUrl}" alt="${recipe.title}" class="recipe-card__image" loading="lazy">`
    : `<div class="recipe-card__image recipe-card__image--placeholder">${getMealEmoji(recipe.mealType)}</div>`;

  card.innerHTML = `
    ${imageHtml}
    <div class="recipe-card__content">
      <span class="recipe-card__match ${matchBadgeClass}">${matchBadgeText}</span>
      <h3 class="recipe-card__title">${recipe.title}</h3>
      <div class="recipe-card__meta">${totalTime} min · ${capitalize(recipe.difficulty)} · ${recipe.servings} servings</div>
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
    empty.className = 'recipe-loading';
    empty.innerHTML = '<p>No recipes found matching your criteria</p>';
    container.appendChild(empty);
    return;
  }

  recipes.forEach(recipe => {
    const card = createRecipeCard(recipe, onClick);
    container.appendChild(card);
  });
}

/**
 * Render recipe detail modal content
 */
export function renderRecipeDetail(recipe, container, pantryIds) {
  const { matchResult } = recipe;
  const totalTime = recipe.prepTime + recipe.cookTime;

  const ingredientsHtml = recipe.ingredients.map(ing => {
    const hasIt = pantryIds?.has(ing.ingredientId);
    let statusClass = ing.optional
      ? 'ingredient-status--optional'
      : (hasIt ? 'ingredient-status--have' : 'ingredient-status--missing');

    const quantityStr = ing.quantity ? `${ing.quantity} ${ing.unit}` : ing.unit;
    const optionalStr = ing.optional ? ' (optional)' : '';

    return `
      <li>
        <span class="ingredient-status ${statusClass}"></span>
        ${quantityStr} ${ing.name}${optionalStr}
      </li>
    `;
  }).join('');

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
        <span>👥 ${recipe.servings} servings</span>
      </div>
    </div>

    <p class="recipe-detail__description">${recipe.description}</p>

    <div class="recipe-detail__section">
      <h3>Ingredients (${matchResult?.requiredHave || 0}/${matchResult?.requiredCount || recipe.ingredients.length} available)</h3>
      <ul class="recipe-detail__ingredients">
        ${ingredientsHtml}
      </ul>
    </div>

    <div class="recipe-detail__section">
      <h3>Instructions</h3>
      <ol class="recipe-detail__instructions">
        ${instructionsHtml}
      </ol>
    </div>
  `;
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
  renderRecipeDetail
};
