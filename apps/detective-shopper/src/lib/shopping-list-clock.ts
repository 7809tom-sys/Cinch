import { headers } from "next/headers";
import { shoppingListToday } from "./shopping-list";

/** Calendar day for reminders, using Vercel's visitor timezone when present. */
export async function currentShoppingDay(now = new Date()): Promise<string> {
  const headerStore = await headers();
  return shoppingListToday(headerStore.get("x-vercel-ip-timezone"), now);
}
