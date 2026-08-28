import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "./kv-store";

/**
 * Direct messaging between the admin (master account) and a customer
 * account — a lightweight support inbox, threaded by `customerId`.
 * Persisted the same way as every other store (Redis when configured,
 * a JSON file under .data/ locally).
 */

export type MessageSender = "admin" | "customer";

export type Message = {
  id: string;
  customerId: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
  readByAdmin: boolean;
  readByCustomer: boolean;
};

export type ThreadSummary = {
  customerId: string;
  lastMessage: Message | null;
  unreadForAdmin: number;
};

type MessageStore = {
  messages: Message[];
};

const STORE_KEY = "messages";
const MAX_BODY_LENGTH = 4000;

let memory: MessageStore | null = null;

async function ensureMessages(): Promise<MessageStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<MessageStore>(STORE_KEY, { messages: [] });
  memory = { messages: loaded.messages ?? [] };
  return memory;
}

async function writeMessages(store: MessageStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

function byCreatedAtAsc(a: Message, b: Message): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export async function listMessagesForCustomer(
  customerId: string,
): Promise<Message[]> {
  const store = await ensureMessages();
  return store.messages
    .filter((message) => message.customerId === customerId)
    .sort(byCreatedAtAsc);
}

export async function sendMessage(input: {
  customerId: string;
  sender: MessageSender;
  body: string;
}): Promise<Message> {
  const body = input.body.trim().slice(0, MAX_BODY_LENGTH);
  if (!body) throw new Error("Message can't be empty.");

  const store = await ensureMessages();
  const message: Message = {
    id: randomUUID(),
    customerId: input.customerId,
    sender: input.sender,
    body,
    createdAt: new Date().toISOString(),
    // The sender has necessarily "read" their own message.
    readByAdmin: input.sender === "admin",
    readByCustomer: input.sender === "customer",
  };
  store.messages.push(message);
  await writeMessages(store);
  return message;
}

export async function markThreadReadByAdmin(customerId: string): Promise<void> {
  const store = await ensureMessages();
  let changed = false;
  for (const message of store.messages) {
    if (message.customerId === customerId && !message.readByAdmin) {
      message.readByAdmin = true;
      changed = true;
    }
  }
  if (changed) await writeMessages(store);
}

export async function markThreadReadByCustomer(
  customerId: string,
): Promise<void> {
  const store = await ensureMessages();
  let changed = false;
  for (const message of store.messages) {
    if (message.customerId === customerId && !message.readByCustomer) {
      message.readByCustomer = true;
      changed = true;
    }
  }
  if (changed) await writeMessages(store);
}

export async function unreadCountForCustomer(
  customerId: string,
): Promise<number> {
  const messages = await listMessagesForCustomer(customerId);
  return messages.filter((m) => m.sender === "admin" && !m.readByCustomer)
    .length;
}

/** One row per customer who has ever exchanged a message, newest first. */
export async function listThreadSummaries(): Promise<ThreadSummary[]> {
  const store = await ensureMessages();
  const byCustomer = new Map<string, Message[]>();
  for (const message of store.messages) {
    const list = byCustomer.get(message.customerId) ?? [];
    list.push(message);
    byCustomer.set(message.customerId, list);
  }

  const summaries: ThreadSummary[] = [];
  for (const [customerId, list] of byCustomer) {
    const sorted = [...list].sort(byCreatedAtAsc);
    const lastMessage = sorted[sorted.length - 1] ?? null;
    const unreadForAdmin = sorted.filter(
      (m) => m.sender === "customer" && !m.readByAdmin,
    ).length;
    summaries.push({ customerId, lastMessage, unreadForAdmin });
  }

  return summaries.sort((a, b) =>
    (b.lastMessage?.createdAt ?? "").localeCompare(
      a.lastMessage?.createdAt ?? "",
    ),
  );
}

export async function totalUnreadForAdmin(): Promise<number> {
  const summaries = await listThreadSummaries();
  return summaries.reduce((sum, thread) => sum + thread.unreadForAdmin, 0);
}
