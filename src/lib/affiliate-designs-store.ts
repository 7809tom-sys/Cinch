import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "./kv-store";
import {
  affiliateDesignCrmLine,
  affiliateStoreFromPath,
  cleanDesignField,
  pathFromHref,
  type AffiliateDesign,
  type AffiliateDesignKind,
} from "./affiliate-designs";
import { titleFromStoreSlug } from "./affiliate-logo";

type DesignStore = {
  designs: AffiliateDesign[];
};

const STORE_KEY = "affiliate-designs";
const MAX_DESIGNS = 500;
let memory: DesignStore | null = null;

async function ensureDesigns(): Promise<DesignStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<DesignStore>(STORE_KEY, { designs: [] });
  memory = { designs: loaded.designs ?? [] };
  return memory;
}

async function writeDesigns(store: DesignStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

function sameDesign(
  left: Pick<AffiliateDesign, "seedId" | "storeSlug" | "title" | "contact">,
  right: Pick<AffiliateDesign, "seedId" | "storeSlug" | "title" | "contact">,
): boolean {
  return (
    left.seedId === right.seedId &&
    left.storeSlug === right.storeSlug &&
    left.title === right.title &&
    left.contact === right.contact
  );
}

export async function recordAffiliateDesign(input: {
  seedId: string;
  storeSlug?: string | null;
  storeName?: string | null;
  title?: string | null;
  customerName?: string | null;
  contact?: string | null;
  kind?: string | null;
  href?: string | null;
}): Promise<AffiliateDesign> {
  const store = await ensureDesigns();
  const hrefParts = pathFromHref(input.href ?? "");
  const fromPath = affiliateStoreFromPath(hrefParts.pathname, hrefParts.search);
  const storeSlug = cleanDesignField(input.storeSlug || fromPath.storeSlug, 64);
  const storeName = cleanDesignField(
    input.storeName || fromPath.storeName || titleFromStoreSlug(storeSlug),
    48,
  );
  const kind: AffiliateDesignKind =
    input.kind === "requested" || input.kind === "quoted"
      ? input.kind
      : "saved";
  const next: AffiliateDesign = {
    id: randomUUID(),
    seedId: cleanDesignField(input.seedId, 80),
    storeSlug,
    storeName: storeName || "Store",
    title: cleanDesignField(input.title, 80) || "Kitchen design",
    customerName: cleanDesignField(input.customerName, 80),
    contact: cleanDesignField(input.contact, 80),
    kind,
    href: cleanDesignField(input.href, 240),
    createdAt: new Date().toISOString(),
  };

  const recent = store.designs.find((item) => {
    if (!sameDesign(item, next)) return false;
    return Date.now() - new Date(item.createdAt).getTime() < 2 * 60 * 1000;
  });
  if (recent) return recent;

  store.designs.unshift(next);
  store.designs = store.designs.slice(0, MAX_DESIGNS);
  await writeDesigns(store);
  return next;
}

export async function listAffiliateDesigns(
  seedId: string,
): Promise<AffiliateDesign[]> {
  const store = await ensureDesigns();
  return store.designs.filter((item) => item.seedId === seedId.trim());
}

export function publicAffiliateDesign(design: AffiliateDesign): {
  id: string;
  storeSlug: string;
  storeName: string;
  title: string;
  customerName: string;
  contact: string;
  kind: AffiliateDesignKind;
  href: string;
  createdAt: string;
  line: string;
} {
  return {
    id: design.id,
    storeSlug: design.storeSlug,
    storeName: design.storeName,
    title: design.title,
    customerName: design.customerName,
    contact: design.contact,
    kind: design.kind,
    href: design.href,
    createdAt: design.createdAt,
    line: affiliateDesignCrmLine(design),
  };
}
