# pantry-planner

A local-first app I built to help me keep track of what's in my kitchen and figure out what to cook with it. Log ingredients, match them against recipes, plan meals for the week, and generate shopping lists for anything missing.

Built with vanilla JS + Vite, with optional Supabase sync if you want cloud backup.

## Features

- **Pantry tracking** — add ingredients by category, track quantities and expiry dates
- **Recipe matching** — scores recipes based on what you already have on hand, surfaces what's makeable now vs. what needs a few extra items
- **Meal planner** — drag meals onto a weekly calendar, mark them eaten, create leftovers
- **Shopping list** — auto-generated from your meal plan, checking off what's already in the pantry
- **Nutrition tracking** — optional daily macro/calorie goals with per-recipe breakdown
- **Ingredient browser** — searchable catalog organized by category
- **Import/export** — download your pantry as JSON, import it back later

## Stack

- Vanilla JS (no framework)
- Vite for dev/build
- GSAP for animations
- Supabase for optional auth + cloud sync (runs fine without it)

## Setup

```bash
git clone https://github.com/nemocake/pantry-planner.git
cd pantry-planner
npm install
npm run dev
```

Works out of the box in local-only mode. For cloud sync, copy `.env.example` to `.env.local` and add your Supabase credentials.

## Structure

```
src/
├── components/     UI components (cards, modals, renderers)
├── data/           ingredient catalog + recipe database (JSON)
├── lib/            supabase client config
├── modules/        core logic (pantry, recipes, matching, nutrition, meals)
├── services/       auth + sync orchestration
└── styles/         CSS
```

## License

MIT