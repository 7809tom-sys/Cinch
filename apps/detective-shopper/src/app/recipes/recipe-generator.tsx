"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  loadRecipeInstructions,
  searchRecipesFromPantry,
} from "./actions";
import type { PantryRecipeMatch, RecipeDetails } from "@/lib/spoonacular";

const SAMPLE_PANTRY = [
  "chicken breast",
  "rice",
  "garlic",
  "onion",
  "olive oil",
  "lemon",
  "spinach",
];

type Props = {
  apiConfigured: boolean;
};

export function RecipeGenerator({ apiConfigured }: Props) {
  const [draft, setDraft] = useState("");
  const [pantry, setPantry] = useState<string[]>(SAMPLE_PANTRY.slice(0, 4));
  const [recipes, setRecipes] = useState<PantryRecipeMatch[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<RecipeDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSearch, startSearch] = useTransition();
  const [pendingDetails, startDetails] = useTransition();

  function addItems(raw: string) {
    const pieces = raw
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (pieces.length === 0) return;

    setPantry((current) => {
      const seen = new Set(current.map((item) => item.toLowerCase()));
      const next = [...current];
      for (const piece of pieces) {
        const key = piece.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(piece);
      }
      return next;
    });
    setDraft("");
  }

  function removeItem(item: string) {
    setPantry((current) => current.filter((value) => value !== item));
  }

  function runSearch() {
    setError(null);
    setDetails(null);
    setSelectedId(null);
    startSearch(async () => {
      const result = await searchRecipesFromPantry(pantry);
      if (!result.ok) {
        setRecipes([]);
        setError(result.error);
        return;
      }
      setRecipes(result.data);
      if (result.data.length === 0) {
        setError("No recipes matched those pantry items. Try adding a few staples.");
      }
    });
  }

  function openRecipe(id: number) {
    setSelectedId(id);
    setError(null);
    startDetails(async () => {
      const result = await loadRecipeInstructions(id);
      if (!result.ok) {
        setDetails(null);
        setError(result.error);
        return;
      }
      setDetails(result.data);
    });
  }

  return (
    <div className="space-y-10">
      {!apiConfigured ? (
        <div className="border border-brand/40 bg-brand/10 px-5 py-4 text-sm leading-relaxed text-foam">
          Set <code className="text-brand">SPOONACULAR_API_KEY</code> in{" "}
          <code className="text-brand">.env.local</code> (or Vercel Environment
          Variables), then restart the server. Get a key at{" "}
          <a
            href="https://spoonacular.com/food-api"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            spoonacular.com/food-api
          </a>
          .
        </div>
      ) : null}

      <section className="border border-white/10 bg-panel px-6 py-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foam">
          Scanned pantry items
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">
          Add ingredients from a scan, receipt, or typed list. We’ll ask
          Spoonacular for recipes that use what you already have.
        </p>

        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            addItems(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. eggs, cheddar, tortillas"
            className="w-full rounded-md border border-white/15 bg-background px-4 py-3 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
          />
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-foam px-5 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5"
          >
            Add items
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {pantry.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => removeItem(item)}
              className="rounded-md border border-white/10 bg-background px-3 py-1.5 text-sm text-foam transition-colors hover:border-brand/50 hover:text-brand"
              title={`Remove ${item}`}
            >
              {item} ×
            </button>
          ))}
          {pantry.length === 0 ? (
            <p className="text-sm text-mist">No pantry items yet.</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runSearch}
            disabled={pendingSearch || pantry.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingSearch ? "Searching…" : "Find matching recipes"}
          </button>
          <button
            type="button"
            onClick={() => setPantry(SAMPLE_PANTRY)}
            className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-foam transition-colors hover:bg-white/5"
          >
            Load sample pantry scan
          </button>
          <button
            type="button"
            onClick={() => {
              setPantry([]);
              setRecipes([]);
              setDetails(null);
              setSelectedId(null);
              setError(null);
            }}
            className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-mist transition-colors hover:text-foam"
          >
            Clear
          </button>
        </div>
      </section>

      {error ? (
        <p className="text-sm leading-relaxed text-brand" role="alert">
          {error}
        </p>
      ) : null}

      {recipes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foam">
            Matching recipes
          </h2>
          <ul className="grid gap-4">
            {recipes.map((recipe) => {
              const active = selectedId === recipe.id;
              return (
                <li key={recipe.id}>
                  <button
                    type="button"
                    onClick={() => openRecipe(recipe.id)}
                    className={`flex w-full gap-4 border px-4 py-4 text-left transition-colors ${
                      active
                        ? "border-brand/60 bg-brand/10"
                        : "border-white/10 bg-panel hover:border-white/25"
                    }`}
                  >
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden bg-background">
                      {recipe.image ? (
                        <Image
                          src={recipe.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                        {recipe.title}
                      </h3>
                      <p className="mt-1 text-sm text-mist">
                        Uses {recipe.usedIngredientCount} · missing{" "}
                        {recipe.missedIngredientCount}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-mist">
                        Have: {recipe.usedIngredients.join(", ") || "—"}
                        {recipe.missedIngredients.length > 0
                          ? ` · Need: ${recipe.missedIngredients.join(", ")}`
                          : ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {pendingDetails ? (
        <p className="text-sm text-mist">Loading instructions…</p>
      ) : null}

      {details ? (
        <section className="border border-white/10 bg-panel px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="relative h-48 w-full shrink-0 overflow-hidden bg-background lg:h-56 lg:w-72">
              {details.image ? (
                <Image
                  src={details.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 288px"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-foam">
                {details.title}
              </h2>
              <p className="mt-2 text-sm text-mist">
                {[
                  details.readyInMinutes
                    ? `${details.readyInMinutes} min`
                    : null,
                  details.servings ? `${details.servings} servings` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Recipe details"}
              </p>
              {details.summary ? (
                <p className="mt-4 text-sm leading-relaxed text-mist">
                  {details.summary}
                </p>
              ) : null}
              {details.sourceUrl ? (
                <a
                  href={details.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline"
                >
                  View original source
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-foam">
                Ingredients
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-mist">
                {details.ingredients.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-foam">
                Instructions
              </h3>
              {details.steps.length > 0 ? (
                <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-mist">
                  {details.steps.map((step, index) => (
                    <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-mist">
                  No step-by-step instructions were returned for this recipe.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
