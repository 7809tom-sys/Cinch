import {
  nameFromAffiliateRef,
  titleFromStoreSlug,
  viewAsValue,
} from "./affiliate-logo";

export type AffiliateDesignKind = "saved" | "requested" | "quoted";

export type AffiliateDesign = {
  id: string;
  seedId: string;
  storeSlug: string;
  storeName: string;
  title: string;
  customerName: string;
  contact: string;
  kind: AffiliateDesignKind;
  href: string;
  createdAt: string;
};

export function isAffiliateCrmPage(
  pathname?: string | null,
  search?: string | null,
): boolean {
  const path = (pathname ?? "").split("?")[0].toLowerCase();
  if (path === "/affiliate" || path.startsWith("/affiliate/")) {
    return true;
  }
  return /\/(crm|leads|designs)\b/.test(path);
}

export const AFFILIATE_DESK_ORIGIN = "https://www.cabinetdealz.com";

export function affiliateDeskHref(input: {
  storeSlug?: string | null;
  href?: string | null;
  section?: "crm" | null;
}): string {
  const fromHref = pathFromHref(input.href ?? "");
  const viewAs =
    viewAsValue(fromHref.search) || String(input.storeSlug ?? "").trim();
  const url = new URL("/affiliate", AFFILIATE_DESK_ORIGIN);
  if (viewAs) url.searchParams.set("viewAs", viewAs);
  if (input.section) url.searchParams.set("section", input.section);
  return url.toString();
}

export function designsForAffiliate(
  designs: AffiliateDesign[],
  storeRef?: string | null,
): AffiliateDesign[] {
  const ref = String(storeRef ?? "").trim().toLowerCase();
  if (!ref) return designs;
  return designs.filter(
    (item) =>
      item.storeSlug.toLowerCase() === ref ||
      item.storeName.toLowerCase() === ref,
  );
}

export function isDesignSaveUrl(url?: string | null): boolean {
  const value = String(url ?? "");
  return (
    /\/(designs?|kitchens?|quotes?|leads?|requests?|proposals?|packages?)(\/|\?|$)/i.test(
      value,
    ) || /[?&](design|quote|lead|request)=/i.test(value)
  );
}

export function isDesignSaveLabel(text?: string | null): boolean {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return (
    /\b(save|submit|send|request)\b.*\b(design|kitchen|layout|quote|request)\b/i.test(
      value,
    ) ||
    /\b(design|kitchen|layout|quote)\b.*\b(save|submit|send|request)\b/i.test(
      value,
    )
  );
}

export function cleanDesignField(value: string | null | undefined, max = 80): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function pathFromHref(href?: string | null): { pathname: string; search: string } {
  const value = href ?? "";
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      return { pathname: url.pathname, search: url.search };
    }
  } catch {
    /* use the raw value */
  }
  const q = value.indexOf("?");
  if (q >= 0) {
    return { pathname: value.slice(0, q), search: value.slice(q) };
  }
  return { pathname: value, search: "" };
}

export function affiliateStoreFromPath(pathname?: string | null, search?: string | null): {
  storeSlug: string;
  storeName: string;
} {
  const parsed = pathFromHref(pathname ?? "");
  const path = parsed.pathname || (pathname ?? "");
  const query = search ?? parsed.search;
  const store = path.match(/^\/(?:store|store-preview)\/([^/]+)/i);
  if (store?.[1]) {
    try {
      const slug = decodeURIComponent(store[1]);
      return { storeSlug: slug, storeName: titleFromStoreSlug(slug) };
    } catch {
      return { storeSlug: store[1], storeName: titleFromStoreSlug(store[1]) };
    }
  }
  const viewAs = viewAsValue(query);
  if (viewAs) {
    return {
      storeSlug: viewAs,
      storeName: nameFromAffiliateRef(viewAs),
    };
  }
  return { storeSlug: "", storeName: "" };
}

export function affiliateDesignCrmLine(
  design: Pick<AffiliateDesign, "storeName" | "title" | "customerName">,
): string {
  const store = design.storeName.trim() || "Store";
  const title = design.title.trim() || "Kitchen design";
  const who = design.customerName.trim() || "Customer";
  return `${store} · ${title} · ${who}`;
}

export function findAffiliateDesigns(
  designs: AffiliateDesign[],
  query: string,
): AffiliateDesign[] {
  const q = query.trim().toLowerCase();
  if (!q) return designs;
  return designs.filter((item) => {
    const hay = [
      item.storeName,
      item.storeSlug,
      item.title,
      item.customerName,
      item.contact,
      item.kind,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function designsByStore(designs: AffiliateDesign[]): Array<{
  storeName: string;
  storeSlug: string;
  items: AffiliateDesign[];
}> {
  const map = new Map<string, AffiliateDesign[]>();
  for (const item of designs) {
    const key = (item.storeSlug || item.storeName).toLowerCase() || "store";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()].map(([, items]) => ({
    storeSlug: items[0]?.storeSlug ?? "",
    storeName: items[0]?.storeName || "Store",
    items,
  }));
}
