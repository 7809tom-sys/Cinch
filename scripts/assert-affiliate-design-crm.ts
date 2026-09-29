/**
 * Guard: kitchens made on an affiliate storefront are easy to find in the CRM.
 * Run: npx tsx scripts/assert-affiliate-design-crm.ts
 */
import {
  affiliateDesignCrmLine,
  affiliateStoreFromPath,
  designsByStore,
  designsForAffiliate,
  findAffiliateDesigns,
  isAffiliateCrmPage,
  isDesignSaveLabel,
  isDesignSaveUrl,
  listAffiliateDesigns,
  recordAffiliateDesign,
} from "../src/lib/affiliate-designs";
import {
  affiliateLogoName,
  isNumericAffiliateId,
} from "../src/lib/affiliate-logo";

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
    isAffiliateCrmPage("/affiliate", "?viewAs=8250001") &&
    !isAffiliateCrmPage("/store/kathmandu", "") &&
    isAffiliateCrmPage("/crm", ""),
  "CRM paint targets the affiliate desk, including view-as",
);
assert(
  isNumericAffiliateId("8250001") &&
    !isNumericAffiliateId("kathmandu") &&
    affiliateLogoName({ search: "?viewAs=8250001" }) === "Store" &&
    affiliateLogoName({
      search: "?viewAs=8250001",
      storeName: "Spartan Cabinets",
    }) === "Spartan Cabinets" &&
    affiliateStoreFromPath("/affiliate", "?viewAs=8250001").storeSlug ===
      "8250001",
  "viewAs=8250001 is an affiliate id, not a store name",
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
    const fromViewAs = await recordAffiliateDesign({
      seedId,
      storeSlug: "8250001",
      storeName: "Spartan Cabinets",
      title: "Cobalt kitchen",
      customerName: "Lee",
      href: "https://www.cabinetdealz.com/affiliate?viewAs=8250001",
    });
    const all = await listAffiliateDesigns(seedId);
    assert(
      designsByStore(listed)[0]?.storeName === "Spartan Cabinets",
      "CRM groups designs under the affiliate store",
    );
    assert(
      designsForAffiliate(all, "8250001").some((item) => item.id === fromViewAs.id) &&
        designsForAffiliate(all, "8250001").length === 1,
      "CRM can open just the designs for viewAs=8250001",
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
