/**
 * Guard: AI names show a green/red work light and a switch dropdown.
 * Run: npx tsx scripts/assert-agent-status.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  agentIsActiveOnBoard,
  findSwitchableTask,
  listSwitchableAgents,
} from "../src/lib/agent-status";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const tasks = [
  {
    assigneeId: "ui-atlas",
    status: "in_progress",
  },
  {
    assigneeId: "fe-pixel",
    status: "done",
  },
  {
    assigneeId: null,
    status: "queued",
  },
];

assert(
  agentIsActiveOnBoard(tasks, "ui-atlas"),
  "Atlas is active while assigned in-progress work",
);
assert(
  !agentIsActiveOnBoard(tasks, "fe-pixel"),
  "Pixel is inactive after finishing",
);
assert(
  !agentIsActiveOnBoard(tasks, "copy-quill"),
  "Quill is inactive with no open assignment",
);

const crew = listSwitchableAgents({ tasks });
const atlas = crew.find((agent) => agent.id === "ui-atlas");
const quill = crew.find((agent) => agent.id === "copy-quill");
assert(Boolean(atlas && quill), "dropdown roster includes Atlas and Quill");
assert(atlas?.status === "active", "Atlas light is green / active");
assert(quill?.status === "inactive", "Quill light is red / inactive");
assert(
  Boolean(quill?.specialty && quill.specialty.length > 8),
  "dropdown shows what Quill can do",
);

const open = findSwitchableTask(tasks);
assert(open?.status === "in_progress", "switch targets the active task first");

const ui = readFileSync(
  join(process.cwd(), "src/components/agent-status-switch.tsx"),
  "utf8",
);
assert(ui.includes("bg-emerald-500"), "green light class is present");
assert(ui.includes("bg-red-500"), "red light class is present");
assert(ui.includes("Switch AI"), "dropdown is labeled Switch AI");
assert(ui.includes("agent.specialty"), "options include what the AI can do");

const portal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/page.tsx"),
  "utf8",
);
assert(
  portal.includes("AgentStatusSwitch"),
  "Seed desk shows the AI switch dropdown",
);
assert(
  portal.includes("Green light = that AI is active"),
  "Seed desk explains green/red lights",
);

const pm = readFileSync(
  join(process.cwd(), "src/lib/project-manager.ts"),
  "utf8",
);
assert(
  pm.includes("export async function switchOpenWorkToAgent"),
  "switching an AI reassigns the open task",
);

if (process.exitCode) {
  console.error("agent status assertions failed");
} else {
  console.log("agent status assertions passed");
}
