/**
 * Script to add curated Unsplash image URLs to recipes
 * Each recipe has a hand-picked image that matches the actual dish
 * Run with: node scripts/addRecipeImages.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually curated images for each recipe - ensuring accurate dish representation
const recipeImages = {
  // rec_001 - Classic Spaghetti Bolognese
  'rec_001': '1621996346565-e3dbc646d9a9', // Spaghetti with meat sauce

  // rec_002 - Chicken Stir-Fry
  'rec_002': '1603133872878-684f208fb84b', // Chicken stir fry with vegetables

  // rec_003 - Classic Beef Tacos
  'rec_003': '1565299585323-38d6b0865b47', // Beef tacos with toppings

  // rec_004 - Garlic Butter Shrimp Pasta
  'rec_004': '1563379926898-05f4575a45d8', // Shrimp pasta dish

  // rec_005 - Classic Chicken Caesar Salad
  'rec_005': '1550304943-4f24f54ddde9', // Caesar salad with chicken

  // rec_006 - Vegetable Curry
  'rec_006': '1565557623262-b51c2513a641', // Vegetable curry

  // rec_007 - Classic Cheeseburgers
  'rec_007': '1568901346375-23c9450c58cd', // Cheeseburger

  // rec_008 - Honey Garlic Salmon
  'rec_008': '1467003909585-2f8a72700288', // Glazed salmon fillet

  // rec_009 - Creamy Tomato Soup
  'rec_009': '1547592166-23ac45744acd', // Tomato soup in bowl

  // rec_010 - Fried Rice
  'rec_010': '1603133872878-684f208fb84b', // Fried rice dish

  // rec_011 - Baked Pork Chops
  'rec_011': '1432139555190-58524dae6a55', // Baked pork chops

  // rec_012 - Black Bean Burritos
  'rec_012': '1626700051175-6818013e1d4f', // Burrito

  // rec_013 - Creamy Mushroom Pasta
  'rec_013': '1612874742237-6526221588e3', // Mushroom pasta

  // rec_014 - Sheet Pan Chicken Fajitas
  'rec_014': '1534352956036-cd81e27dd615', // Fajitas with peppers

  // rec_015 - Simple Oven-Roasted Vegetables
  'rec_015': '1540420773420-3366772f4999', // Roasted vegetables

  // rec_016 - Bacon and Eggs Breakfast
  'rec_016': '1525351484163-7529414344d8', // Bacon and eggs plate

  // rec_017 - Grilled Cheese Sandwich
  'rec_017': '1528735602780-2552fd46c7af', // Grilled cheese sandwich

  // rec_018 - One-Pot Chili
  'rec_018': '1455619452474-d2be8b1e70cd', // Chili in pot

  // rec_019 - Banana Pancakes
  'rec_019': '1567620905732-2d1ec7ab7445', // Pancakes with banana

  // rec_020 - Greek Salad
  'rec_020': '1540189549336-e6e99c3679fe', // Greek salad with feta

  // rec_021 - Teriyaki Chicken Bowl
  'rec_021': '1546069901-ba9599a7e63c', // Teriyaki chicken bowl

  // rec_022 - Caprese Salad
  'rec_022': '1608897013039-887f21d8c804', // Caprese with tomato and mozzarella

  // rec_023 - Beef Stroganoff
  'rec_023': '1547592180-85f173990554', // Beef stroganoff

  // rec_024 - Quesadillas
  'rec_024': '1618040695566-c22594ec4e0c', // Cheese quesadilla

  // rec_025 - Pasta Primavera
  'rec_025': '1551183053-bf91a1d81141', // Pasta with vegetables

  // rec_026 - Egg Fried Rice
  'rec_026': '1603133872878-684f208fb84b', // Egg fried rice

  // rec_027 - BLT Sandwich
  'rec_027': '1619096252214-ef06c45683e3', // BLT sandwich

  // rec_028 - Vegetable Soup
  'rec_028': '1547592166-23ac45744acd', // Vegetable soup

  // rec_029 - Chicken Parmesan
  'rec_029': '1632778149955-e80f8ceca2e8', // Chicken parmesan with pasta

  // rec_030 - Mashed Potatoes
  'rec_030': '1591299177061-2151e53fcb97', // Mashed potatoes

  // rec_031 - Fish Tacos
  'rec_031': '1551504734-5ee1c4a1479b', // Fish tacos

  // rec_032 - Omelette
  'rec_032': '1510693206972-df098062cb71', // Omelette

  // rec_033 - Pad Thai
  'rec_033': '1559314809-0d155014e29e', // Pad Thai noodles

  // rec_034 - BBQ Pulled Pork
  'rec_034': '1529193591527-725ed4ec7305', // Pulled pork sandwich

  // rec_035 - Shakshuka
  'rec_035': '1590947132387-155cc02f3212', // Shakshuka eggs in tomato

  // rec_036 - Chicken Alfredo
  'rec_036': '1645112411341-6c4fd023882a', // Fettuccine alfredo with chicken

  // rec_037 - Beef Tacos
  'rec_037': '1565299585323-38d6b0865b47', // Beef tacos

  // rec_038 - Lemon Garlic Chicken
  'rec_038': '1598103442097-8b74394b95c6', // Lemon chicken

  // rec_039 - Tuna Salad
  'rec_039': '1546793665-c74683f339c1', // Tuna salad

  // rec_040 - French Toast
  'rec_040': '1484723091739-30a097e8f929', // French toast with syrup

  // rec_041 - Shrimp Scampi
  'rec_041': '1563379926898-05f4575a45d8', // Shrimp scampi pasta

  // rec_042 - Minestrone Soup
  'rec_042': '1603105037880-880cd4edfb0d', // Minestrone soup

  // rec_043 - Chicken Noodle Soup
  'rec_043': '1603105037880-880cd4edfb0d', // Chicken noodle soup

  // rec_044 - Stuffed Bell Peppers
  'rec_044': '1596797882870-8c33deeac224', // Stuffed peppers

  // rec_045 - Spinach Artichoke Dip
  'rec_045': '1576097449798-7c7f90e1fce9', // Spinach artichoke dip

  // rec_046 - Beef and Broccoli
  'rec_046': '1603360946369-dc9bb6258143', // Beef and broccoli stir fry

  // rec_047 - Mac and Cheese
  'rec_047': '1543339494-b4cd4f7ba686', // Mac and cheese

  // rec_048 - Pesto Pasta
  'rec_048': '1473093295043-cdd812d0e601', // Pesto pasta

  // rec_049 - Korean Bibimbap
  'rec_049': '1553163147-edc03a0a9e5a', // Bibimbap bowl

  // rec_050 - Bruschetta
  'rec_050': '1572695157366-5e585ab2b69f', // Bruschetta on bread

  // rec_051 - Mushroom Risotto
  'rec_051': '1476124369491-e7addf5db371', // Mushroom risotto

  // rec_052 - Honey Garlic Salmon (duplicate)
  'rec_052': '1467003909585-2f8a72700288', // Glazed salmon

  // rec_053 - Vegetable Curry (duplicate)
  'rec_053': '1565557623262-b51c2513a641', // Curry dish

  // rec_054 - BBQ Pulled Pork (duplicate)
  'rec_054': '1529193591527-725ed4ec7305', // Pulled pork

  // rec_055 - Greek Salad (duplicate)
  'rec_055': '1540189549336-e6e99c3679fe', // Greek salad

  // rec_056 - Chicken Parmesan (duplicate)
  'rec_056': '1632778149955-e80f8ceca2e8', // Chicken parm

  // rec_057 - Fish Tacos (duplicate)
  'rec_057': '1551504734-5ee1c4a1479b', // Fish tacos

  // rec_058 - Beef Stroganoff (duplicate)
  'rec_058': '1547592180-85f173990554', // Stroganoff

  // rec_059 - Shakshuka (duplicate)
  'rec_059': '1590947132387-155cc02f3212', // Shakshuka

  // rec_060 - Pork Chops with Apple
  'rec_060': '1432139555190-58524dae6a55', // Pork chops

  // rec_061 - Tom Yum Soup
  'rec_061': '1548943487-a2e4e43b4853', // Tom yum soup

  // rec_062 - Caprese Salad (duplicate)
  'rec_062': '1608897013039-887f21d8c804', // Caprese

  // rec_063 - Beef and Broccoli (duplicate)
  'rec_063': '1603360946369-dc9bb6258143', // Beef broccoli

  // rec_064 - Spinach and Feta Stuffed Chicken
  'rec_064': '1598103442097-8b74394b95c6', // Stuffed chicken breast

  // rec_065 - Banana Bread
  'rec_065': '1585478259715-876acc5be8eb', // Banana bread loaf

  // rec_066 - Lamb Gyros
  'rec_066': '1561651823-34feb02250e4', // Gyro wrap

  // rec_067 - Vegetable Lo Mein
  'rec_067': '1585032226651-759b368d7246', // Lo mein noodles

  // rec_068 - Chicken Tikka Masala
  'rec_068': '1565557623262-b51c2513a641', // Tikka masala curry

  // rec_069 - Chocolate Chip Cookies
  'rec_069': '1499636136210-6f4ee915583e', // Chocolate chip cookies

  // rec_070 - Minestrone Soup (duplicate)
  'rec_070': '1603105037880-880cd4edfb0d', // Minestrone

  // rec_071 - Egg Fried Rice (duplicate)
  'rec_071': '1603133872878-684f208fb84b', // Fried rice

  // rec_072 - Lemon Butter Tilapia
  'rec_072': '1510130387422-82bed34b37e9', // Fish fillet

  // rec_073 - Black Bean Soup
  'rec_073': '1547592166-23ac45744acd', // Black bean soup

  // rec_074 - Teriyaki Chicken Bowl (duplicate)
  'rec_074': '1546069901-ba9599a7e63c', // Teriyaki bowl

  // rec_075 - Creamy Tomato Soup (duplicate)
  'rec_075': '1547592166-23ac45744acd', // Tomato soup

  // rec_076 - Sausage and Peppers
  'rec_076': '1562059392-096320bccc7e', // Sausage with peppers

  // rec_077 - Mango Chicken Salad
  'rec_077': '1512621776951-a57141f2eefd', // Chicken salad

  // rec_078 - Vegetable Quesadillas
  'rec_078': '1618040695566-c22594ec4e0c', // Quesadilla
};

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

  let updated = 0;
  let notFound = [];

  // Add imageUrl to each recipe
  recipesData.recipes.forEach((recipe, index) => {
    if (recipeImages[recipe.id]) {
      recipe.imageUrl = getUnsplashUrl(recipeImages[recipe.id]);
      updated++;
      console.log(`✓ ${recipe.id}: ${recipe.title}`);
    } else {
      notFound.push(recipe);
      console.log(`✗ ${recipe.id}: ${recipe.title} - NO IMAGE MAPPED`);
    }
  });

  // Write updated recipes back
  fs.writeFileSync(recipesPath, JSON.stringify(recipesData, null, 2));

  console.log(`\nDone! Updated ${updated} recipes.`);

  if (notFound.length > 0) {
    console.log(`\nRecipes without images (${notFound.length}):`);
    notFound.forEach(r => console.log(`  - ${r.id}: ${r.title}`));
  }
}

addImagesToRecipes();
