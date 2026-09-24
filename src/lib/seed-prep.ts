/**
 * Prep Work Is Everything — the Cinch Seed method for a good website.
 * Source: Prep-Work-Is-Everything-AI-Playbook.
 * Describe the chat before the chat happens. Exact inputs win.
 */
import type { AgentSkill } from "./agents";

export const PREP_RULE =
  "Prep work is everything. You cannot scream at the model for garbage-in, garbage-out. Describe the chat before the chat happens. Write the goal, the boundaries, the deliverable, and what done looks like — then paste. The prep is the product.";

export const PREP_LANES = [
  { id: "website", label: "Website / product" },
  { id: "admin", label: "Administration" },
  { id: "accounting", label: "Accounting & money" },
  { id: "crm", label: "CRM / ops" },
  { id: "delivery", label: "Delivery / fulfillment" },
] as const;

export const PREP_DELIVERY_MODES = [
  { id: "digital", label: "Digital download only" },
  { id: "partial", label: "Partial package" },
  { id: "freight", label: "Semi-load / freight / drop-ship" },
  { id: "white-label", label: "White-label site go-live" },
  { id: "service", label: "Service / appointment / live event" },
  { id: "hybrid", label: "Hybrid" },
] as const;

export type PrepLaneId = (typeof PREP_LANES)[number]["id"];
export type PrepDeliveryModeId = (typeof PREP_DELIVERY_MODES)[number]["id"];

export type SeedPrepBrief = {
  name: string;
  intent: string;
  inScope: string;
  outOfScope: string;
  sourceOfTruth: string;
  nonNegotiables: string;
  deliveryModes: PrepDeliveryModeId[];
  deliveryNotes: string;
  moneyNotes: string;
  crmAdmin: string;
  doneLooksLike: string;
  lanes: Record<PrepLaneId, "addressed" | "na" | "">;
};

export type PrepBuildTask = {
  title: string;
  detail: string;
  requiredSkills: AgentSkill[];
  minSkillLevel: number;
};

export function emptyPrepBrief(name = ""): SeedPrepBrief {
  return {
    name,
    intent: "",
    inScope: "",
    outOfScope: "",
    sourceOfTruth: "",
    nonNegotiables: "",
    deliveryModes: [],
    deliveryNotes: "",
    moneyNotes: "",
    crmAdmin: "",
    doneLooksLike: "",
    lanes: {
      website: "",
      admin: "",
      accounting: "",
      crm: "",
      delivery: "",
    },
  };
}

export function composePrepBrief(input: SeedPrepBrief): string {
  const modes = input.deliveryModes
    .map((id) => PREP_DELIVERY_MODES.find((item) => item.id === id)?.label ?? id)
    .join("; ");
  const lanes = PREP_LANES.map((lane) => {
    const mark = input.lanes[lane.id];
    const state = mark === "na" ? "N/A" : mark === "addressed" ? "addressed" : "BLANK";
    return `- ${lane.label}: ${state}`;
  }).join("\n");

  return [
    PREP_RULE,
    "",
    `PROJECT / SITE: ${input.name.trim()}`,
    `ONE-SENTENCE INTENT: ${input.intent.trim()}`,
    `IN SCOPE: ${input.inScope.trim()}`,
    `OUT OF SCOPE: ${input.outOfScope.trim()}`,
    `SOURCE OF TRUTH: ${input.sourceOfTruth.trim()}`,
    `NON-NEGOTIABLES: ${input.nonNegotiables.trim()}`,
    `DELIVERY MODE: ${modes || "(none checked)"}`,
    input.deliveryNotes.trim() ? `DELIVERY NOTES: ${input.deliveryNotes.trim()}` : null,
    `MONEY / FEE NOTES: ${input.moneyNotes.trim()}`,
    `CRM / ADMIN IMPACT: ${input.crmAdmin.trim()}`,
    `DONE LOOKS LIKE: ${input.doneLooksLike.trim()}`,
    "",
    "LANES (website, admin, accounting, CRM, delivery):",
    lanes,
    "",
    "Build only what this brief named. Do not invent a pretty homepage with no admin, money trail, or delivery.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function prepBriefFromFormData(formData: FormData): SeedPrepBrief {
  const lanes = emptyPrepBrief().lanes;
  for (const lane of PREP_LANES) {
    const value = String(formData.get(`lane_${lane.id}`) ?? "").trim();
    if (value === "addressed" || value === "na") lanes[lane.id] = value;
  }
  const deliveryModes = PREP_DELIVERY_MODES.map((item) => item.id).filter((id) =>
    formData.getAll("deliveryMode").includes(id),
  );
  return {
    name: String(formData.get("name") ?? "").trim(),
    intent: String(formData.get("intent") ?? "").trim(),
    inScope: String(formData.get("inScope") ?? "").trim(),
    outOfScope: String(formData.get("outOfScope") ?? "").trim(),
    sourceOfTruth: String(formData.get("sourceOfTruth") ?? "").trim(),
    nonNegotiables: String(formData.get("nonNegotiables") ?? "").trim(),
    deliveryModes,
    deliveryNotes: String(formData.get("deliveryNotes") ?? "").trim(),
    moneyNotes: String(formData.get("moneyNotes") ?? "").trim(),
    crmAdmin: String(formData.get("crmAdmin") ?? "").trim(),
    doneLooksLike: String(formData.get("doneLooksLike") ?? "").trim(),
    lanes,
  };
}

export function prepBriefLooksComplete(brief: string): boolean {
  const text = brief.toLowerCase();
  if (!/one-sentence intent|intent:/.test(text)) return false;
  if (!/in scope:/.test(text)) return false;
  if (!/out of scope:/.test(text)) return false;
  if (!/done looks like:/.test(text)) return false;
  return PREP_LANES.every(
    (lane) =>
      text.includes(lane.label.toLowerCase()) &&
      (text.includes(`${lane.label.toLowerCase()}: addressed`) ||
        text.includes(`${lane.label.toLowerCase()}: n/a`)),
  );
}

export type NewSeedBriefEntry = "worksheet" | "paste";

/** Pull a Seed name from a pasted email/subject/title when the name field is blank. */
export function inferSeedNameFromPastedBrief(brief: string): string {
  const lines = brief
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const labeled = line.match(
      /^(?:subject|project\s*\/\s*site|project|title)\s*:\s*(.+)$/i,
    );
    if (!labeled) continue;
    return labeled[1]
      .replace(/^Build\s+/i, "")
      .replace(/\s+[—–-]\s+v\d.*$/i, "")
      .trim()
      .slice(0, 120);
  }

  const heading = lines.find((line) => /^#{1,3}\s+\S/.test(line));
  if (heading) return heading.replace(/^#+\s+/, "").trim().slice(0, 120);

  const first = lines.find((line) => line.length >= 3 && line.length <= 72);
  return (first ?? "").slice(0, 120);
}

export function resolveNewSeedBrief(formData: FormData): {
  name: string;
  brief: string;
  entry: NewSeedBriefEntry;
  error?: string;
} {
  const seedMode = String(formData.get("seedMode") ?? "").trim();
  const entry: NewSeedBriefEntry =
    String(formData.get("briefEntry") ?? "").trim() === "paste"
      ? "paste"
      : "worksheet";
  let name = String(formData.get("name") ?? "").trim();
  const pasted = String(formData.get("brief") ?? "").trim();

  if (seedMode !== "build") {
    return { name, brief: pasted, entry };
  }

  if (entry === "paste") {
    if (pasted.length < 20) {
      return {
        name,
        brief: pasted,
        entry,
        error: "Paste the full brief as-is, or switch to the worksheet.",
      };
    }
    if (!name) name = inferSeedNameFromPastedBrief(pasted);
    if (!name) {
      return {
        name,
        brief: pasted,
        entry,
        error: "Add a Seed name, or start the paste with a title.",
      };
    }
    return { name, brief: pasted, entry };
  }

  const prep = prepBriefFromFormData(formData);
  const composed = composePrepBrief({ ...prep, name: name || prep.name });
  if (!name) {
    return {
      name,
      brief: composed,
      entry,
      error: "Name and brief are required.",
    };
  }
  const missing = missingPrepFields({ ...prep, name });
  if (missing.length > 0) {
    return {
      name,
      brief: composed,
      entry,
      error: `Finish the prep worksheet first: ${missing.join(", ")}.`,
    };
  }
  return { name, brief: composed, entry };
}

export function missingPrepFields(input: SeedPrepBrief): string[] {
  const missing: string[] = [];
  if (!input.intent.trim()) missing.push("one-sentence intent");
  if (!input.inScope.trim()) missing.push("in scope");
  if (!input.outOfScope.trim()) missing.push("out of scope");
  if (!input.nonNegotiables.trim()) missing.push("non-negotiables");
  if (!input.doneLooksLike.trim()) missing.push("done looks like");
  if (input.deliveryModes.length === 0 && !input.deliveryNotes.trim()) {
    missing.push("delivery mode");
  }
  if (!input.moneyNotes.trim()) missing.push("money / fee notes");
  if (!input.crmAdmin.trim()) missing.push("CRM / admin impact");
  for (const lane of PREP_LANES) {
    if (!input.lanes[lane.id]) missing.push(lane.label);
  }
  return missing;
}

export function planPrepBuildTasks(brief: string): PrepBuildTask[] {
  const lock = `Follow this prep brief exactly. ${PREP_RULE} Brief:\n${brief}`;
  return [
    {
      title: "Hold the prep brief — do not open AI cold",
      detail: `${lock} Confirm intent, in/out scope, source of truth, non-negotiables, and done-looks-like before any page is drawn.`,
      requiredSkills: ["architecture", "research"],
      minSkillLevel: 3,
    },
    {
      title: "Spec website vs admin vs logged-in product",
      detail: `${lock} Name the one job on the public site, what sits behind login, and who operates admin. Do not ship a pretty shell with no operator desk.`,
      requiredSkills: ["architecture", "ui"],
      minSkillLevel: 3,
    },
    {
      title: "Lock delivery and money",
      detail: `${lock} Build only the delivery modes and fee rules written in the brief. If money is unclear, fail closed — do not invent checkout.`,
      requiredSkills: ["backend", "research"],
      minSkillLevel: 3,
    },
    {
      title: "Lock CRM and fulfillment",
      detail: `${lock} Pipeline, owner, and what ships when must match the brief. Lanes marked N/A stay out.`,
      requiredSkills: ["research", "backend"],
      minSkillLevel: 3,
    },
  ];
}
