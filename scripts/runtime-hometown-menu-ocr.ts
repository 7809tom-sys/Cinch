/**
 * Runtime proof against the live Hometown Seed the local Next server already
 * serves. Ingest fixture → Approve → diner find shows the plate → 86 hides it.
 * Run: npx tsx scripts/runtime-hometown-menu-ocr.ts
 */
import { writeFileSync } from "fs";
import {
  approveMenuDraft,
  findSellableMenuItems,
  ingestMenuPhotos,
  setMenuItemEightySixed,
} from "../src/lib/seed-delivery";
import {
  ensureDeliveryOpsInSeed,
  saveDeliveryOps,
} from "../src/lib/seed-delivery-io";
import { getProject, listProjects } from "../src/lib/store";

const KNOWN_ID = "9e4fb957-1a47-4c9d-8990-18bbce5086a9";

async function main() {
  const listed = await listProjects();
  const project =
    (await getProject(KNOWN_ID)) ??
    listed.find((row) => /hometown/i.test(row.name)) ??
    listed[0];
  if (!project) throw new Error("No Hometown Seed in the store");
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) throw new Error("Hometown ops missing");

  const drafted = ingestMenuPhotos(ops, "rest-tacos", {
    kind: "photo",
    fileNames: ["takeout-1.jpg", "takeout-2.jpg", "takeout-3.jpg"],
    useFixture: true,
  });
  const live = approveMenuDraft(drafted, "rest-tacos");
  await saveDeliveryOps(project.id, live, "Runtime proof: approved paper-menu draft");
  const before = findSellableMenuItems(live, "parm hero");

  const hidden = setMenuItemEightySixed(
    live,
    "rest-tacos",
    "menu-parse-chicken-parm-hero",
    true,
  );
  await saveDeliveryOps(project.id, hidden, "Runtime proof: 86 chicken parm");
  const after = findSellableMenuItems(hidden, "parm hero");
  const ziti = findSellableMenuItems(hidden, "ziti");

  const report = {
    projectId: project.id,
    merchantPath: `/site/${project.id}/merchant`,
    dinerPath: `/site/${project.id}/shop`,
    enterPath: `/site/${project.id}/enter?role=merchant`,
    sellableAfterApprove: before.map((item) => item.title),
    sellableAfter86: after.map((item) => item.title),
    zitiStillLive: ziti.map((item) => item.title),
    dinerLeak: /86|OCR|vision parser|Red Card|Toast|Deliverect|POS/i.test(
      JSON.stringify(before),
    ),
  };
  writeFileSync(
    "/opt/cursor/artifacts/hometown_menu_ocr_runtime.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (before.length < 1) throw new Error("Approve did not make parm sellable");
  if (after.length > 0) throw new Error("86 did not hide parm from diner find");
  if (ziti.length < 1) throw new Error("86 hid the wrong plate");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
