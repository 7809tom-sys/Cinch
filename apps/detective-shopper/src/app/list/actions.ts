"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { currentShoppingDay } from "@/lib/shopping-list-clock";
import {
  addShoppingItem,
  mutateShoppingList,
  removeShoppingItem,
  setShoppingItemChecked,
  SHOPPING_LIST_DB_ERROR,
  type ShoppingListRepository,
} from "@/lib/shopping-list";
import {
  describeShoppingListStorage,
  openShoppingListRepository,
} from "@/lib/shopping-list-store";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ITEM_ID = /^[A-Za-z0-9-]{1,80}$/;

async function prepare(): Promise<
  | { ok: true; email: string; today: string; repo: ShoppingListRepository }
  | ActionResult & { ok: false }
> {
  const [user, today] = await Promise.all([getSessionUser(), currentShoppingDay()]);
  if (!user?.email) {
    return { ok: false, error: "Sign in to change your shopping list." };
  }
  const storage = describeShoppingListStorage();
  if (!storage.available) {
    return { ok: false, error: storage.notice };
  }
  return {
    ok: true,
    email: user.email,
    today,
    repo: openShoppingListRepository(storage.kind),
  };
}

export async function addShoppingListItem(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ready = await prepare();
  if (!ready.ok) return ready;

  try {
    const result = await mutateShoppingList(
      ready.repo,
      ready.email,
      ready.today,
      (items) =>
        addShoppingItem(
          items,
          {
            name: String(formData.get("name") ?? ""),
            note: String(formData.get("note") ?? ""),
            dueDate: String(formData.get("dueDate") ?? ""),
          },
          { id: crypto.randomUUID(), now: new Date() },
        ),
    );
    if (!result.ok) return result;
    revalidatePath("/list");
    return { ok: true };
  } catch (error) {
    console.error("shopping list save failed", error);
    return { ok: false, error: SHOPPING_LIST_DB_ERROR };
  }
}

export async function setShoppingListItemChecked(
  id: string,
  checked: boolean,
): Promise<ActionResult> {
  if (!ITEM_ID.test(id) || typeof checked !== "boolean") {
    return { ok: false, error: "That item is no longer on the list." };
  }
  const ready = await prepare();
  if (!ready.ok) return ready;

  try {
    const result = await mutateShoppingList(
      ready.repo,
      ready.email,
      ready.today,
      (items) => setShoppingItemChecked(items, id, checked),
    );
    if (!result.ok) return result;
    revalidatePath("/list");
    return { ok: true };
  } catch (error) {
    console.error("shopping list save failed", error);
    return { ok: false, error: SHOPPING_LIST_DB_ERROR };
  }
}

export async function removeShoppingListItem(id: string): Promise<ActionResult> {
  if (!ITEM_ID.test(id)) {
    return { ok: false, error: "That item is no longer on the list." };
  }
  const ready = await prepare();
  if (!ready.ok) return ready;

  try {
    const result = await mutateShoppingList(
      ready.repo,
      ready.email,
      ready.today,
      (items) => removeShoppingItem(items, id),
    );
    if (!result.ok) return result;
    revalidatePath("/list");
    return { ok: true };
  } catch (error) {
    console.error("shopping list save failed", error);
    return { ok: false, error: SHOPPING_LIST_DB_ERROR };
  }
}
