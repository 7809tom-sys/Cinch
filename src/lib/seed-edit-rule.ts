/**
 * HARD RULE: Edit Seed must be read and reacted to.
 * Docs: docs/seed-edit-must-react.md
 */
import { randomUUID } from "crypto";
import {
  briefAsksForEcommerce,
  seedNeedsBusinessAdmin,
} from "./seed-site-copy";

export const SEED_EDIT_MUST_REACT_RULE = {
  summary:
    "When an owner uses Edit Seed, read the new name and brief and react — rebuild the live site to match. Never ignore an edit or only rename.",
  steps: [
    "Read the current Seed name and brief from Edit Seed / README.",
    "Rebuild landing, shop, and admin from THIS brief (correct industry and capabilities).",
    "Queue any missing capability tasks the brief now asks for (shop, admin, etc.).",
  ],
} as const;

export const REACT_TO_EDITED_BRIEF_TITLE = "React to edited brief";

export type EditReactableProject = {
  brief: string;
  name: string;
  tasks: Array<{ title: string; status: string }>;
};

export type EditReactionTaskDraft = {
  id: string;
  title: string;
  detail: string;
  requiredSkills: Array<"copy" | "frontend" | "ui" | "backend">;
  minSkillLevel: number;
  status: "queued";
  assigneeId: null;
  assignedBy: null;
  updatedAt: string;
};

export type SeedEditReactionPlan = {
  tasks: EditReactionTaskDraft[];
  reasons: string[];
};

function now() {
  return new Date().toISOString();
}

function hasOpenOrDoneTask(
  project: EditReactableProject,
  pattern: RegExp,
): boolean {
  return project.tasks.some((task) => pattern.test(task.title));
}

function hasOpenTask(project: EditReactableProject, pattern: RegExp): boolean {
  return project.tasks.some(
    (task) => pattern.test(task.title) && task.status !== "done",
  );
}

function makeTask(
  input: Pick<
    EditReactionTaskDraft,
    "title" | "detail" | "requiredSkills" | "minSkillLevel"
  >,
  stamp: string,
): EditReactionTaskDraft {
  return {
    ...input,
    id: randomUUID(),
    status: "queued",
    assigneeId: null,
    assignedBy: null,
    updatedAt: stamp,
  };
}

/**
 * Plan tasks so an Edit Seed save is acted on — not ignored after a Visit.
 * Does not mutate the project; caller appends and persists.
 */
export function planReactionsToEditedBrief(
  project: EditReactableProject,
  options: { nameChanged: boolean; briefChanged: boolean },
): SeedEditReactionPlan {
  const stamp = now();
  const tasks: EditReactionTaskDraft[] = [];
  const reasons: string[] = [];
  const rule = SEED_EDIT_MUST_REACT_RULE.summary;

  const edited = options.nameChanged || options.briefChanged;

  // Always react when the owner changed name/brief. Unchanged Save still
  // rebuilds via applySeedIdentityEdit; no extra task needed then.
  if (edited && !hasOpenTask(project, /react to edited brief/i)) {
    tasks.push(
      makeTask(
        {
          title: REACT_TO_EDITED_BRIEF_TITLE,
          detail: `HARD RULE: ${rule} Current brief: ${project.brief.slice(0, 500)}`,
          requiredSkills: ["copy", "frontend", "ui"],
          minSkillLevel: 2,
        },
        stamp,
      ),
    );
    reasons.push("owner changed name or brief");
  }

  if (briefAsksForEcommerce(project.brief)) {
    if (
      !hasOpenOrDoneTask(project, /seed shop e-commerce|build seed shop/i) &&
      !hasOpenTask(project, /e-commerce|ecommerce|seed shop/i)
    ) {
      tasks.push(
        makeTask(
          {
            title: "Build Seed shop e-commerce",
            detail: `HARD RULE: ${rule} Brief now asks for e-commerce — grow shop into Seed source (not a Cinch platform checkout).`,
            requiredSkills: ["frontend", "ui"],
            minSkillLevel: 3,
          },
          stamp,
        ),
      );
      reasons.push("brief asks for e-commerce; shop task missing");
    }
    if (
      !hasOpenOrDoneTask(project, /commerce ops|grow commerce/i) &&
      !hasOpenTask(project, /commerce ops|inventory.*shipping/i)
    ) {
      tasks.push(
        makeTask(
          {
            title: "Grow commerce ops into Seed admin",
            detail: `HARD RULE: ${rule} Inventory, UPS/LTL shipping, and sales tax in Seed admin. Scan-first catalog; empty starter when owner stocks items.`,
            requiredSkills: ["frontend", "ui", "backend"],
            minSkillLevel: 3,
          },
          stamp,
        ),
      );
      reasons.push("brief asks for e-commerce; commerce ops task missing");
    }
  } else if (
    seedNeedsBusinessAdmin(project.brief) &&
    !hasOpenOrDoneTask(project, /business admin|admin panel/i) &&
    !hasOpenTask(project, /business admin|admin panel|calendar.*schedule/i)
  ) {
    tasks.push(
      makeTask(
        {
          title: "Build business admin panel",
          detail: `HARD RULE: ${rule} Brief asks for business admin — grow calendar/schedule and education into Seed admin.`,
          requiredSkills: ["frontend", "ui"],
          minSkillLevel: 3,
        },
        stamp,
      ),
    );
    reasons.push("brief asks for business admin; admin task missing");
  }

  return { tasks, reasons };
}

/** True when applyTaskToSource should re-apply the edited brief. */
export function taskIsReactToEditedBrief(taskTitle: string): boolean {
  return /react to edited brief|edited brief/i.test(taskTitle);
}
