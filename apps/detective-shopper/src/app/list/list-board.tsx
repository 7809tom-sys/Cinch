"use client";

import { useActionState, useState, useTransition } from "react";
import {
  dueStatus,
  formatDueDate,
  type ShoppingItem,
} from "@/lib/shopping-list";
import {
  addShoppingListItem,
  removeShoppingListItem,
  setShoppingListItemChecked,
  type ActionResult,
} from "./actions";

const INITIAL_ACTION: ActionResult = { ok: true };

export function ListBoard({
  items,
  today,
  notice,
  loadError,
  canEdit,
}: {
  items: ShoppingItem[];
  today: string;
  notice: string | null;
  loadError: string | null;
  canEdit: boolean;
}) {
  const [addState, addAction, addPending] = useActionState(
    addShoppingListItem,
    INITIAL_ACTION,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = items.filter((item) => !item.checked);
  const done = items.filter((item) => item.checked);
  const overdueCount = open.filter(
    (item) => dueStatus(item.dueDate, today) === "overdue",
  ).length;
  const dueTodayCount = open.filter(
    (item) => dueStatus(item.dueDate, today) === "today",
  ).length;
  const formKey = items.map((item) => item.id).join("|");
  const addError = addState.ok ? null : addState.error;

  function runItemAction(id: string, task: () => Promise<ActionResult>) {
    setActionError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await task();
      setPendingId(null);
      if (!result.ok) setActionError(result.error);
    });
  }

  return (
    <div className="mt-8">
      {notice ? (
        <p className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm leading-relaxed text-foam">
          {notice}
        </p>
      ) : null}
      {loadError ? (
        <p className="mt-4 rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-foam" role="alert">
          {loadError}
        </p>
      ) : null}

      {canEdit ? (
        <form
          key={formKey}
          action={addAction}
          className={`${notice || loadError ? "mt-4" : ""} rounded-2xl border border-white/10 bg-panel px-5 py-5`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-foam">Item</span>
              <input
                name="name"
                required
                maxLength={140}
                placeholder="13 gallon trash can liners"
                autoComplete="off"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foam">
                Due date <span className="font-normal text-mist">(optional)</span>
              </span>
              <input
                type="date"
                name="dueDate"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 [color-scheme:dark] focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foam">
                Note <span className="font-normal text-mist">(optional)</span>
              </span>
              <input
                name="note"
                maxLength={400}
                placeholder="Under the kitchen sink"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={addPending}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
          >
            {addPending ? "Adding…" : "Add to list"}
          </button>
          {addError ? (
            <p className="mt-3 text-sm text-brand" role="alert">
              {addError}
            </p>
          ) : null}
        </form>
      ) : null}

      {actionError ? (
        <p className="mt-4 text-sm text-brand" role="alert">
          {actionError}
        </p>
      ) : null}

      {!loadError && canEdit && items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-mist">
          Nothing here yet. Add something you need, like 13 gallon trash can liners.
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-8">
          <p className="text-sm text-mist">
            <span className="font-semibold text-foam">{open.length}</span> still to buy
            {overdueCount > 0 ? (
              <span className="font-semibold text-red-300">
                {" "}
                · {overdueCount} overdue
              </span>
            ) : null}
            {dueTodayCount > 0 ? (
              <span className="font-semibold text-brand">
                {" "}
                · {dueTodayCount} due today
              </span>
            ) : null}
          </p>
          {open.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {open.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  today={today}
                  pending={pending && pendingId === item.id}
                  canEdit={canEdit}
                  onToggle={(checked) =>
                    runItemAction(item.id, () => setShoppingListItemChecked(item.id, checked))
                  }
                  onRemove={() =>
                    runItemAction(item.id, () => removeShoppingListItem(item.id))
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-mist">Everything on the list is checked off.</p>
          )}

          {done.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                Done
              </h2>
              <ul className="mt-3 space-y-2">
                {done.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    today={today}
                    pending={pending && pendingId === item.id}
                    canEdit={canEdit}
                    onToggle={(checked) =>
                      runItemAction(item.id, () =>
                        setShoppingListItemChecked(item.id, checked),
                      )
                    }
                    onRemove={() =>
                      runItemAction(item.id, () => removeShoppingListItem(item.id))
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemRow({
  item,
  today,
  pending,
  canEdit,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  today: string;
  pending: boolean;
  canEdit: boolean;
  onToggle: (checked: boolean) => void;
  onRemove: () => void;
}) {
  const status = item.checked ? "none" : dueStatus(item.dueDate, today);
  const rowTone =
    status === "overdue"
      ? "border-red-400/70 bg-red-500/10"
      : status === "today"
        ? "border-brand/70 bg-brand/10"
        : item.checked
          ? "border-white/10 bg-panel/60"
          : "border-white/10 bg-panel";

  return (
    <li className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${rowTone}`}>
      <label className="flex min-w-0 flex-1 items-start gap-3">
        <input
          type="checkbox"
          checked={item.checked}
          disabled={!canEdit || pending}
          onChange={(event) => onToggle(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-brand"
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`font-semibold ${item.checked ? "text-mist line-through" : "text-foam"}`}
            >
              {item.name}
            </span>
            {status === "overdue" ? (
              <span className="rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Overdue
              </span>
            ) : null}
            {status === "today" ? (
              <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-background">
                Due today
              </span>
            ) : null}
          </span>
          {item.note ? <span className="mt-1 block text-sm text-mist">{item.note}</span> : null}
          {item.dueDate && !item.checked && status !== "today" ? (
            <span className={`mt-1 block text-xs ${status === "overdue" ? "font-semibold text-red-200" : "text-mist"}`}>
              {status === "overdue" ? `Was due ${formatDueDate(item.dueDate)}` : `Due ${formatDueDate(item.dueDate)}`}
            </span>
          ) : null}
          {pending ? <span className="mt-1 block text-xs text-mist">Saving…</span> : null}
        </span>
      </label>
      <button
        type="button"
        disabled={!canEdit || pending}
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="shrink-0 text-sm font-medium text-mist transition-colors hover:text-foam disabled:opacity-60"
      >
        Remove
      </button>
    </li>
  );
}
