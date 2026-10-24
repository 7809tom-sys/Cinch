import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { googleClientId, isGoogleLoginConfigured } from "@/lib/auth";
import { currentShoppingDay } from "@/lib/shopping-list-clock";
import {
  orderShoppingItems,
  readShoppingList,
  SHOPPING_LIST_READ_ERROR,
  type ShoppingItem,
} from "@/lib/shopping-list";
import {
  describeShoppingListStorage,
  openShoppingListRepository,
} from "@/lib/shopping-list-store";
import { AccountChip } from "../account-chip";
import { EmailLogin } from "../coupons/email-login";
import { GoogleSignIn } from "../coupons/google-sign-in";
import { ListBoard } from "./list-board";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shopping list — Detective Shopper",
  description: "A private reminder list for what to pick up, with optional due dates and notes.",
};

export default async function ShoppingListPage() {
  const [user, today] = await Promise.all([getSessionUser(), currentShoppingDay()]);
  const storage = describeShoppingListStorage();
  const clientId = googleClientId();

  let items: ShoppingItem[] = [];
  let loadError: string | null = null;
  if (user && storage.available) {
    try {
      const loaded = await readShoppingList(
        openShoppingListRepository(storage.kind),
        user.email,
      );
      if (!loaded.ok) {
        loadError = loaded.error;
      } else {
        items = orderShoppingItems(loaded.data, today);
      }
    } catch (error) {
      console.error("shopping list load failed", error);
      loadError = SHOPPING_LIST_READ_ERROR;
    }
  }

  const canEdit = Boolean(user) && storage.available && !loadError;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-mist">
            <Link href="/scan" className="transition-colors hover:text-foam">
              Scan
            </Link>
            <Link href="/coupons" className="transition-colors hover:text-foam">
              Coupons
            </Link>
            <Link href="/recipes" className="transition-colors hover:text-foam">
              Recipes
            </Link>
            <AccountChip />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          REMINDERS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Shopping list
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-mist">
          Keep a reminder of what to pick up. Add an optional due date or note,
          then check items off as you buy them. Overdue and due-today items stay
          at the top.
        </p>
        {user ? (
          <p className="mt-3 text-sm text-mist">
            Saved for <span className="font-semibold text-foam">{user.email}</span>
          </p>
        ) : null}

        {user ? (
          <ListBoard
            items={items}
            today={today}
            notice={storage.notice}
            loadError={loadError}
            canEdit={canEdit}
          />
        ) : (
          <div className="mt-8 rounded-2xl border border-white/10 bg-panel px-5 py-5">
            <p className="font-semibold text-foam">Sign in to use your list</p>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-mist">
              Each account has its own list. Sign in to add reminders like 13
              gallon trash can liners. Visitors who are not signed in cannot see
              or change it.
            </p>
            <div className="mt-4 max-w-sm">
              <EmailLogin redirectTo="/list" />
              {isGoogleLoginConfigured() && clientId ? (
                <>
                  <div className="my-4 flex items-center gap-3 text-xs text-mist">
                    <span className="h-px flex-1 bg-white/10" />
                    or
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <GoogleSignIn clientId={clientId} redirectTo="/list" />
                </>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
