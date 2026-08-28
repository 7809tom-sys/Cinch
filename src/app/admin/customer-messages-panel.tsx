"use client";

import { useState, useTransition } from "react";
import { getMessageThreadAction, sendAdminMessageAction } from "./actions";
import type { Message } from "@/lib/messages";

type ThreadSummary = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  lastMessage: Message | null;
  unreadForAdmin: number;
};

type CustomerOption = { id: string; name: string; email: string };

const bubbleClass = (sender: Message["sender"]) =>
  sender === "admin"
    ? "ml-auto bg-brand-deep text-foam"
    : "mr-auto bg-mist text-brand-deep";

export function AdminMessagesPanel({
  customers,
  threads,
}: {
  customers: CustomerOption[];
  threads: ThreadSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [localThreads, setLocalThreads] = useState(threads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedId) ?? null;

  const openThread = (customerId: string) => {
    setError(null);
    setSelectedId(customerId);
    startTransition(async () => {
      const result = await getMessageThreadAction(customerId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages(result.messages);
      setLocalThreads((prev) =>
        prev.map((thread) =>
          thread.customerId === customerId
            ? { ...thread, unreadForAdmin: 0 }
            : thread,
        ),
      );
    });
  };

  const send = () => {
    if (!selectedId || !reply.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await sendAdminMessageAction(selectedId, reply);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages(result.messages);
      setReply("");
    });
  };

  return (
    <div className="mt-10 border-t border-brand/15 pt-6" id="messages">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        Messages
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Message any customer directly — they&apos;ll see it and can reply
        from their portal.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div>
          <label className="block">
            <span className="text-xs font-bold tracking-wide text-muted uppercase">
              Choose a customer
            </span>
            <select
              className="mt-1 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
              value={selectedId ?? ""}
              onChange={(event) => {
                if (event.target.value) openThread(event.target.value);
              }}
            >
              <option value="" disabled>
                Select…
              </option>
              {customers.map((customer) => {
                const thread = localThreads.find(
                  (t) => t.customerId === customer.id,
                );
                const unread = thread?.unreadForAdmin ?? 0;
                return (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                    {unread > 0 ? ` — ${unread} new` : ""}
                  </option>
                );
              })}
            </select>
          </label>

          {localThreads.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {localThreads.map((thread) => (
                <li key={thread.customerId}>
                  <button
                    type="button"
                    onClick={() => openThread(thread.customerId)}
                    className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-mist/50 ${
                      selectedId === thread.customerId ? "bg-mist/60" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-brand-deep">
                        {thread.customerName}
                      </span>
                      {thread.unreadForAdmin > 0 ? (
                        <span className="rounded-full bg-accent-deep px-2 py-0.5 text-[11px] font-bold text-foam">
                          {thread.unreadForAdmin}
                        </span>
                      ) : null}
                    </span>
                    {thread.lastMessage ? (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {thread.lastMessage.sender === "admin" ? "You: " : ""}
                        {thread.lastMessage.body}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No conversations yet.</p>
          )}
        </div>

        <div>
          {selectedCustomer ? (
            <>
              <p className="font-[family-name:var(--font-display)] text-base font-bold text-brand-deep">
                {selectedCustomer.name}
              </p>
              <p className="text-sm text-muted">{selectedCustomer.email}</p>

              <div className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto rounded-md border border-brand/10 p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex flex-col">
                      <p
                        className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${bubbleClass(message.sender)}`}
                      >
                        {message.body}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] text-muted ${
                          message.sender === "admin"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <textarea
                  className="flex-1 rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                  rows={2}
                  placeholder="Type a reply…"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  disabled={pending}
                />
                <button
                  type="button"
                  disabled={pending || !reply.trim()}
                  onClick={send}
                  className="inline-flex h-fit items-center justify-center self-end rounded-md bg-brand-deep px-4 py-2 text-sm font-semibold text-foam disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">
              Select a customer on the left to view or start a conversation.
            </p>
          )}
          {error ? (
            <p className="mt-2 text-sm text-accent-deep">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
