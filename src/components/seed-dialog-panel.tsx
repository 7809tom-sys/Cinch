"use client";

import { useState, useTransition } from "react";
import { sendAdminSeedDialogAction } from "@/app/admin/actions";
import { sendPortalSeedDialogAction } from "@/app/portal/actions";
import type { Message } from "@/lib/messages";

const bubbleClass = (sender: Message["sender"]) =>
  sender === "customer"
    ? "ml-auto bg-brand-deep text-foam"
    : "mr-auto bg-mist text-brand-deep";

export function SeedDialogPanel({
  projectId,
  mode,
  seedName,
  liveUrl,
  initialMessages,
  seedLabel,
}: {
  projectId: string;
  mode: "admin" | "portal";
  seedName: string;
  liveUrl?: string | null;
  initialMessages: Message[];
  seedLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = () => {
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      const result =
        mode === "admin"
          ? await sendAdminSeedDialogAction(projectId, text)
          : await sendPortalSeedDialogAction(projectId, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages(result.messages);
      setText("");
    });
  };

  return (
    <div className="border border-brand/10 bg-foam px-5 py-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        Dialog with {seedName}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Talk to this Seed. It answers about{" "}
        {liveUrl ? (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-deep underline"
          >
            {liveUrl}
          </a>
        ) : (
          "this host"
        )}
        . Ask how to improve the site — proposed updates wait for your
        approval. No rebuild.
      </p>

      <div className="mt-4 flex max-h-[28rem] flex-col gap-2 overflow-y-auto rounded-md border border-brand/10 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            No turns yet. Say hello or ask how to improve the site.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex flex-col">
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${bubbleClass(message.sender)}`}
              >
                {message.body}
              </p>
              <p
                className={`mt-0.5 text-[11px] text-muted ${
                  message.sender === "customer" ? "text-right" : "text-left"
                }`}
              >
                {message.sender === "admin" ? `${seedLabel} · ` : "You · "}
                {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <textarea
          className="flex-1 rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
          rows={3}
          placeholder="Ask this Seed… try “how do we improve the site?”"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={pending}
        />
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={send}
          className="inline-flex h-fit items-center justify-center self-end rounded-md bg-brand-deep px-4 py-2 text-sm font-semibold text-foam disabled:opacity-60"
        >
          Send
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
