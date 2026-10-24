/**
 * Shopping-list rules shared by the page and the tests.
 * Persistence lives in shopping-list-store.ts. This file stays free of
 * Next.js and Redis so the reminder behavior can be tested on its own.
 *
 * Keys use a long prefix on purpose. Detective Shopper and Hometown Runner
 * (cinchseed:) share one Upstash database.
 */

export const SHOPPING_LIST_KEY_PREFIX = "detective-shopper:shopping-list:";
export const SHOPPING_LIST_TIME_ZONE = "America/New_York";
export const SHOPPING_LIST_DB_ERROR =
  "The shopping list database didn't respond, so this change was not saved.";
export const SHOPPING_LIST_READ_ERROR =
  "The shopping list couldn't be loaded. Nothing was changed.";
export const SHOPPING_LIST_CORRUPT_ERROR =
  "The saved shopping list couldn't be read, so it was left unchanged.";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEMS = 100;
const MAX_NAME = 140;
const MAX_NOTE = 400;

export type ShoppingItem = {
  id: string;
  name: string;
  note: string;
  /** Calendar date YYYY-MM-DD, or null when the item has no due date. */
  dueDate: string | null;
  checked: boolean;
  createdAt: string;
};

export type DueStatus = "overdue" | "today" | "upcoming" | "none";

export type ListResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ShoppingListRepository = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};

export type NewShoppingItem = {
  name: string;
  note?: string;
  dueDate?: string | null;
};

export function shoppingListKey(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("A signed-in account is required.");
  }
  return `${SHOPPING_LIST_KEY_PREFIX}${normalized}`;
}

export function dueStatus(dueDate: string | null, today: string): DueStatus {
  if (!dueDate) return "none";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

function reminderRank(item: ShoppingItem, today: string): number {
  if (item.checked) return 4;
  const status = dueStatus(item.dueDate, today);
  if (status === "overdue") return 0;
  if (status === "today") return 1;
  if (status === "upcoming") return 2;
  return 3;
}

export function orderShoppingItems(items: ShoppingItem[], today: string): ShoppingItem[] {
  return items.toSorted((a, b) => compareShoppingItems(a, b, today));
}

function compareShoppingItems(a: ShoppingItem, b: ShoppingItem, today: string): number {
  const rankA = reminderRank(a, today);
  const rankB = reminderRank(b, today);
  if (rankA !== rankB) return rankA - rankB;

  const dueA = a.dueDate ?? "";
  const dueB = b.dueDate ?? "";
  if (dueA !== dueB) {
    if (!dueA) return 1;
    if (!dueB) return -1;
    return dueA < dueB ? -1 : 1;
  }
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function shoppingListToday(
  timeZoneHeader: string | null | undefined,
  now = new Date(),
): string {
  const requested = timeZoneHeader?.trim() ?? "";
  const timeZone =
    requested && isValidTimeZone(requested) ? requested : SHOPPING_LIST_TIME_ZONE;
  return calendarDate(now, timeZone);
}

export function calendarDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not resolve today's date.");
  }
  return `${year}-${month}-${day}`;
}

export function formatDueDate(dueDate: string): string {
  const match = DATE_PATTERN.exec(dueDate);
  if (!match) return dueDate;
  const year = Number(dueDate.slice(0, 4));
  const month = Number(dueDate.slice(5, 7));
  const day = Number(dueDate.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function parseDueDate(value: string | null | undefined): ListResult<string | null> {
  if (value == null) return { ok: true, data: null };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, data: null };
  if (!DATE_PATTERN.test(trimmed)) {
    return { ok: false, error: "Use a real due date, or leave it blank." };
  }
  const year = Number(trimmed.slice(0, 4));
  const month = Number(trimmed.slice(5, 7));
  const day = Number(trimmed.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, error: "Use a real due date, or leave it blank." };
  }
  return { ok: true, data: trimmed };
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function addShoppingItem(
  items: ShoppingItem[],
  input: NewShoppingItem,
  options: { id: string; now: Date },
): ListResult<ShoppingItem[]> {
  const name = cleanText(input.name);
  if (!name) return { ok: false, error: "Add a name for the item." };
  if (name.length > MAX_NAME) {
    return { ok: false, error: `Keep the item name under ${MAX_NAME} characters.` };
  }
  const note = cleanText(input.note ?? "");
  if (note.length > MAX_NOTE) {
    return { ok: false, error: `Keep the note under ${MAX_NOTE} characters.` };
  }
  const due = parseDueDate(input.dueDate);
  if (!due.ok) return due;
  if (items.length >= MAX_ITEMS) {
    return {
      ok: false,
      error: `The list holds ${MAX_ITEMS} items. Remove one before adding another.`,
    };
  }
  if (!options.id.trim()) return { ok: false, error: "Could not save that item." };

  const item: ShoppingItem = {
    id: options.id,
    name,
    note,
    dueDate: due.data,
    checked: false,
    createdAt: options.now.toISOString(),
  };
  return { ok: true, data: [...items, item] };
}

export function setShoppingItemChecked(
  items: ShoppingItem[],
  id: string,
  checked: boolean,
): ListResult<ShoppingItem[]> {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return { ok: false, error: "That item is no longer on the list." };
  }
  const next = items.slice();
  next[index] = { ...items[index], checked };
  return { ok: true, data: next };
}

export function checkShoppingItem(items: ShoppingItem[], id: string): ListResult<ShoppingItem[]> {
  return setShoppingItemChecked(items, id, true);
}

export function uncheckShoppingItem(
  items: ShoppingItem[],
  id: string,
): ListResult<ShoppingItem[]> {
  return setShoppingItemChecked(items, id, false);
}

export function removeShoppingItem(items: ShoppingItem[], id: string): ListResult<ShoppingItem[]> {
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) {
    return { ok: false, error: "That item is no longer on the list." };
  }
  return { ok: true, data: next };
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ShoppingItem>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    item.id.length <= 80 &&
    typeof item.name === "string" &&
    typeof item.note === "string" &&
    (item.dueDate === null ||
      (typeof item.dueDate === "string" && DATE_PATTERN.test(item.dueDate))) &&
    typeof item.checked === "boolean" &&
    typeof item.createdAt === "string"
  );
}

export function parseShoppingList(raw: string | null): ListResult<ShoppingItem[]> {
  if (raw == null || raw === "") return { ok: true, data: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: SHOPPING_LIST_CORRUPT_ERROR };
  }
  if (parsed == null) return { ok: true, data: [] };
  if (!Array.isArray(parsed)) {
    return { ok: false, error: SHOPPING_LIST_CORRUPT_ERROR };
  }
  if (!parsed.every(isShoppingItem)) {
    return { ok: false, error: SHOPPING_LIST_CORRUPT_ERROR };
  }
  return { ok: true, data: parsed };
}

export async function readShoppingList(
  repo: ShoppingListRepository,
  email: string,
): Promise<ListResult<ShoppingItem[]>> {
  let key: string;
  try {
    key = shoppingListKey(email);
  } catch {
    return { ok: false, error: "Sign in to see your shopping list." };
  }
  const raw = await repo.get(key);
  return parseShoppingList(raw);
}

export async function mutateShoppingList(
  repo: ShoppingListRepository,
  email: string,
  today: string,
  change: (items: ShoppingItem[]) => ListResult<ShoppingItem[]>,
): Promise<ListResult<ShoppingItem[]>> {
  const current = await readShoppingList(repo, email);
  if (!current.ok) return current;
  const next = change(current.data);
  if (!next.ok) return next;
  const ordered = orderShoppingItems(next.data, today);
  await repo.set(shoppingListKey(email), JSON.stringify(ordered));
  return { ok: true, data: ordered };
}
