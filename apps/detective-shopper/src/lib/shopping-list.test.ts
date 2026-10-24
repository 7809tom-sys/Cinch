import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  addShoppingItem,
  checkShoppingItem,
  mutateShoppingList,
  orderShoppingItems,
  parseShoppingList,
  readShoppingList,
  removeShoppingItem,
  shoppingListKey,
  shoppingListToday,
  uncheckShoppingItem,
  SHOPPING_LIST_KEY_PREFIX,
  type ShoppingItem,
  type ShoppingListRepository,
} from "./shopping-list";
import {
  describeShoppingListStorage,
  SHOPPING_LIST_MISSING_REDIS,
} from "./shopping-list-store";

const TODAY = "2026-10-24";
const NOW = new Date("2026-10-24T15:00:00.000Z");

function memoryRepo(initial: Record<string, string> = {}): ShoppingListRepository & {
  snapshot: () => Record<string, string>;
} {
  const data = { ...initial };
  return {
    async get(key) {
      return data[key] ?? null;
    },
    async set(key, value) {
      data[key] = value;
    },
    snapshot() {
      return { ...data };
    },
  };
}

function item(partial: Partial<ShoppingItem> & Pick<ShoppingItem, "id" | "name">): ShoppingItem {
  return {
    note: "",
    dueDate: null,
    checked: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

function names(items: ShoppingItem[]): string[] {
  return items.map((entry) => entry.name);
}

const ENV_KEYS = [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VERCEL",
  "NODE_ENV",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function writeEnv(name: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[name];
  else env[name] = value;
}

afterEach(() => {
  for (const key of ENV_KEYS) writeEnv(key, originalEnv[key]);
});

describe("shopping list storage", () => {
  it("adds, checks, unchecks, and removes an item for one account", async () => {
    const repo = memoryRepo();
    const email = "Tom@Example.com";

    const added = await mutateShoppingList(repo, email, TODAY, (items) =>
      addShoppingItem(
        items,
        {
          name: "  13 gallon trash can liners  ",
          note: "  under the sink  ",
          dueDate: "2026-10-20",
        },
        { id: "liners", now: NOW },
      ),
    );
    assert.equal(added.ok, true);
    if (!added.ok) return;
    assert.equal(added.data.length, 1);
    assert.equal(added.data[0]?.name, "13 gallon trash can liners");
    assert.equal(added.data[0]?.note, "under the sink");
    assert.equal(added.data[0]?.dueDate, "2026-10-20");
    assert.equal(added.data[0]?.checked, false);

    const checked = await mutateShoppingList(repo, email, TODAY, (items) =>
      checkShoppingItem(items, "liners"),
    );
    assert.equal(checked.ok, true);
    if (!checked.ok) return;
    assert.equal(checked.data[0]?.checked, true);

    const unchecked = await mutateShoppingList(repo, email, TODAY, (items) =>
      uncheckShoppingItem(items, "liners"),
    );
    assert.equal(unchecked.ok, true);
    if (!unchecked.ok) return;
    assert.equal(unchecked.data[0]?.checked, false);

    const removed = await mutateShoppingList(repo, email, TODAY, (items) =>
      removeShoppingItem(items, "liners"),
    );
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.deepEqual(removed.data, []);

    const stored = await readShoppingList(repo, "tom@example.com");
    assert.equal(stored.ok, true);
    if (!stored.ok) return;
    assert.deepEqual(stored.data, []);
    assert.deepEqual(Object.keys(repo.snapshot()), [
      `${SHOPPING_LIST_KEY_PREFIX}tom@example.com`,
    ]);
  });

  it("keeps each account's list on its own namespaced key", async () => {
    const repo = memoryRepo();
    await mutateShoppingList(repo, "tom@example.com", TODAY, (items) =>
      addShoppingItem(items, { name: "Liners" }, { id: "a", now: NOW }),
    );
    await mutateShoppingList(repo, "sam@example.com", TODAY, (items) =>
      addShoppingItem(items, { name: "Milk" }, { id: "b", now: NOW }),
    );

    const tomKey = shoppingListKey("tom@example.com");
    const samKey = shoppingListKey("Sam@Example.com");
    assert.equal(tomKey, "detective-shopper:shopping-list:tom@example.com");
    assert.equal(samKey, "detective-shopper:shopping-list:sam@example.com");
    assert.equal(tomKey.startsWith("cinchseed:"), false);
    assert.equal(tomKey.startsWith("ds:"), false);

    const tom = await readShoppingList(repo, tomKey.replace(SHOPPING_LIST_KEY_PREFIX, ""));
    const sam = await readShoppingList(repo, "sam@example.com");
    assert.equal(tom.ok && names(tom.data)[0], "Liners");
    assert.equal(sam.ok && names(sam.data)[0], "Milk");
  });

  it("sorts overdue and due-today items ahead of later and finished ones", () => {
    const items = [
      item({ id: "soap", name: "Soap", createdAt: "2026-10-02T00:00:00.000Z" }),
      item({
        id: "milk",
        name: "Milk",
        dueDate: "2026-10-30",
        createdAt: "2026-10-03T00:00:00.000Z",
      }),
      item({
        id: "liners",
        name: "Liners",
        dueDate: "2026-10-20",
        createdAt: "2026-10-04T00:00:00.000Z",
      }),
      item({
        id: "bread",
        name: "Bread",
        dueDate: TODAY,
        createdAt: "2026-10-05T00:00:00.000Z",
      }),
      item({
        id: "eggs",
        name: "Eggs",
        dueDate: "2026-10-01",
        checked: true,
        createdAt: "2026-10-01T00:00:00.000Z",
      }),
      item({
        id: "apples",
        name: "Apples",
        dueDate: "2026-10-28",
        createdAt: "2026-10-06T00:00:00.000Z",
      }),
      item({
        id: "bags",
        name: "Bags",
        dueDate: "2026-10-18",
        createdAt: "2026-10-07T00:00:00.000Z",
      }),
      item({
        id: "sponges",
        name: "Sponges",
        createdAt: "2026-10-10T00:00:00.000Z",
      }),
    ];

    assert.deepEqual(names(orderShoppingItems(items, TODAY)), [
      "Bags",
      "Liners",
      "Bread",
      "Apples",
      "Milk",
      "Soap",
      "Sponges",
      "Eggs",
    ]);
  });

  it("moves an overdue item to the top when it is unchecked", async () => {
    const repo = memoryRepo();
    await mutateShoppingList(repo, "tom@example.com", TODAY, (items) =>
      addShoppingItem(items, { name: "Soap" }, { id: "soap", now: NOW }),
    );
    await mutateShoppingList(repo, "tom@example.com", TODAY, (items) =>
      addShoppingItem(
        items,
        { name: "Liners", dueDate: "2026-10-20" },
        { id: "liners", now: new Date("2026-10-24T16:00:00.000Z") },
      ),
    );

    const checked = await mutateShoppingList(repo, "tom@example.com", TODAY, (items) =>
      checkShoppingItem(items, "liners"),
    );
    assert.equal(checked.ok, true);
    if (!checked.ok) return;
    assert.deepEqual(names(checked.data), ["Soap", "Liners"]);

    const unchecked = await mutateShoppingList(repo, "tom@example.com", TODAY, (items) =>
      uncheckShoppingItem(items, "liners"),
    );
    assert.equal(unchecked.ok, true);
    if (!unchecked.ok) return;
    assert.deepEqual(names(unchecked.data), ["Liners", "Soap"]);
  });

  it("does not overwrite a list it cannot read", async () => {
    const key = shoppingListKey("tom@example.com");
    const repo = memoryRepo({ [key]: "{not-json" });
    const result = await mutateShoppingList(repo, "tom@example.com", TODAY, (items) =>
      addShoppingItem(items, { name: "Milk" }, { id: "milk", now: NOW }),
    );
    assert.equal(result.ok, false);
    assert.equal(repo.snapshot()[key], "{not-json");
  });

  it("rejects a blank name, a fake date, and a missing item", () => {
    const blank = addShoppingItem([], { name: "   " }, { id: "x", now: NOW });
    assert.equal(blank.ok, false);

    const fakeDate = addShoppingItem([], { name: "Milk", dueDate: "2026-02-31" }, { id: "x", now: NOW });
    assert.equal(fakeDate.ok, false);

    const missing = removeShoppingItem(
      [item({ id: "a", name: "Milk" })],
      "missing",
    );
    assert.equal(missing.ok, false);

    const parsed = parseShoppingList(null);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.data, []);
  });

  it("uses the visitor's calendar day, falling back to Eastern Time", () => {
    const instant = new Date("2026-10-25T03:30:00.000Z");
    assert.equal(shoppingListToday("UTC", instant), "2026-10-25");
    assert.equal(shoppingListToday("America/New_York", instant), "2026-10-24");
    assert.equal(shoppingListToday("Not/AZone", instant), "2026-10-24");
    assert.equal(shoppingListToday(null, instant), "2026-10-24");
  });
});

describe("shopping list storage configuration", () => {
  it("refuses to store when production has no Redis config", () => {
    writeEnv("KV_REST_API_URL", undefined);
    writeEnv("KV_REST_API_TOKEN", undefined);
    writeEnv("UPSTASH_REDIS_REST_URL", undefined);
    writeEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    writeEnv("VERCEL", "1");
    writeEnv("NODE_ENV", "production");

    const storage = describeShoppingListStorage();
    assert.equal(storage.available, false);
    if (storage.available) return;
    assert.equal(storage.kind, "unavailable");
    assert.equal(storage.notice, SHOPPING_LIST_MISSING_REDIS);
    assert.match(storage.notice, /Nothing was stored/);
  });

  it("uses Redis when the KV env vars are present", () => {
    writeEnv("KV_REST_API_URL", "https://example.upstash.io");
    writeEnv("KV_REST_API_TOKEN", "token");
    writeEnv("UPSTASH_REDIS_REST_URL", undefined);
    writeEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    writeEnv("VERCEL", "1");
    writeEnv("NODE_ENV", "production");

    const storage = describeShoppingListStorage();
    assert.equal(storage.available, true);
    if (!storage.available) return;
    assert.equal(storage.kind, "redis");
    assert.equal(storage.notice, null);
  });

  it("explains the local file fallback in development", () => {
    writeEnv("KV_REST_API_URL", undefined);
    writeEnv("KV_REST_API_TOKEN", undefined);
    writeEnv("UPSTASH_REDIS_REST_URL", undefined);
    writeEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    writeEnv("VERCEL", undefined);
    writeEnv("NODE_ENV", "development");

    const storage = describeShoppingListStorage();
    assert.equal(storage.available, true);
    if (!storage.available) return;
    assert.equal(storage.kind, "local-file");
    assert.match(storage.notice, /not written to the shared Upstash database/);
  });
});
