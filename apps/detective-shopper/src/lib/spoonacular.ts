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

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing SPOONACULAR_API_KEY. Add it to .env.local or Vercel Environment Variables.",
    );
  }
  return key;
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
