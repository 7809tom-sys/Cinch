/**
 * Guard: kitchens made on an affiliate storefront are easy to find in the CRM.
 * Run: npx tsx scripts/assert-affiliate-design-crm.ts
 */
import {
  affiliateDesignCrmLine,
  affiliateStoreFromPath,
  designsByStore,
  findAffiliateDesigns,
  isAffiliateCrmPage,
  isDesignSaveLabel,
  isDesignSaveUrl,
  listAffiliateDesigns,
  recordAffiliateDesign,
} from "../src/lib/affiliate-designs";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  isAffiliateCrmPage("/affiliate", "") &&
    !isAffiliateCrmPage("/affiliate", "?viewAs=kathmandu") &&
    !isAffiliateCrmPage("/store/kathmandu", "") &&
    isAffiliateCrmPage("/crm", ""),
  "CRM paint targets the affiliate desk, not the public storefront",
);
assert(
  isDesignSaveUrl("/api/designs") &&
    isDesignSaveUrl("https://www.cabinetdealz.com/quotes?id=1") &&
    !isDesignSaveUrl("/v1/health") &&
    isDesignSaveLabel("Save design") &&
    isDesignSaveLabel("Request a kitchen quote"),
  "design saves are recognized from the storefront actions",
);
assert(
  affiliateStoreFromPath("/store/kathmandu", "").storeName === "Kathmandu" &&
    affiliateStoreFromPath(
      "https://www.cabinetdealz.com/store/kathmandu",
      "",
    ).storeSlug === "kathmandu",
  "store identity comes from the affiliate URL",
);

const seedId = `seed-assert-design-crm-${Date.now()}`;

Promise.resolve()
  .then(async () => {
    const first = await recordAffiliateDesign({
      seedId,
      storeSlug: "kathmandu",
      storeName: "Spartan Cabinets",
      title: "Aero Blanc kitchen",
      customerName: "Pat",
      contact: "pat@example.com",
      href: "https://www.cabinetdealz.com/store/kathmandu",
      kind: "requested",
    });
    const again = await recordAffiliateDesign({
      seedId,
      storeSlug: "kathmandu",
      storeName: "Spartan Cabinets",
      title: "Aero Blanc kitchen",
      customerName: "Pat",
      contact: "pat@example.com",
      href: "https://www.cabinetdealz.com/store/kathmandu",
      kind: "requested",
    });
    assert(first.id === again.id, "duplicate design reports do not spam the CRM");

    const listed = await listAffiliateDesigns(seedId);
    assert(listed.length === 1, "the CRM keeps one row for that kitchen");
    assert(
      affiliateDesignCrmLine(listed[0]) ===
        "Spartan Cabinets · Aero Blanc kitchen · Pat",
      "each CRM line names the store, kitchen, and customer",
    );
    assert(
      findAffiliateDesigns(listed, "spartan").length === 1 &&
        findAffiliateDesigns(listed, "blanc").length === 1 &&
        findAffiliateDesigns(listed, "missing").length === 0,
      "CRM search finds a design by store or kitchen",
    );
    assert(
      designsByStore(listed)[0]?.storeName === "Spartan Cabinets",
      "CRM groups designs under the affiliate store",
    );
  })
  .then(() => {
    if (process.exitCode) {
      console.error("affiliate-design-crm assertions failed");
    } else {
      console.log("affiliate-design-crm assertions passed");
    }
  })
  .catch((error) => {
    console.error("FAIL: affiliate design CRM", error);
    process.exitCode = 1;
  });
