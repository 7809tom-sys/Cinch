"use server";

import {
  findRecipesByPantryItems,
  getRecipeDetails,
  type PantryRecipeMatch,
  type RecipeDetails,
} from "@/lib/spoonacular";

export type RecipeActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong talking to Spoonacular.";
}

export async function searchRecipesFromPantry(
  pantryItems: string[],
): Promise<RecipeActionResult<PantryRecipeMatch[]>> {
  try {
    const data = await findRecipesByPantryItems(pantryItems);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) };
  }
}

export async function loadRecipeInstructions(
  recipeId: number,
): Promise<RecipeActionResult<RecipeDetails>> {
  try {
    const data = await getRecipeDetails(recipeId);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) };
  }
}

export async function spoonacularConfigured(): Promise<boolean> {
  return Boolean(process.env.SPOONACULAR_API_KEY?.trim());
}
