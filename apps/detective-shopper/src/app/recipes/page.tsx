import Link from "next/link";
import { spoonacularConfigured } from "./actions";
import { RecipeGenerator } from "./recipe-generator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recipe generator — Detective Shopper",
  description:
    "Turn scanned pantry items into matching recipes and cooking instructions via Spoonacular.",
};

export default async function RecipesPage() {
  const apiConfigured = await spoonacularConfigured();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-mist">
            <Link href="/admin" className="transition-colors hover:text-foam">
              Admin
            </Link>
            <span className="text-foam">Recipes</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          PANTRY → PLATE
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-5xl">
          Recipe generator
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist">
          Feed in scanned pantry items, call Spoonacular for matches, then open
          a recipe for ingredients and step-by-step instructions.
        </p>

        <div className="mt-10">
          <RecipeGenerator apiConfigured={apiConfigured} />
        </div>
      </main>
    </div>
  );
}
