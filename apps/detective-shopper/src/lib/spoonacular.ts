const SPOONACULAR_BASE = "https://api.spoonacular.com";

export type PantryRecipeMatch = {
  id: number;
  title: string;
  image: string | null;
  usedIngredientCount: number;
  missedIngredientCount: number;
  usedIngredients: string[];
  missedIngredients: string[];
};

export type RecipeDetails = {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  sourceUrl: string | null;
  summary: string | null;
  ingredients: string[];
  steps: string[];
};

export function isSpoonacularConfigured(): boolean {
  return Boolean(process.env.SPOONACULAR_API_KEY?.trim());
}

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing SPOONACULAR_API_KEY. Add it to .env.local or Vercel Environment Variables.",
    );
  }
  return key;
}

// Sample recipes so the page works without a Spoonacular key (upgrades to live
// results once SPOONACULAR_API_KEY is set), matching the app's demo fallback.
const DEMO_RECIPES: Array<{
  id: number;
  title: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  ingredients: string[];
  steps: string[];
}> = [
  {
    id: 9001,
    title: "One-Pan Chicken & Rice",
    readyInMinutes: 35,
    servings: 4,
    summary: "A quick weeknight skillet built from pantry staples.",
    ingredients: ["chicken breast", "rice", "onion", "garlic", "chicken broth", "olive oil", "salt", "pepper"],
    steps: [
      "Season the chicken with salt and pepper, then sear in olive oil until golden. Set aside.",
      "Sauté the onion and garlic until soft.",
      "Stir in the rice, then add the broth and bring to a simmer.",
      "Nestle the chicken back in, cover, and cook 20 minutes until the rice is tender.",
      "Rest a few minutes and serve.",
    ],
  },
  {
    id: 9002,
    title: "Veggie Fried Rice",
    readyInMinutes: 20,
    servings: 3,
    summary: "Turn leftover rice into a fast dinner.",
    ingredients: ["rice", "eggs", "onion", "peas", "soy sauce", "garlic", "sesame oil"],
    steps: [
      "Scramble the eggs and set aside.",
      "Sauté the onion, garlic, and peas until fragrant.",
      "Add cold rice and soy sauce; stir-fry over high heat.",
      "Fold the eggs back in and finish with a drizzle of sesame oil.",
    ],
  },
  {
    id: 9003,
    title: "Fluffy Onion Omelette",
    readyInMinutes: 10,
    servings: 1,
    summary: "A protein-rich breakfast from a few basics.",
    ingredients: ["eggs", "onion", "cheese", "butter", "salt", "pepper"],
    steps: [
      "Whisk the eggs with salt and pepper.",
      "Sauté the onion in butter until soft.",
      "Pour in the eggs and cook gently, pulling the edges in.",
      "Add cheese, fold, and serve.",
    ],
  },
  {
    id: 9004,
    title: "Garlic Butter Rice Bowl",
    readyInMinutes: 15,
    servings: 2,
    summary: "A simple, comforting base or side.",
    ingredients: ["rice", "garlic", "butter", "onion", "parsley", "salt"],
    steps: [
      "Cook the rice.",
      "Melt butter and sauté the garlic and onion until golden.",
      "Toss the rice through the garlic butter and season.",
      "Garnish with parsley and serve.",
    ],
  },
];

function demoMatches(pantryItems: string[]): PantryRecipeMatch[] {
  const set = new Set(normalizeIngredients(pantryItems));
  const scored = DEMO_RECIPES.map((recipe) => {
    const used = recipe.ingredients.filter((item) => set.has(item));
    const missed = recipe.ingredients.filter((item) => !set.has(item));
    return {
      id: recipe.id,
      title: recipe.title,
      image: null,
      usedIngredientCount: used.length,
      missedIngredientCount: missed.length,
      usedIngredients: used,
      missedIngredients: missed,
    };
  });
  const matched = scored.filter((recipe) => recipe.usedIngredientCount > 0);
  const list = matched.length > 0 ? matched : scored;
  return list.sort(
    (a, b) =>
      b.usedIngredientCount - a.usedIngredientCount ||
      a.missedIngredientCount - b.missedIngredientCount,
  );
}

function demoDetails(id: number): RecipeDetails {
  const recipe = DEMO_RECIPES.find((item) => item.id === id) ?? DEMO_RECIPES[0];
  return {
    id: recipe.id,
    title: recipe.title,
    image: null,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    sourceUrl: null,
    summary: recipe.summary,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}

function normalizeIngredients(items: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const raw of items) {
    const item = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!item || seen.has(item)) continue;
    seen.add(item);
    cleaned.push(item);
  }

  return cleaned;
}

export async function findRecipesByPantryItems(
  pantryItems: string[],
  number = 8,
): Promise<PantryRecipeMatch[]> {
  const ingredients = normalizeIngredients(pantryItems);

  if (ingredients.length === 0) {
    throw new Error("Add at least one pantry item to search.");
  }

  if (!isSpoonacularConfigured()) {
    return demoMatches(ingredients);
  }

  const url = new URL(`${SPOONACULAR_BASE}/recipes/findByIngredients`);
  url.searchParams.set("apiKey", getApiKey());
  url.searchParams.set("ingredients", ingredients.join(","));
  url.searchParams.set("number", String(number));
  url.searchParams.set("ranking", "2");
  url.searchParams.set("ignorePantry", "true");

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Spoonacular findByIngredients failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as Array<{
    id: number;
    title: string;
    image?: string;
    usedIngredientCount: number;
    missedIngredientCount: number;
    usedIngredients?: Array<{ name?: string; original?: string }>;
    missedIngredients?: Array<{ name?: string; original?: string }>;
  }>;

  return data.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image ?? null,
    usedIngredientCount: recipe.usedIngredientCount,
    missedIngredientCount: recipe.missedIngredientCount,
    usedIngredients: (recipe.usedIngredients ?? [])
      .map((item) => item.name ?? item.original ?? "")
      .filter(Boolean),
    missedIngredients: (recipe.missedIngredients ?? [])
      .map((item) => item.name ?? item.original ?? "")
      .filter(Boolean),
  }));
}

export async function getRecipeDetails(id: number): Promise<RecipeDetails> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid recipe id.");
  }

  if (!isSpoonacularConfigured()) {
    return demoDetails(id);
  }

  const url = new URL(`${SPOONACULAR_BASE}/recipes/${id}/information`);
  url.searchParams.set("apiKey", getApiKey());
  url.searchParams.set("includeNutrition", "false");

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Spoonacular recipe information failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    id: number;
    title: string;
    image?: string;
    readyInMinutes?: number;
    servings?: number;
    sourceUrl?: string;
    summary?: string;
    instructions?: string | null;
    extendedIngredients?: Array<{ original?: string }>;
    analyzedInstructions?: Array<{
      steps?: Array<{ number?: number; step?: string }>;
    }>;
  };

  const stepsFromAnalyzed =
    data.analyzedInstructions?.flatMap((block) =>
      (block.steps ?? [])
        .map((step) => step.step?.trim() ?? "")
        .filter(Boolean),
    ) ?? [];

  let steps = stepsFromAnalyzed;

  if (steps.length === 0 && data.instructions) {
    steps = data.instructions
      .replace(/<[^>]+>/g, "\n")
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\).\s-]*/, "").trim())
      .filter(Boolean);
  }

  return {
    id: data.id,
    title: data.title,
    image: data.image ?? null,
    readyInMinutes: data.readyInMinutes ?? null,
    servings: data.servings ?? null,
    sourceUrl: data.sourceUrl ?? null,
    summary: data.summary
      ? data.summary.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null,
    ingredients: (data.extendedIngredients ?? [])
      .map((item) => item.original?.trim() ?? "")
      .filter(Boolean),
    steps,
  };
}
