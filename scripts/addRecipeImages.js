/**
 * Script to add Unsplash image URLs to recipes
 * Run with: node scripts/addRecipeImages.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Curated Unsplash image IDs for different dish types
const dishImages = {
  // Pasta dishes
  'spaghetti': '1621996346565-e3dbc646d9a9',
  'pasta': '1563379926898-05f4575a45d8',
  'alfredo': '1645112411341-6c4fd023882a',
  'pesto': '1473093295043-cdd812d0e601',
  'shrimp pasta': '1563379926898-05f4575a45d8',
  'mushroom pasta': '1612874742237-6526221588e3',
  'primavera': '1551183053-bf91a1d81141',
  'carbonara': '1612874742237-6526221588e3',

  // Asian dishes
  'stir-fry': '1512058564366-18510be2db19',
  'stir fry': '1512058564366-18510be2db19',
  'fried rice': '1603133872878-684f208fb84b',
  'teriyaki': '1546069901-ba9599a7e63c',
  'pad thai': '1559314809-0d155014e29e',
  'bibimbap': '1553163147-edc03a0a9e5a',
  'lo mein': '1585032226651-759b368d7246',
  'ramen': '1569718212165-3a8922ada9c9',

  // Mexican dishes
  'tacos': '1565299585323-38d6b0865b47',
  'burrito': '1626700051175-6818013e1d4f',
  'quesadilla': '1618040695566-c22594ec4e0c',
  'fajita': '1534352956036-cd81e27dd615',
  'enchilada': '1534352956036-cd81e27dd615',

  // American classics
  'burger': '1568901346375-23c9450c58cd',
  'cheeseburger': '1568901346375-23c9450c58cd',
  'sandwich': '1528735602780-2552fd46c7af',
  'grilled cheese': '1528735602780-2552fd46c7af',
  'blt': '1619096252214-ef06c45683e3',
  'hot dog': '1496116218417-1a781b1c416c',

  // Chicken dishes
  'chicken': '1598103442097-8b74394b95c6',
  'chicken parmesan': '1632778149955-e80f8ceca2e8',
  'chicken breast': '1598103442097-8b74394b95c6',
  'fried chicken': '1626645738196-c2a98d8a27b9',
  'chicken salad': '1546793665-c74683f339c1',
  'tikka masala': '1565557623262-b51c2513a641',

  // Beef dishes
  'beef': '1546833999-b9f581a1996d',
  'steak': '1600891964092-4316c288032e',
  'stroganoff': '1547592180-85f173990554',
  'meatloaf': '1544025162-d76694265947',
  'beef broccoli': '1603360946369-dc9bb6258143',

  // Pork dishes
  'pork': '1432139555190-58524dae6a55',
  'pork chop': '1432139555190-58524dae6a55',
  'pulled pork': '1529193591527-725ed4ec7305',
  'bacon': '1528607929212-2636ec44253e',
  'sausage': '1562059392-096320bccc7e',

  // Seafood
  'salmon': '1467003909585-2f8a72700288',
  'shrimp': '1565680018434-b513d5e5fd47',
  'fish': '1510130387422-82bed34b37e9',
  'tilapia': '1510130387422-82bed34b37e9',
  'tuna': '1546833999-b9f581a1996d',
  'scampi': '1563379926898-05f4575a45d8',

  // Soups
  'soup': '1547592166-23ac45744acd',
  'tomato soup': '1547592166-23ac45744acd',
  'chicken soup': '1603105037880-880cd4edfb0d',
  'vegetable soup': '1547592166-23ac45744acd',
  'chili': '1455619452474-d2be8b1e70cd',
  'minestrone': '1547592166-23ac45744acd',
  'tom yum': '1548943487-a2e4e43b4853',

  // Salads
  'salad': '1512621776951-a57141f2eefd',
  'caesar salad': '1550304943-4f24f54ddde9',
  'greek salad': '1540189549336-e6e99c3679fe',
  'caprese': '1608897013039-887f21d8c804',

  // Breakfast
  'breakfast': '1533089860892-a7c6f0a88666',
  'eggs': '1525351484163-7529414344d8',
  'omelette': '1510693206972-df098062cb71',
  'pancake': '1567620905732-2d1ec7ab7445',
  'french toast': '1484723091739-30a097e8f929',
  'bacon and eggs': '1525351484163-7529414344d8',

  // Italian
  'bruschetta': '1572695157366-5e585ab2b69f',
  'risotto': '1476124369491-e7addf5db371',
  'lasagna': '1574894709920-11b28e7367e3',

  // Indian
  'curry': '1565557623262-b51c2513a641',
  'tikka': '1565557623262-b51c2513a641',
  'masala': '1565557623262-b51c2513a641',
  'naan': '1565557623262-b51c2513a641',

  // Mediterranean/Greek
  'gyros': '1561651823-34feb02250e4',
  'falafel': '1593001874328-c1ffea7cfdc3',
  'shakshuka': '1590947132387-155cc02f3212',
  'hummus': '1577805947252-ed58fbbbdefc',

  // Sides & Snacks
  'mashed potatoes': '1591299177061-2151e53fcb97',
  'fries': '1630384060421-cb20acd8e40e',
  'vegetables': '1540420773420-3366772f4999',
  'roasted vegetables': '1540420773420-3366772f4999',
  'stuffed peppers': '1596797882870-8c33deeac224',
  'dip': '1576097449798-7c7f90e1fce9',

  // Baked goods & Desserts
  'bread': '1509440159562-5b4ed3e7e6c2',
  'banana bread': '1585478259715-876acc5be8eb',
  'cookies': '1499636136210-6f4ee915583e',
  'cake': '1578985545062-69928b1d9587',
  'pie': '1535920527002-b35e96722eb9',

  // Default by cuisine
  'italian': '1498579150354-977475b7ea0b',
  'mexican': '1565299585323-38d6b0865b47',
  'asian': '1512058564366-18510be2db19',
  'chinese': '1585032226651-759b368d7246',
  'japanese': '1553621042-f6e147245754',
  'korean': '1553163147-edc03a0a9e5a',
  'thai': '1562565652-a0d8f0c59eb4',
  'indian': '1565557623262-b51c2513a641',
  'mediterranean': '1540189549336-e6e99c3679fe',
  'greek': '1540189549336-e6e99c3679fe',
  'french': '1504674900247-0877df9cc836',
  'american': '1546793665-c74683f339c1',
};

// Function to find best matching image ID for a recipe
function findImageId(title, cuisine) {
  const lowerTitle = title.toLowerCase();
  const lowerCuisine = cuisine.toLowerCase();

  // First, check for specific dish matches in title
  for (const [keyword, imageId] of Object.entries(dishImages)) {
    if (lowerTitle.includes(keyword)) {
      return imageId;
    }
  }

  // Fall back to cuisine-based image
  if (dishImages[lowerCuisine]) {
    return dishImages[lowerCuisine];
  }

  // Ultimate fallback - generic food image
  return '1504674900247-0877df9cc836';
}

// Generate Unsplash URL from image ID
function getUnsplashUrl(imageId) {
  return `https://images.unsplash.com/photo-${imageId}?w=400&h=300&fit=crop&q=80`;
}

// Main function
async function addImagesToRecipes() {
  const recipesPath = path.join(__dirname, '../src/data/recipes.json');

  // Read recipes file
  const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));

  console.log(`Processing ${recipesData.recipes.length} recipes...`);

  // Add imageUrl to each recipe
  recipesData.recipes.forEach((recipe, index) => {
    const imageId = findImageId(recipe.title, recipe.cuisine);
    recipe.imageUrl = getUnsplashUrl(imageId);
    console.log(`${index + 1}. ${recipe.title} -> ${recipe.imageUrl.substring(0, 60)}...`);
  });

  // Write updated recipes back
  fs.writeFileSync(recipesPath, JSON.stringify(recipesData, null, 2));

  console.log(`\nDone! Added images to ${recipesData.recipes.length} recipes.`);
}

addImagesToRecipes();
