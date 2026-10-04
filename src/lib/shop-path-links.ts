export type ShopPathStepId = "styles" | "designer" | "cart";

export type ShopPathStep = {
  id: ShopPathStepId;
  label: string;
  href: string;
};

export function shopPathPrefix(pathname?: string | null): string {
  const store = (pathname ?? "").split("?")[0].match(/^\/store\/([^/]+)/i);
  if (!store?.[1]) return "";
  try {
    return `/store/${decodeURIComponent(store[1])}`;
  } catch {
    return `/store/${store[1]}`;
  }
}

export function shopPathSteps(pathname?: string | null): ShopPathStep[] {
  const prefix = shopPathPrefix(pathname);
  return [
    {
      id: "styles",
      label: "Cabinet styles",
      href: prefix || "/styles",
    },
    {
      id: "designer",
      label: "Designer",
      href: prefix ? `${prefix}/design` : "/design",
    },
    {
      id: "cart",
      label: "Shopping cart",
      href: prefix ? `${prefix}/cart` : "/cart",
    },
  ];
}

export function currentShopStep(
  pathname?: string | null,
): ShopPathStepId | null {
  const path = (pathname ?? "").split("?")[0].toLowerCase();
  if (/(?:^|\/)cart\/?$/.test(path)) return "cart";
  if (/(?:^|\/)design(?:\/|$)/.test(path)) return "designer";
  if (
    path === "/styles" ||
    /(?:^|\/)kitchens\/?$/.test(path) ||
    /(?:^|\/)catalog\/?$/.test(path) ||
    /^\/store\/[^/]+\/?$/.test(path)
  ) {
    return "styles";
  }
  return null;
}

export function isShopPathPage(pathname?: string | null): boolean {
  return currentShopStep(pathname) !== null;
}

/** Designer canvas — keep shop-path chrome out of the 3D view. */
export function isDesignerShopPage(pathname?: string | null): boolean {
  return currentShopStep(pathname) === "designer";
}
