/**
 * Guard: Edit Seed must be read and reacted to — never ignored.
 * Run: npx tsx scripts/assert-seed-edit-react.ts
 */
import {
  planReactionsToEditedBrief,
  SEED_EDIT_MUST_REACT_RULE,
  taskIsReactToEditedBrief,
} from "../src/lib/seed-edit-rule";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /read|react/i.test(SEED_EDIT_MUST_REACT_RULE.summary),
  "rule summary requires read + react",
);

assert(
  taskIsReactToEditedBrief("React to edited brief"),
  "react task title is recognized",
);

const completeNoShop = {
  name: "Pizza Man",
  brief: "Neighborhood pizza. E-commerce shop. Owner scans items and charges card.",
  tasks: [
    { title: "Design primary landing composition", status: "done" },
    { title: "QA the build path", status: "done" },
  ],
};

const pizzaPlan = planReactionsToEditedBrief(completeNoShop, {
  nameChanged: false,
  briefChanged: true,
});
assert(
  pizzaPlan.tasks.some((t) => /react to edited brief/i.test(t.title)),
  "brief change queues React to edited brief",
);
assert(
  pizzaPlan.tasks.some((t) => /shop e-commerce/i.test(t.title)),
  "e-commerce brief queues shop task when missing",
);
assert(
  pizzaPlan.tasks.some((t) => /commerce ops/i.test(t.title)),
  "e-commerce brief queues commerce ops when missing",
);

const alreadyHasShop = {
  name: "Pizza Man",
  brief: "Neighborhood pizza. E-commerce shop.",
  tasks: [
    { title: "Build Seed shop e-commerce", status: "done" },
    { title: "Grow commerce ops into Seed admin", status: "done" },
  ],
};
const shopDonePlan = planReactionsToEditedBrief(alreadyHasShop, {
  nameChanged: true,
  briefChanged: false,
});
assert(
  shopDonePlan.tasks.some((t) => /react to edited brief/i.test(t.title)),
  "name change still queues react task",
);
assert(
  !shopDonePlan.tasks.some((t) => /shop e-commerce/i.test(t.title)),
  "does not re-queue shop when already done",
);

const unchanged = planReactionsToEditedBrief(alreadyHasShop, {
  nameChanged: false,
  briefChanged: false,
});
assert(
  unchanged.tasks.length === 0,
  "unchanged Save does not queue duplicate reaction tasks",
);

if (process.exitCode) {
  console.error("\nEdit Seed react guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll Edit Seed react guards passed.");
