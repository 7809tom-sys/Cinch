import { ensureDeliveryOpsInSeed, saveDeliveryOps } from "./seed-delivery-io";
import type {
  DeliveryOps,
  DeliveryRestaurant,
  RestaurantMenuItem,
} from "./seed-delivery";
import { createProject, getProject, saveProject } from "./store";

/** One open town on hometownrunner.com. Stable so an empty store can plant it again. */
export const HOMETOWN_HOME_TOWN_ID = "hometown-home";
export const HOMETOWN_HOME_TOWN_NAME = "Hometown Runner";
export const HOMETOWN_HOME_TOWN_BRIEF =
  "Hometown Runner. The food comes from the streets you walk every day.";

const OPENED_AT = "2026-09-23T18:00:00.000Z";

function plate(input: {
  id: string;
  title: string;
  category: string;
  priceUsd: number;
  photoUrl: string;
  description: string;
  aliases: string[];
}): RestaurantMenuItem {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    draftPriceUsd: input.priceUsd,
    confirmedPriceUsd: input.priceUsd,
    source: "merchant",
    description: input.description,
    photoUrl: input.photoUrl,
    aliases: input.aliases,
    eightySixed: false,
  };
}

const HOME_KITCHENS: Record<
  string,
  { hours: string; items: RestaurantMenuItem[] }
> = {
  "rest-pilot": {
    hours: "Today 11am–9pm",
    items: [
      plate({
        id: "menu-pilot-bowl",
        title: "Warm grain bowl",
        category: "Plates",
        priceUsd: 14,
        photoUrl:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
        description: "Market Street. Packed to go.",
        aliases: ["grain bowl", "bowl", "grain"],
      }),
      plate({
        id: "menu-pilot-sandwich",
        title: "Market sandwich",
        category: "Plates",
        priceUsd: 12,
        photoUrl:
          "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80",
        description: "The sandwich regulars order.",
        aliases: ["sandwich"],
      }),
    ],
  },
  "rest-tacos": {
    hours: "Today 11am–10pm",
    items: [
      plate({
        id: "menu-taco-plate",
        title: "Taco plate",
        category: "Plates",
        priceUsd: 13,
        photoUrl:
          "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
        description: "Two tacos, rice, and salsa.",
        aliases: ["tacos", "taco", "street taco"],
      }),
      plate({
        id: "menu-taco-chips",
        title: "Chips and salsa",
        category: "Sides",
        priceUsd: 4,
        photoUrl:
          "https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=800&q=80",
        description: "For the table at home.",
        aliases: ["chips", "salsa"],
      }),
      plate({
        id: "menu-taco-agua",
        title: "Agua fresca",
        category: "Drinks",
        priceUsd: 3,
        photoUrl:
          "https://images.unsplash.com/photo-1544145945-f90425316c8e?auto=format&fit=crop&w=800&q=80",
        description: "A cold drink with the tacos.",
        aliases: ["agua", "drink"],
      }),
    ],
  },
  "rest-deli": {
    hours: "Today 10am–8pm",
    items: [
      plate({
        id: "menu-deli-soup",
        title: "Soup and half",
        category: "Lunch",
        priceUsd: 11,
        photoUrl:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
        description: "Cup of soup and a half sandwich.",
        aliases: ["soup", "half sandwich", "soup and sandwich"],
      }),
      plate({
        id: "menu-deli-cookie",
        title: "House cookie",
        category: "Sweets",
        priceUsd: 3,
        photoUrl:
          "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80",
        description: "Something sweet with the soup.",
        aliases: ["cookie"],
      }),
    ],
  },
};

/** A connected site or a crawl-built plate must survive the home-town plant. */
function kitchenHasWebsiteCrawl(row: DeliveryRestaurant): boolean {
  if (row.websiteConnected) return true;
  return (row.menu?.items ?? []).some(
    (item) => item.source === "ai_crawl" && item.id.startsWith("menu-crawl-"),
  );
}

/**
 * Confirm the three public kitchens. Other desks keep the starter bakery draft.
 * A kitchen that already connected a public menu keeps that crawl — planting
 * the demo plates again was wiping George Webb (and any other live menu)
 * on the next page load.
 */
export function openHomeTownMenus(ops: DeliveryOps): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      const home = HOME_KITCHENS[row.id];
      if (!home) return row;
      if (kitchenHasWebsiteCrawl(row)) return row;
      return {
        ...row,
        hours: home.hours,
        active: true,
        paused: false,
        menu: {
          sourceUrl: row.menu?.sourceUrl || row.websiteUrl || "",
          crawledAt: row.menu?.crawledAt || OPENED_AT,
          approvedAt: OPENED_AT,
          items: home.items,
        },
      };
    }),
  };
}

export function homeTownMenusAreOpen(ops: DeliveryOps): boolean {
  const tacos = ops.restaurants.find((row) => row.id === "rest-tacos");
  const plateOnMenu = tacos?.menu?.items.find((item) => item.id === "menu-taco-plate");
  return (
    plateOnMenu?.confirmedPriceUsd === 13 &&
    Boolean(plateOnMenu.photoUrl) &&
    tacos?.hours === "Today 11am–10pm"
  );
}

let plantingHomeTown: ReturnType<typeof plantHometownHomeTown> | null = null;

/**
 * Plant the open home town when this environment has no town yet.
 * Layout and page render together, so both callers share one plant.
 */
export function ensureHometownHomeTown() {
  if (!plantingHomeTown) {
    plantingHomeTown = plantHometownHomeTown().finally(() => {
      plantingHomeTown = null;
    });
  }
  return plantingHomeTown;
}

async function plantHometownHomeTown() {
  let project = await getProject(HOMETOWN_HOME_TOWN_ID);
  if (!project) {
    project = await createProject({
      id: HOMETOWN_HOME_TOWN_ID,
      name: HOMETOWN_HOME_TOWN_NAME,
      brief: HOMETOWN_HOME_TOWN_BRIEF,
      seedMode: "build",
    });
  }
  if (!project.sitePublishedAt) {
    project.sitePublishedAt = OPENED_AT;
    await saveProject(project);
  }
  // Menu fetches stay on the shop and merchant desks. Doing them here
  // blocked driver sign-in, then wrote an older snapshot over the new driver.
  const ops = await ensureDeliveryOpsInSeed(project, { crawl: false });
  if (ops && !homeTownMenusAreOpen(ops)) {
    await saveDeliveryOps(
      project.id,
      openHomeTownMenus(ops),
      "Opened the home town kitchens",
    );
  }
  return project;
}
