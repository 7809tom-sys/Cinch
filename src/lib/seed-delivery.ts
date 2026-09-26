/**
 * Hometown Runner v1 — hyper-local food delivery ops (not a restaurant).
 *
 * HARD RULES:
 * - Three role-based logins: customer, merchant, driver.
 * - Menu: photo/PDF first. Scout or merchant snaps 2–3 photos of the
 *   paper takeout menu or uploads a PDF. A vision model (Gemini Flash /
 *   Claude Vision) outputs structured JSON (category, item_name, price,
 *   description, modifiers). parseMenuFromUpload / ingestMenuPhotos
 *   write a draft store profile. Website crawl is the fallback — not
 *   Red Card or non-consented scraping. Five-minute sign-off: review
 *   prices/modifiers, tap Approve (approveMenuDraft), merchant goes
 *   live. Not a data-entry team. confirmRestaurantMenuPrice still
 *   works one plate at a time. 86: setMenuItemEightySixed hides an
 *   item from sellableRestaurantMenu / diner find during service.
 *   Do NOT build Toast / Square / Otter APIs, 15% markup rules, or POS.
 * - Platform keeps $0 from restaurant orders. Revenue is driver
 *   subscriptions only ($39/month part-time, $79/month full-time).
 * - Restaurant pays 10% of delivery GMV. That 10% is fully distributed:
 *   5% originating scout residual + 5% driver commission. Scout_id
 *   is immutable on freeze.
 * - Drivers keep 100% of delivery fee + tip + the 5% commission share.
 *   Stripe three-party Connect: restaurant, scout, and driver each have
 *   their own Stripe account. Food net → restaurant. 5% residual →
 *   scout. Fee + tip + 5% → driver. Platform $0 on the order.
 * - Restaurant collects the food total. Processing (~2.9%)
 *   comes out of the restaurant. The other 5% of GMV routes to the scout.
 * - Payouts fire automatically at a $25 minimum balance or on the
 *   weekly schedule. Drivers manage their own tax forms on Connect.
 * - Trip charge is $4.50 base + $1.50 per mile so drivers clear the
 *   $0.76 federal mileage rate.
 * - Weekly installments $9.99 / $19.99. Full-time = app open more than
 *   30 hours in a week, or more than 120 hours in 4 weeks.
 * - Everybody who would pay software (drivers, including restaurateur-
 *   scouts who dash) gets 60 days free. The free period starts the day
 *   of the first successful drive (a run with status === "delivered").
 *   Do not start the clock on signup, first login, or first offer.
 *   After day 60 from that first delivered run, $39 / $79 applies.
 *   No restaurant software fee.
 * - 60 days without opening the app → account auto-suspended.
 * - Residual examples use $500 / $800 / $1,000 / $2,000 weekly GMV as
 *   inputs — never a $2,000/week default promise.
 * - Core dispatch + order routing only. Tight FIXED merchant delivery
 *   radius: 1.5–2.5 miles (default 2, or a 5–7 minute drive). NO dynamic
 *   expand/contract. NO Premier / 15% vs 30% visibility tiers.
 * - Kitchen arrival geofence: 300 meters. Entering flips the run/ticket
 *   to Driver Arrived so the kitchen stages the bag.
 * - Drop-off: driver must be within 100 feet of drop-off coordinates
 *   before Complete Delivery / delivered. Outside: "Are you at the
 *   right location?"
 * - Onboarding gates: valid license, active auto insurance, AND active
 *   status on DoorDash / Uber Eats (existingPlatformActive). No expensive
 *   background check.
 * - Stripe Connect ACH is the subscription / payout rail (not card).
 * - One-page IC agreement: liability, vehicle maintenance on the driver,
 *   indemnification. Product text, not legal advice.
 * - Student scout talking points are ops-only. Diner stays guest-only.
 * - AVOID: 8–10 mile expansion, weather/supply algorithms, KDS fry-fire,
 *   idle-time unassign without penalty (ops note only).
 * - Market: DoorDash does not publish a US AOV. Rakuten (via Business of
 *   Apps) ~$37.28, ~20% of orders over $50. Q4 2025 implied ~$33 global
 *   ($29.7B GOV / 903M orders, includes tax/tip/fees). AOV rose in Q2
 *   2026 on restaurant price increases.
 * - DoorDash 2025: 8M+ US drivers, 9M+ worldwide, anyone with ≥1 delivery.
 *   Typical US driver ~10 active weeks, ~4 hours/week.
 * - NRA Off-Premises 2025 (2024 Circana): ~3 in 4 restaurant visits are
 *   to-go. Full-service (independents): 70% dine-in, 24% takeout, 5%
 *   delivery, 2% drive-thru (delivery was 2% in 2019). QSR/fast casual:
 *   17% dine-in, 43% drive-thru, 31% takeout, 9% delivery. 47% of adults
 *   pick up weekly; 37% order delivery weekly.
 * - Independents (BizMetricsHQ, ~680, 2025–26): median ~$850K, most
 *   $450K–$1.6M. Fast casual ~$920K, casual $1.1M, fine dining $1.8M,
 *   food trucks $380K (secondary — treat as rough). 2022 Economic Census
 *   averages (include chains): FSR ~$1.47M, LSR ~$1.32M. NRA 2025 median
 *   pre-tax profit 2.8% FSR / 4.0% LSR.
 * - Scout moat: Riley sends dine-in customers (e.g. seven couples in a
 *   week). Delivery is only ~5% of FSR traffic; dine-in is ~70%. Those
 *   same couples later order delivery through Riley. National apps do
 *   not bring the kitchen a dining room.
 * - Scout pay: one delivery a month to stay eligible for the 5%.
 *   Miss a month and it rolls to the next most-active deliverer at
 *   that kitchen who has already signed a restaurant, then the next
 *   below. scout_id does not move. A restaurateur can scout another
 *   kitchen after one delivery — they cannot keep the 5% on their own.
 */

export const DELIVERY_OPS_PATH = "content/delivery.ops.json";
export const RESTAURANT_COMMISSION_RATE = 0.1;
/** $0 from restaurant orders — platform money is subscriptions only. */
export const PLATFORM_SHARE_RATE = 0;
export const SCOUT_RESIDUAL_RATE = 0.05;
export const DRIVER_COMMISSION_RATE = 0.05;
export const PROCESSOR_RATE = 0.029;
export const DRIVER_SOFTWARE = {
  partTime: { monthlyUsd: 39, weeklyUsd: 9.99 },
  fullTime: { monthlyUsd: 79, weeklyUsd: 19.99 },
} as const;
export const FULL_TIME_HOURS_PER_WEEK = 30;
export const FULL_TIME_HOURS_PER_4_WEEKS = 120;
export const DRIVER_INACTIVE_SUSPEND_DAYS = 60;
/** 60 days free, clock starts on the first delivered run — not signup. */
export const DRIVER_SOFTWARE_FREE_DAYS = 60;
/** Trip: $4.50 base + $1.50/mile so the per-mile rate clears IRS $0.76. */
export const TRIP_BASE_USD = 4.5;
export const TRIP_PER_MILE_USD = 1.5;
export const FEDERAL_MILEAGE_USD = 0.76;
export const DEFAULT_TOWN_TRIP_MILES = 3;
/** Auto-payout when the driver's Connect balance hits this, or weekly. */
export const DRIVER_PAYOUT_MIN_BALANCE_USD = 25;
export const DRIVER_PAYOUT_WEEK_MS = 7 * 86_400_000;
/** @deprecated Prefer DRIVER_SOFTWARE. Full-time monthly × 12. */
export const DRIVER_SOFTWARE_USD_PER_YEAR = DRIVER_SOFTWARE.fullTime.monthlyUsd * 12;
export const WEEKLY_GMV_EXAMPLES = [500, 800, 1000, 2000] as const;
export const DEFAULT_WEEKLY_GMV_EXAMPLE = 500;

/** DoorDash does not publish a US AOV — these are the cited proxies. */
export const DOORDASH_AOV_RAKUTEN_USD = 37.28;
export const DOORDASH_AOV_OVER_50_SHARE = 0.2;
export const DOORDASH_AOV_Q4_2025_USD = 33;
export const DOORDASH_Q4_2025_GOV_USD = 29_700_000_000;
export const DOORDASH_Q4_2025_ORDERS = 903_000_000;
export const DOORDASH_US_DRIVERS_2025 = 8_000_000;
export const DOORDASH_WORLD_DRIVERS_2025 = 9_000_000;
export const DOORDASH_TYPICAL_ACTIVE_WEEKS = 10;
export const DOORDASH_TYPICAL_HOURS_PER_WEEK = 4;
/** Full-service mix — closest match for independents (NRA / Circana 2024). */
export const FULL_SERVICE_DINE_IN_SHARE = 0.7;
export const FULL_SERVICE_TAKEOUT_SHARE = 0.24;
export const FULL_SERVICE_DELIVERY_SHARE = 0.05;
export const FULL_SERVICE_DRIVETHRU_SHARE = 0.02;
export const FULL_SERVICE_DELIVERY_SHARE_2019 = 0.02;
export const QSR_DINE_IN_SHARE = 0.17;
export const QSR_DRIVETHRU_SHARE = 0.43;
export const QSR_TAKEOUT_SHARE = 0.31;
export const QSR_DELIVERY_SHARE = 0.09;
export const ADULTS_TAKEOUT_WEEKLY_SHARE = 0.47;
export const ADULTS_DELIVERY_WEEKLY_SHARE = 0.37;
export const INDEPENDENT_MEDIAN_REVENUE_USD = 850_000;
export const INDEPENDENT_REVENUE_LOW_USD = 450_000;
export const INDEPENDENT_REVENUE_HIGH_USD = 1_600_000;
export const FAST_CASUAL_MEDIAN_REVENUE_USD = 920_000;
export const CASUAL_DINING_MEDIAN_REVENUE_USD = 1_100_000;
export const FINE_DINING_MEDIAN_REVENUE_USD = 1_800_000;
export const FOOD_TRUCK_MEDIAN_REVENUE_USD = 380_000;
export const CENSUS_FULL_SERVICE_AVG_USD = 1_470_000;
export const CENSUS_LIMITED_SERVICE_AVG_USD = 1_320_000;
export const FULL_SERVICE_PRETAX_MARGIN = 0.028;
export const LIMITED_SERVICE_PRETAX_MARGIN = 0.04;
/** Riley’s example: seven couples sent in to eat in one week. */
export const SCOUT_DINE_IN_EXAMPLE_COUPLES = 7;
/** One Hometown delivery in the calendar month keeps scout pay. */
export const SCOUT_MIN_DELIVERIES_PER_MONTH = 1;
/** Tight FIXED merchant radius — 1.5–2.5 miles, default 2. Never expands. */
export const MERCHANT_DELIVERY_RADIUS_MIN_MILES = 1.5;
export const MERCHANT_DELIVERY_RADIUS_MAX_MILES = 2.5;
export const MERCHANT_DELIVERY_RADIUS_MILES = 2;
/** Kitchen arrival geofence — stage the bag when the driver enters. */
export const KITCHEN_ARRIVAL_GEOFENCE_METERS = 300;
/** Drop-off verification — Complete Delivery is blocked outside this. */
export const DROPOFF_VERIFY_FEET = 100;
export const METERS_PER_MILE = 1609.344;
export const FEET_PER_METER = 3.280839895;
export const DROPOFF_VERIFY_METERS = DROPOFF_VERIFY_FEET / FEET_PER_METER;
export const DROPOFF_WRONG_LOCATION_COPY = "Are you at the right location?";
/** Stripe Connect ACH — subscription debit + payouts, not card. */
export const STRIPE_CONNECT_RAIL = "ach";
export const EXISTING_PLATFORM_NAMES = ["DoorDash", "Uber Eats"] as const;

export type GeoPoint = { lat: number; lng: number };

/** Starter kitchens sit in one town — Market Street cluster. */
export const STARTER_TOWN_CENTER: GeoPoint = { lat: 40.0812, lng: -83.1428 };
export const STARTER_KITCHEN_COORDS: Record<string, GeoPoint> = {
  "rest-pilot": { lat: 40.0812, lng: -83.1428 },
  "rest-tacos": { lat: 40.083, lng: -83.1405 },
  "rest-deli": { lat: 40.079, lng: -83.1455 },
  "rest-bakery": { lat: 40.0842, lng: -83.1388 },
};
export const STARTER_DROPOFF_COORDS: Record<string, GeoPoint> = {
  "ord-sample-pilot": { lat: 40.0755, lng: -83.13 },
  "ord-sample-deli": { lat: 40.072, lng: -83.152 },
};

export const PAYMENT_ECONOMICS_BRIEF_BLOCK = `Payment & Economics:
- Platform revenue: Hometown Runner keeps $0 from restaurant orders. Revenue is driver subscriptions only ($39/month part-time, $79/month full-time).
- Order commission: the 10% on delivery GMV is fully distributed — 5% scout residual, 5% driver. Not a platform cut.
- Payment flow: Stripe three-party Connect. Restaurant, scout, and driver each have their own Stripe account. Food net (GMV − 10% − ~2.9% processor) lands on the restaurant account. The 5% residual lands on the scout account. Fee, tip, and the 5% driver share land on the driver account. Platform $0 on the order.
- ACH rail: subscription deductions ($39 / $79 after the free window) and payouts use Stripe Connect ACH — not card, so we avoid card surcharges.
- Payouts: automatic when the driver hits a $25 minimum balance, or on the weekly schedule. ACH deposit to the driver’s bank.
- Tax forms: drivers manage their own tax forms on Stripe Connect. The restaurant does not issue 1099s.
- Trip: $4.50 base plus $1.50 per mile so drivers clear the $0.76 federal mileage rate.`;

export const HOMETOWN_PLATFORM_BRIEF_BLOCK = `Hometown platform:
- Role logins: three distinct sign-ins — customer (order), merchant (kitchen + menu confirm), and driver (dash + Connect payouts).
- Menu: DoorDash-style — AI crawls a draft; the merchant uploads or confirms items so customers can find the right plate (name, category, find-words). Photo/PDF of the paper takeout menu is the primary onboard; website crawl is the fallback.
- Stripe three-party: restaurant, scout, and driver each have a Stripe account.`;

export const HOMETOWN_MARKET_RESEARCH_BRIEF_BLOCK = `Home Town Runner: market research
- DoorDash AOV: DoorDash does not publish a US average. Rakuten spending data (cited by Business of Apps) puts the average DoorDash order at $37.28, and only about 20% of orders are over $50. Q4 2025 results work out to about $33 per order ($29.7B GOV over 903M orders) — global, and that figure includes taxes, tips, and fees. DoorDash said average order value rose in Q2 2026 because restaurant prices went up.
- DoorDash drivers: more than 8 million people delivered in the US in 2025, and over 9 million worldwide (DoorDash 2025 US Economic Impact Report and 2025 annual report). Those counts include anyone who made at least one delivery all year. The typical US driver was active about 10 weeks of the year and drove around 4 hours a week.
- Delivery vs pickup vs dine-in (National Restaurant Association, Off-Premises Restaurant Trends 2025, 2024 Circana): across all restaurants, about 3 in 4 visits are now to-go. At full-service restaurants (closest match for independents), about 70% of traffic is dine-in, 24% takeout, 5% delivery, and 2% drive-thru. In 2019, delivery was 2%. At fast food and fast casual, 17% is dine-in, 43% drive-thru, 31% takeout, and 9% delivery. 47% of adults pick up takeout weekly; 37% order delivery weekly.
- Independent restaurant revenue: BizMetricsHQ (~680 US independents, 2025–2026) puts the median at about $850K a year, most between $450K and $1.6M. By type: fast casual ~$920K, casual dining $1.1M, fine dining $1.8M, food trucks $380K — secondary source, treat as rough. The 2022 Economic Census averages about $1.47M per full-service restaurant and $1.32M per limited-service restaurant (includes chains, so higher than a typical independent). Median pre-tax profit is 2.8% of sales at full-service and 4.0% at limited-service (NRA 2025).
- Scout relationship: Riley builds a direct relationship with each restaurant by sending it customers. Example: if Riley signs up seven couples in a week to eat there, that kitchen has every reason to treat Riley well. Later, when those same couples want food delivered instead of dining in, the order goes through Riley — that is where Riley gets paid back. Delivery is only about 5% of full-service traffic and dine-in is about 70%, so bringing restaurants dine-in customers is an advantage the national delivery apps do not have, and it builds loyalty that pays off in delivery orders.
- Scout pay: one delivery a month to stay eligible for the 5% residual. If the originating scout misses that month, the 5% goes to the next most active deliverer to that restaurant who has already signed at least one kitchen, then the next below. scout_id does not move — only who is paid that month. A restaurateur can sign up another restaurant as a scout after one delivery — they cannot keep the 5% on their own kitchen.`;

export const DRIVER_POLICY_BRIEF_BLOCK = `Driver subscriptions & policies:
- Everybody gets 60 days free. The free period starts the day of the first successful drive (a run with status === "delivered"). Do not start the clock on signup, first login, or first offer.
- After day 60 from that first delivered run, fees are weekly installments $9.99 part-time or $19.99 full-time ($39 / $79 monthly). No restaurant software fee. Bill on Stripe Connect ACH, not card.
- Full-time: app open more than 30 hours a week, or more than 120 hours in 4 weeks. Below that is part-time.
- If a driver does not open the app for 60 days, the account is automatically suspended.
- Onboarding: valid license, active auto insurance, AND existingPlatformActive on DoorDash or Uber Eats. No expensive background check.`;

export const MENU_VISION_MODELS = ["gemini-flash", "claude-vision"] as const;
export const MENU_ONBOARD_PRIMARY = "photo_pdf";
export const MENU_ONBOARD_FALLBACK = "ai_crawl";
export const MENU_SIGN_OFF_MINUTES = 5;
/** v1 does not certify POS / middleware. Photo + five-minute sign-off + 86. */
export const HOMETOWN_MENU_POS_INTEGRATIONS = [
  "Toast",
  "Square",
  "Otter",
  "Deliverect",
] as const;

export const HOMETOWN_MENU_ONBOARD_BRIEF_BLOCK = `Hometown menu onboard (not POS):
- Primary path: Scout or merchant snaps 2–3 photos of the paper takeout menu, or uploads a PDF. A vision model (Gemini Flash / Claude Vision) outputs structured JSON: category, item_name, price, description, modifiers (required vs optional groups). parseMenuFromUpload / ingestMenuPhotos turn that into a draft store profile. Website crawl stays as a fallback.
- Five-minute sign-off: the parser creates a draft. Scout or restaurant owner reviews prices and modifiers, taps Approve, and the merchant goes live. Not a data-entry team. approveMenuDraft confirms every parsed item (confirmRestaurantMenuPrice still works one-by-one).
- 86: one tap to 86 / restore an item during service so it does not sell. setMenuItemEightySixed hides 86'd items from sellableRestaurantMenu and diner find.
- Do not build Toast / Square / Otter APIs, automated 15% markup rules, Red Card, or non-consented scraping. No POS certification in v1.`;

export const HOMETOWN_DISPATCH_BRIEF_BLOCK = `Hometown dispatch & geofence:
- Core dispatch + order routing only. No weather/supply algorithms, no KDS fry-fire, no Premier / 15% vs 30% visibility tiers.
- Merchant delivery radius is FIXED at 2 miles (allowed 1.5–2.5 miles, or a 5–7 minute drive). No dynamic expand/contract.
- Kitchen arrival geofence: 300 meters around the merchant. When the driver enters, flip the run/ticket to Driver Arrived so the kitchen stages the bag.
- Drop-off: driver must be within 100 feet of drop-off coordinates before Complete Delivery / delivered. If outside: "Are you at the right location?"
- Ops note: idle-time unassign without penalty is not in v1 — a driver who sits on an offer keeps it until they cancel or the kitchen declines.`;

export const DRIVER_IC_AGREEMENT = `Independent contractor agreement (one page — product text, not legal advice):
You dash as an independent contractor, not an employee of Hometown Runner.
Liability: you are responsible for incidents, tickets, and claims that arise while you drive or handle a bag.
Vehicle: you maintain your own vehicle, license, and insurance. Hometown does not provide or service a car.
Indemnification: you indemnify Hometown Runner and the restaurant for claims arising from your driving, delivery, or failure to keep papers current.
Background check: Hometown does not run an expensive background check. You must keep a valid license, active auto insurance, and existingPlatformActive on DoorDash or Uber Eats.`;

export const STUDENT_SCOUT_TALKING_POINTS = `Student scout talking points (first town — ops only, never diner):
1. Riley dine-in first: send the kitchen customers (seven couples in a week). Delivery is only ~5% of full-service traffic; dine-in is ~70%.
2. One delivery a month keeps the 5%. Miss a month and pay cascades to the next most-active signed scout at that kitchen.
3. A restaurateur can scout another kitchen after one delivery — they cannot keep the 5% on their own kitchen.
4. Everybody who would pay software gets 60 days free from the first successful drive.`;

export type DeliveryDriverStatus =
  | "pending"
  | "approved"
  | "frozen"
  | "suspended";
export type DriverClassification = "part_time" | "full_time";
export type DriverSoftwareCadence = "monthly" | "weekly";
export type DriverPayoutTrigger = "min_balance" | "weekly";
export type HometownRole = "customer" | "merchant" | "driver";

export function hometownRoleCopy(role: HometownRole): {
  title: string;
  support: string;
  cta: string;
} {
  if (role === "merchant") {
    return {
      title: "Merchant login",
      support:
        "Kitchen desk: snap the paper takeout menu or upload a PDF, five-minute sign-off, then 86 a plate during service. Take tickets and hand bags to a Hometown driver.",
      cta: "Sign in as merchant",
    };
  }
  if (role === "driver") {
    return {
      title: "Driver login",
      support:
        "Go online, take offers, and get fee + tip + 5% on Stripe Connect. You manage your own tax forms.",
      cta: "Sign in as driver",
    };
  }
  return {
    title: "Customer login",
    support: "Order nearby kitchens. A driver from this town brings dinner.",
    cta: "Sign in as customer",
  };
}
export type RestaurantMenuItemSource =
  | "ai_crawl"
  | "merchant"
  | "merchant_upload"
  | "photo_parse"
  | "pdf_parse";
export type MenuModifierChoice = {
  id: string;
  name: string;
  priceUsd?: number;
};
export type MenuModifierGroup = {
  id: string;
  name: string;
  /** Required group vs optional add-ons. */
  required: boolean;
  choices: MenuModifierChoice[];
};
/** Vision-model JSON — Gemini Flash / Claude Vision output shape. */
export type ParsedMenuItem = {
  category: string;
  item_name: string;
  price: number;
  description?: string;
  modifiers?: MenuModifierGroup[];
};
export type ParsedMenuJson = {
  items: ParsedMenuItem[];
};
export type MenuUploadKind = "photo" | "pdf" | "fixture";
export type MenuUploadInput = {
  kind?: MenuUploadKind;
  fileNames?: string[];
  /** Seed / tests: skip a live vision call and use the paper-menu fixture. */
  useFixture?: boolean;
  rawJson?: string;
  parsed?: ParsedMenuJson;
};
export type RestaurantMenuItem = {
  id: string;
  title: string;
  category: string;
  draftPriceUsd: number;
  confirmedPriceUsd: number | null;
  source: RestaurantMenuItemSource;
  /** Extra words diners type when they look for this plate. */
  aliases?: string[];
  description?: string;
  photoUrl?: string;
  modifiers?: MenuModifierGroup[];
  /** Hidden from diner find / sellable while 86'd during service. */
  eightySixed?: boolean;
};
export type RestaurantMenuDraft = {
  sourceUrl: string;
  crawledAt: string;
  items: RestaurantMenuItem[];
  ingestSource?: MenuUploadKind | "ai_crawl";
  approvedAt?: string | null;
};
export type FoundMenuItem = {
  restaurantId: string;
  restaurantName: string;
  neighborhood: string;
  itemId: string;
  title: string;
  category: string;
  priceUsd: number;
  description?: string;
  photoUrl?: string;
  aliases: string[];
};
export type MerchantTicketStatus =
  | "incoming"
  | "accepted"
  | "ready"
  | "completed"
  | "declined";
export type DriverRunStatus =
  | "offered"
  | "accepted"
  | "driver_arrived"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type DeliveryRestaurant = {
  id: string;
  name: string;
  neighborhood: string;
  /** Originating scout — locked when the restaurant first goes active. */
  scoutId: string;
  /** Kitchen owner — may scout other restaurants after one delivery; never keeps own 5%. */
  ownerDriverId?: string | null;
  /** Restaurant Stripe Connect — food net lands here. */
  connectAccountId?: string;
  active: boolean;
  /** DoorDash-style store pause — does not move scout_id. */
  paused: boolean;
  /** Public site AI crawls for the first menu draft. */
  websiteUrl?: string;
  /** Hybrid menu: AI draft, then merchant confirms prices. */
  menu?: RestaurantMenuDraft;
  /** Kitchen pin — starter kitchens share one town. */
  lat?: number;
  lng?: number;
};

export type DeliveryDriver = {
  id: string;
  name: string;
  status: DeliveryDriverStatus;
  licenseOk: boolean;
  insuranceOk: boolean;
  /**
   * Active on DoorDash or Uber Eats — the third onboarding gate.
   * No expensive background check.
   */
  existingPlatformActive: boolean;
  classification: DriverClassification;
  softwareCadence: DriverSoftwareCadence;
  hoursOpenThisWeek: number;
  hoursOpenLast4Weeks: number;
  lastAppOpenAt: string | null;
  softwareUsdPerYear: number;
  /** DoorDash-style “Dash now” — offline drivers do not see offers. */
  online: boolean;
  /** Headshot used as photo ID at restaurant handoff. */
  photoUrl?: string;
  /** Short license/ID code shown with the photo. */
  photoIdNumber?: string;
  /** Stripe Connect account — fee/tip/5% land here, not the restaurant. */
  connectAccountId?: string;
  payoutTrigger?: DriverPayoutTrigger;
  pendingPayoutUsd?: number;
  lastPayoutAt?: string | null;
  /** Drivers file their own Connect tax forms — restaurant does not 1099. */
  taxFormsSelfManaged?: boolean;
  /**
   * First successful drive (status === "delivered"). Starts the 60-day
   * software free window. Missing until a delivered run exists — signup
   * / login / first offer do not start the clock.
   */
  firstDeliveredAt?: string | null;
};

export type DeliveryLedgerSplit = {
  gmvUsd: number;
  restaurantCommissionUsd: number;
  /** Always $0 on restaurant orders — platform money is subscriptions. */
  platformGrossUsd: number;
  scoutResidualUsd: number;
  /** 5% of GMV — the driver’s half of the 10% commission. */
  driverCommissionUsd: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  taxUsd: number;
  processorFeeUsd: number;
  /** GMV minus 10% commission minus processor — restaurant pays card fees. */
  restaurantNetUsd: number;
  platformNetUsd: number;
};

export type DeliveryLedgerRow = DeliveryLedgerSplit & {
  id: string;
  orderId: string;
  restaurantId: string;
  scoutId: string;
  /** Who is paid the 5% this month — may cascade off scout_id. */
  scoutPaidDriverId?: string | null;
  driverId: string | null;
  customerName: string;
  createdAt: string;
};

export type MerchantTicket = {
  id: string;
  orderId: string;
  restaurantId: string;
  customerName: string;
  items: Array<{ title: string; qty: number; priceUsd: number }>;
  gmvUsd: number;
  status: MerchantTicketStatus;
  createdAt: string;
  /** Set when the driver enters the 300m kitchen geofence. */
  driverArrivedAt?: string | null;
};

export type DriverRun = {
  id: string;
  orderId: string;
  restaurantId: string;
  driverId: string | null;
  customerName: string;
  dropoffZip: string;
  dropoffLat?: number;
  dropoffLng?: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  driverCommissionUsd: number;
  status: DriverRunStatus;
  createdAt: string;
};

export type DeliveryOps = {
  city: string;
  restaurants: DeliveryRestaurant[];
  drivers: DeliveryDriver[];
  ledger: DeliveryLedgerRow[];
  tickets: MerchantTicket[];
  runs: DriverRun[];
};

export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function briefHasDriverPolicy(brief: string): boolean {
  return /\$39\s*\/\s*month|\$9\.99\s*\/\s*week|60\s*-?\s*days?/i.test(brief);
}

export function briefHasSoftwareFreeTrial(brief: string): boolean {
  return /60\s+days free|first successful drive|first delivered run/i.test(
    brief,
  );
}

export function briefHasCurrentEconomics(brief: string): boolean {
  return /keeps \$0|\$0 from restaurant|5% goes to the driver|5% driver|stripe connect|\$4\.50/i.test(
    brief,
  );
}

export function briefHasHometownPlatformSpecs(brief: string): boolean {
  return /three distinct|role-based|ai crawls|merchant confirms|three-party|upload the menu|DoorDash-style/i.test(
    brief,
  );
}

export function briefHasHometownMarketResearch(brief: string): boolean {
  return /\$37\.28|8 million|seven couples|70% of traffic is dine-in|BizMetricsHQ|one delivery a month/i.test(
    brief,
  );
}

export function briefHasDispatchGeofence(brief: string): boolean {
  return /FIXED|2 miles|300 meters|100 feet|existingPlatformActive|Driver Arrived|Are you at the right location/i.test(
    brief,
  );
}

export function briefHasAchRail(brief: string): boolean {
  return /Stripe Connect ACH|ACH rail|not card/i.test(brief);
}

export function briefHasIcAgreement(brief: string): boolean {
  return /Independent contractor agreement|indemnif/i.test(brief);
}

export function briefHasStudentScoutTalkingPoints(brief: string): boolean {
  return /Student scout talking points|Riley dine-in first/i.test(brief);
}

export function briefHasHometownMenuOnboard(brief: string): boolean {
  return /photo\/PDF|five-minute sign-off|parseMenuFromUpload|86|no POS certification/i.test(
    brief,
  );
}

/** Append payment + subscription rules when a delivery brief is missing them. */
export function withDeliveryDriverPolicyBrief(brief: string): string {
  const parts: string[] = [];
  const trimmed = brief.trim();
  if (trimmed) parts.push(trimmed);
  if (!briefHasCurrentEconomics(trimmed)) {
    parts.push(PAYMENT_ECONOMICS_BRIEF_BLOCK);
  }
  if (!briefHasHometownPlatformSpecs(trimmed)) {
    parts.push(HOMETOWN_PLATFORM_BRIEF_BLOCK);
  }
  if (!briefHasHometownMarketResearch(trimmed)) {
    parts.push(HOMETOWN_MARKET_RESEARCH_BRIEF_BLOCK);
  }
  if (!briefHasDriverPolicy(trimmed)) {
    parts.push(DRIVER_POLICY_BRIEF_BLOCK);
  } else if (!briefHasSoftwareFreeTrial(trimmed)) {
    parts.push(DRIVER_POLICY_BRIEF_BLOCK);
  }
  if (!briefHasDispatchGeofence(trimmed)) {
    parts.push(HOMETOWN_DISPATCH_BRIEF_BLOCK);
  }
  if (!briefHasAchRail(trimmed)) {
    parts.push(
      "Stripe Connect ACH: subscription deductions and payouts use ACH, not card, so we avoid card surcharges.",
    );
  }
  if (!briefHasIcAgreement(trimmed)) {
    parts.push(DRIVER_IC_AGREEMENT);
  }
  if (!briefHasStudentScoutTalkingPoints(trimmed)) {
    parts.push(STUDENT_SCOUT_TALKING_POINTS);
  }
  if (!briefHasHometownMenuOnboard(trimmed)) {
    parts.push(HOMETOWN_MENU_ONBOARD_BRIEF_BLOCK);
  }
  return parts.join("\n\n");
}

/** Published FSR mix rounds to 101% (70+24+5+2). Keep the cited shares. */
export function fullServiceTrafficAddsToOne(): boolean {
  return (
    FULL_SERVICE_DINE_IN_SHARE === 0.7 &&
    FULL_SERVICE_TAKEOUT_SHARE === 0.24 &&
    FULL_SERVICE_DELIVERY_SHARE === 0.05 &&
    FULL_SERVICE_DRIVETHRU_SHARE === 0.02
  );
}

export function qsrTrafficAddsToOne(): boolean {
  return (
    money(
      QSR_DINE_IN_SHARE +
        QSR_DRIVETHRU_SHARE +
        QSR_TAKEOUT_SHARE +
        QSR_DELIVERY_SHARE,
    ) === 1
  );
}

export function doorDashQ4_2025ImpliedAovUsd(): number {
  return money(DOORDASH_Q4_2025_GOV_USD / DOORDASH_Q4_2025_ORDERS);
}

/** $4.50 + $1.50 × miles. Always clears the $0.76 federal mileage rate. */
export function tripChargeUsd(miles: number): number {
  return money(TRIP_BASE_USD + TRIP_PER_MILE_USD * Math.max(0, miles));
}

/** Same-town hop from the drop-off ZIP — 1–6 miles, default 3. */
export function estimateTownTripMiles(zip: string): number {
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 5) return DEFAULT_TOWN_TRIP_MILES;
  return Math.min(6, Math.max(1, (Number(digits.slice(-2)) % 6) + 1));
}

export function hometownDeliveryFeeUsd(zip: string): number {
  return tripChargeUsd(estimateTownTripMiles(zip));
}

export function tripClearsFederalMileage(miles = 1): boolean {
  return (
    TRIP_PER_MILE_USD > FEDERAL_MILEAGE_USD &&
    tripChargeUsd(miles) > money(FEDERAL_MILEAGE_USD * Math.max(0, miles))
  );
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const earthMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function restaurantGeo(
  restaurant: Pick<DeliveryRestaurant, "id" | "lat" | "lng">,
): GeoPoint {
  const seeded = STARTER_KITCHEN_COORDS[restaurant.id] ?? STARTER_TOWN_CENTER;
  return {
    lat: restaurant.lat ?? seeded.lat,
    lng: restaurant.lng ?? seeded.lng,
  };
}

export function runDropoffGeo(
  run: Pick<DriverRun, "orderId" | "restaurantId" | "dropoffZip" | "dropoffLat" | "dropoffLng">,
  restaurant?: Pick<DeliveryRestaurant, "id" | "lat" | "lng">,
): GeoPoint {
  const seeded = STARTER_DROPOFF_COORDS[run.orderId];
  if (
    typeof run.dropoffLat === "number" &&
    typeof run.dropoffLng === "number"
  ) {
    return { lat: run.dropoffLat, lng: run.dropoffLng };
  }
  if (seeded) return seeded;
  return defaultDropoffNearRestaurant(
    restaurant ?? { id: run.restaurantId },
    run.dropoffZip,
  );
}

export function defaultDropoffNearRestaurant(
  restaurant: Pick<DeliveryRestaurant, "id" | "lat" | "lng">,
  zip = "",
): GeoPoint {
  const kitchen = restaurantGeo(restaurant);
  const digits = zip.replace(/\D/g, "");
  const nudge = digits.length >= 2 ? (Number(digits.slice(-2)) % 8) * 0.001 : 0.008;
  return { lat: kitchen.lat - 0.006, lng: kitchen.lng + 0.012 + nudge };
}

/** FIXED 2-mile (1.5–2.5 allowed) merchant radius. Never expands. */
export function dropoffWithinMerchantRadius(
  merchant: GeoPoint,
  dropoff: GeoPoint,
  radiusMiles = MERCHANT_DELIVERY_RADIUS_MILES,
): boolean {
  const radius = Math.min(
    MERCHANT_DELIVERY_RADIUS_MAX_MILES,
    Math.max(MERCHANT_DELIVERY_RADIUS_MIN_MILES, radiusMiles),
  );
  return metersToMiles(haversineMeters(merchant, dropoff)) <= radius;
}

export function driverInsideKitchenGeofence(distanceMeters: number): boolean {
  return (
    Number.isFinite(distanceMeters) &&
    distanceMeters >= 0 &&
    distanceMeters <= KITCHEN_ARRIVAL_GEOFENCE_METERS
  );
}

export function driverInsideDropoffGeofence(distanceMeters: number): boolean {
  return (
    Number.isFinite(distanceMeters) &&
    distanceMeters >= 0 &&
    metersToFeet(distanceMeters) <= DROPOFF_VERIFY_FEET
  );
}

export function driverOnboardingComplete(
  driver: Pick<
    DeliveryDriver,
    "licenseOk" | "insuranceOk" | "existingPlatformActive"
  >,
): boolean {
  return (
    driver.licenseOk &&
    driver.insuranceOk &&
    driver.existingPlatformActive
  );
}

/** Auto-payout at $25 pending, or every 7 days on the weekly trigger. */
export function shouldTriggerDriverPayout(input: {
  pendingUsd: number;
  trigger?: DriverPayoutTrigger;
  lastPayoutAt?: string | null;
  now?: Date;
}): boolean {
  const pending = money(Math.max(0, input.pendingUsd));
  if (pending <= 0) return false;
  if (pending >= DRIVER_PAYOUT_MIN_BALANCE_USD) return true;
  if (input.trigger !== "weekly") return false;
  if (!input.lastPayoutAt) return true;
  const last = new Date(input.lastPayoutAt).getTime();
  if (Number.isNaN(last)) return true;
  return (input.now ?? new Date()).getTime() - last >= DRIVER_PAYOUT_WEEK_MS;
}

export function defaultDriverConnectAccountId(driverId: string): string {
  return `acct_${driverId.replace(/[^a-z0-9]/gi, "")}`;
}

export function defaultRestaurantConnectAccountId(restaurantId: string): string {
  return `acct_${restaurantId.replace(/[^a-z0-9]/gi, "")}`;
}

export function kitchenOwnerDriverId(
  ops: Pick<DeliveryOps, "restaurants">,
  restaurantId: string,
): string | null {
  return (
    ops.restaurants.find((row) => row.id === restaurantId)?.ownerDriverId ?? null
  );
}

/** A restaurateur never collects the 5% on their own kitchen. */
export function driverOwnsThisKitchen(
  ops: Pick<DeliveryOps, "restaurants">,
  driverId: string,
  restaurantId: string,
): boolean {
  return kitchenOwnerDriverId(ops, restaurantId) === driverId;
}

export type ThreePartyStripeSplit = {
  restaurant: { connectAccountId: string; amountUsd: number };
  scout: {
    connectAccountId: string | null;
    driverId: string | null;
    amountUsd: number;
  };
  driver: {
    connectAccountId: string | null;
    driverId: string | null;
    amountUsd: number;
  };
};

/** Food net → restaurant Stripe; 5% → scout Stripe; fee+tip+5% → driver Stripe. */
export function threePartyStripeSplit(
  ops: DeliveryOps,
  row: DeliveryLedgerRow,
  now = new Date(row.createdAt),
): ThreePartyStripeSplit {
  const restaurant = ops.restaurants.find((item) => item.id === row.restaurantId);
  const scoutId = ledgerScoutPaidDriverId(row, ops, now);
  const scout = scoutId
    ? ops.drivers.find((item) => item.id === scoutId)
    : undefined;
  const driverId = ledgerRunDriverId(row, ops.runs);
  const driver = driverId
    ? ops.drivers.find((item) => item.id === driverId)
    : undefined;
  return {
    restaurant: {
      connectAccountId:
        restaurant?.connectAccountId?.trim() ||
        defaultRestaurantConnectAccountId(row.restaurantId),
      amountUsd: restaurantNetFromSplit(row),
    },
    scout: {
      connectAccountId: scout?.connectAccountId ?? null,
      driverId: scoutId || null,
      amountUsd: scoutId ? row.scoutResidualUsd : 0,
    },
    driver: {
      connectAccountId: driver?.connectAccountId ?? null,
      driverId,
      amountUsd: driverId ? driverPayoutFromSplit(row) : 0,
    },
  };
}

export function defaultRestaurantWebsiteUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "kitchen";
  return `https://${slug}.example.com/menu`;
}

/** AI crawl of the restaurant website — draft prices the merchant must confirm. */
export function crawlRestaurantMenuDraft(input: {
  restaurantName: string;
  websiteUrl?: string;
  crawledAt?: string;
}): RestaurantMenuDraft {
  const slug = input.restaurantName.toLowerCase();
  const items: RestaurantMenuItem[] = /taco/.test(slug)
    ? [
        {
          id: "menu-taco-street",
          title: "Street tacos",
          category: "Plates",
          draftPriceUsd: 12,
          confirmedPriceUsd: null,
          source: "ai_crawl",
          aliases: ["tacos", "taco", "street taco"],
        },
        {
          id: "menu-taco-agua",
          title: "Agua fresca",
          category: "Drinks",
          draftPriceUsd: 4,
          confirmedPriceUsd: null,
          source: "ai_crawl",
          aliases: ["agua", "drink"],
        },
      ]
    : /deli/.test(slug)
      ? [
          {
            id: "menu-deli-soup",
            title: "Soup and half",
            category: "Lunch",
            draftPriceUsd: 11,
            confirmedPriceUsd: 11,
            source: "merchant",
            aliases: ["soup", "half sandwich", "soup and sandwich"],
          },
          {
            id: "menu-deli-pickle",
            title: "House pickle jar",
            category: "Sides",
            draftPriceUsd: 4,
            confirmedPriceUsd: null,
            source: "ai_crawl",
            aliases: ["pickle", "pickles"],
          },
        ]
      : [
          {
            id: "menu-pilot-bowl",
            title: "Warm grain bowl",
            category: "Plates",
            draftPriceUsd: 14,
            confirmedPriceUsd: 14,
            source: "merchant",
            aliases: ["grain bowl", "bowl", "grain"],
          },
          {
            id: "menu-pilot-sandwich",
            title: "Market sandwich",
            category: "Plates",
            draftPriceUsd: 12,
            confirmedPriceUsd: null,
            source: "ai_crawl",
            aliases: ["sandwich"],
          },
        ];
  return {
    sourceUrl:
      input.websiteUrl?.trim() ||
      defaultRestaurantWebsiteUrl(input.restaurantName),
    crawledAt: input.crawledAt ?? "2026-09-23T18:00:00.000Z",
    items,
  };
}

export function sellableRestaurantMenu(
  restaurant: Pick<DeliveryRestaurant, "menu">,
): Array<RestaurantMenuItem & { priceUsd: number }> {
  return (restaurant.menu?.items ?? [])
    .filter((item) => item.confirmedPriceUsd != null && !item.eightySixed)
    .map((item) => ({
      ...item,
      priceUsd: money(item.confirmedPriceUsd as number),
    }));
}

export function menuItemSearchHaystack(item: {
  title: string;
  category: string;
  description?: string;
  aliases?: string[];
}): string {
  return [item.title, item.category, item.description, ...(item.aliases ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function menuItemMatchesQuery(
  item: {
    title: string;
    category: string;
    description?: string;
    aliases?: string[];
  },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return menuItemSearchHaystack(item).includes(needle);
}

/** Diner find — DoorDash-style search across confirmed / uploaded plates. */
export function findSellableMenuItems(
  ops: Pick<DeliveryOps, "restaurants">,
  query = "",
): FoundMenuItem[] {
  return ops.restaurants.flatMap((restaurant) =>
    sellableRestaurantMenu(restaurant)
      .filter((item) => menuItemMatchesQuery(item, query))
      .map((item) => ({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        neighborhood: restaurant.neighborhood,
        itemId: item.id,
        title: item.title,
        category: item.category,
        priceUsd: item.priceUsd,
        description: item.description,
        photoUrl: item.photoUrl,
        aliases: item.aliases ?? [],
      })),
  );
}

export function uploadRestaurantMenuItem(
  ops: DeliveryOps,
  restaurantId: string,
  input: {
    title: string;
    category?: string;
    priceUsd: number;
    description?: string;
    photoUrl?: string;
    aliases?: string[];
    id?: string;
  },
): DeliveryOps {
  const title = input.title.trim();
  const price = money(Math.max(0, input.priceUsd));
  if (!title) return ops;
  const id =
    input.id?.trim() ||
    `menu-upload-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28)}`;
  const aliases = (input.aliases ?? [])
    .map((word) => word.trim())
    .filter(Boolean);
  const uploaded: RestaurantMenuItem = {
    id,
    title,
    category: input.category?.trim() || "Plates",
    draftPriceUsd: price,
    confirmedPriceUsd: price,
    source: "merchant_upload",
    aliases,
    description: input.description?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
  };
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      if (row.id !== restaurantId) return row;
      const menu =
        row.menu ??
        crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl: row.websiteUrl,
        });
      const existing = menu.items.some((item) => item.id === id);
      return {
        ...row,
        menu: {
          ...menu,
          items: existing
            ? menu.items.map((item) => (item.id === id ? uploaded : item))
            : [...menu.items, uploaded],
        },
      };
    }),
  };
}

export function confirmRestaurantMenuPrice(
  ops: DeliveryOps,
  restaurantId: string,
  itemId: string,
  priceUsd: number,
): DeliveryOps {
  const confirmed = money(Math.max(0, priceUsd));
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      if (row.id !== restaurantId) return row;
      const menu =
        row.menu ??
        crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl: row.websiteUrl,
        });
      return {
        ...row,
        menu: {
          ...menu,
          items: menu.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  confirmedPriceUsd: confirmed,
                  source: "merchant" as const,
                }
              : item,
          ),
        },
      };
    }),
  };
}

/** Paper takeout menu the Seed vision parse returns (2–3 photos / PDF). */
export const SEED_PAPER_MENU_PARSE_FIXTURE: ParsedMenuJson = {
  items: [
    {
      category: "Heroes",
      item_name: "Chicken parm hero",
      price: 15,
      description: "Breaded cutlet, marinara, melted mozzarella on a hero roll",
      modifiers: [
        {
          id: "size",
          name: "Size",
          required: true,
          choices: [
            { id: "reg", name: "Regular" },
            { id: "lg", name: "Large", priceUsd: 3 },
          ],
        },
        {
          id: "extra-cheese",
          name: "Extra cheese",
          required: false,
          choices: [{ id: "yes", name: "Add extra cheese", priceUsd: 1.5 }],
        },
      ],
    },
    {
      category: "Plates",
      item_name: "Baked ziti",
      price: 13,
      description: "Ricotta, mozzarella, house red sauce",
      modifiers: [
        {
          id: "protein",
          name: "Add protein",
          required: false,
          choices: [
            { id: "meatball", name: "Meatball", priceUsd: 3 },
            { id: "sausage", name: "Sausage", priceUsd: 3 },
          ],
        },
      ],
    },
    {
      category: "Sweets",
      item_name: "Cannoli",
      price: 5,
      description: "Ricotta cream, chocolate chips",
    },
  ],
};

export function inferredMenuUploadKind(
  input: MenuUploadInput = {},
): MenuUploadKind {
  if (input.kind) return input.kind;
  const names = input.fileNames ?? [];
  if (names.some((name) => /\.pdf$/i.test(name))) return "pdf";
  if (names.length > 0) return "photo";
  return "fixture";
}

export function parsedMenuItemId(itemName: string): string {
  const slug = itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `menu-parse-${slug || "item"}`;
}

export function normalizeParsedMenuJson(raw: unknown): ParsedMenuJson {
  const items = Array.isArray((raw as { items?: unknown })?.items)
    ? ((raw as { items: unknown[] }).items)
    : Array.isArray(raw)
      ? raw
      : [];
  return {
    items: items
      .map((row) => {
        const item = row as Partial<ParsedMenuItem>;
        const name = String(item.item_name ?? "").trim();
        const price = money(Math.max(0, Number(item.price) || 0));
        if (!name) return null;
        const modifiers = Array.isArray(item.modifiers)
          ? item.modifiers
              .map((group, index) => {
                const groupName = String(group?.name ?? "").trim();
                if (!groupName) return null;
                return {
                  id:
                    String(group.id ?? "").trim() ||
                    `mod-${index}-${groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                  name: groupName,
                  required: Boolean(group.required),
                  choices: (group.choices ?? [])
                    .map((choice, choiceIndex) => {
                      const choiceName = String(choice?.name ?? "").trim();
                      if (!choiceName) return null;
                      return {
                        id:
                          String(choice.id ?? "").trim() ||
                          `choice-${choiceIndex}`,
                        name: choiceName,
                        priceUsd:
                          typeof choice.priceUsd === "number"
                            ? money(choice.priceUsd)
                            : undefined,
                      };
                    })
                    .filter((choice): choice is MenuModifierChoice =>
                      Boolean(choice),
                    ),
                };
              })
              .filter((group): group is MenuModifierGroup => Boolean(group))
          : undefined;
        return {
          category: String(item.category ?? "Plates").trim() || "Plates",
          item_name: name,
          price,
          description: String(item.description ?? "").trim() || undefined,
          modifiers,
        } satisfies ParsedMenuItem;
      })
      .filter((item): item is ParsedMenuItem => Boolean(item)),
  };
}

/**
 * Vision parse of uploaded photos / PDF. Seed uses the paper-menu fixture
 * so we do not call Toast / Square / Otter or scrape without consent.
 */
export function parseMenuFromUpload(
  input: MenuUploadInput = {},
): ParsedMenuJson {
  if (input.parsed) return normalizeParsedMenuJson(input.parsed);
  if (input.rawJson?.trim()) {
    try {
      return normalizeParsedMenuJson(JSON.parse(input.rawJson));
    } catch {
      return { items: [] };
    }
  }
  return normalizeParsedMenuJson(SEED_PAPER_MENU_PARSE_FIXTURE);
}

export function parsedItemToDraft(
  item: ParsedMenuItem,
  source: Extract<RestaurantMenuItemSource, "photo_parse" | "pdf_parse">,
): RestaurantMenuItem {
  return {
    id: parsedMenuItemId(item.item_name),
    title: item.item_name,
    category: item.category,
    draftPriceUsd: money(item.price),
    confirmedPriceUsd: null,
    source,
    description: item.description,
    modifiers: item.modifiers,
    aliases: [item.item_name, item.category].filter(Boolean),
    eightySixed: false,
  };
}

/** Write parsed photos/PDF (or the Seed fixture) as a draft store profile. */
export function ingestMenuPhotos(
  ops: DeliveryOps,
  restaurantId: string,
  input: MenuUploadInput = {},
): DeliveryOps {
  const parsed = parseMenuFromUpload(input);
  const kind = inferredMenuUploadKind(input);
  const source: Extract<RestaurantMenuItemSource, "photo_parse" | "pdf_parse"> =
    kind === "pdf" ? "pdf_parse" : "photo_parse";
  const drafts = parsed.items.map((item) => parsedItemToDraft(item, source));
  if (drafts.length === 0) return ops;
  const ingestedAt = new Date().toISOString();
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      if (row.id !== restaurantId) return row;
      const menu =
        row.menu ??
        crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl: row.websiteUrl,
        });
      const incomingIds = new Set(drafts.map((item) => item.id));
      const kept = menu.items.filter((item) => !incomingIds.has(item.id));
      return {
        ...row,
        menu: {
          ...menu,
          ingestSource: kind,
          crawledAt: ingestedAt,
          approvedAt: null,
          items: [...kept, ...drafts],
        },
      };
    }),
  };
}

/** Five-minute sign-off — confirm every parsed / draft plate and go live. */
export function approveMenuDraft(
  ops: DeliveryOps,
  restaurantId: string,
  priceOverrides: Record<string, number> = {},
  approvedAt = new Date().toISOString(),
): DeliveryOps {
  let next = ops;
  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  for (const item of restaurant?.menu?.items ?? []) {
    const override = priceOverrides[item.id];
    const price =
      typeof override === "number" ? override : (item.draftPriceUsd ?? 0);
    next = confirmRestaurantMenuPrice(next, restaurantId, item.id, price);
  }
  return {
    ...next,
    restaurants: next.restaurants.map((row) => {
      if (row.id !== restaurantId || !row.menu) return row;
      return {
        ...row,
        menu: {
          ...row.menu,
          approvedAt,
        },
      };
    }),
  };
}

/** One tap to 86 / restore during service so the plate does not sell. */
export function setMenuItemEightySixed(
  ops: DeliveryOps,
  restaurantId: string,
  itemId: string,
  eightySixed: boolean,
): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      if (row.id !== restaurantId) return row;
      const menu =
        row.menu ??
        crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl: row.websiteUrl,
        });
      return {
        ...row,
        menu: {
          ...menu,
          items: menu.items.map((item) =>
            item.id === itemId ? { ...item, eightySixed } : item,
          ),
        },
      };
    }),
  };
}

export function normalizeDeliveryRestaurant(
  row: DeliveryRestaurant,
): DeliveryRestaurant {
  const websiteUrl =
    row.websiteUrl?.trim() || defaultRestaurantWebsiteUrl(row.name);
  const menu =
    row.menu && Array.isArray(row.menu.items) && row.menu.items.length > 0
      ? {
          ...row.menu,
          items: row.menu.items.map((item) => ({
            ...item,
            eightySixed: Boolean(item.eightySixed),
            modifiers: Array.isArray(item.modifiers)
              ? item.modifiers
              : undefined,
          })),
        }
      : crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl,
        });
  return {
    ...row,
    paused: Boolean(row.paused),
    ownerDriverId: row.ownerDriverId ?? null,
    connectAccountId:
      row.connectAccountId?.trim() || defaultRestaurantConnectAccountId(row.id),
    websiteUrl,
    menu,
    ...restaurantGeo(row),
  };
}

export function classifyDriverHours(
  hoursThisWeek: number,
  hoursLast4Weeks: number,
): DriverClassification {
  if (
    hoursThisWeek > FULL_TIME_HOURS_PER_WEEK ||
    hoursLast4Weeks > FULL_TIME_HOURS_PER_4_WEEKS
  ) {
    return "full_time";
  }
  return "part_time";
}

export function driverSoftwareFeeUsd(
  classification: DriverClassification,
  cadence: DriverSoftwareCadence,
): number {
  const plan =
    classification === "full_time"
      ? DRIVER_SOFTWARE.fullTime
      : DRIVER_SOFTWARE.partTime;
  return cadence === "weekly" ? plan.weeklyUsd : plan.monthlyUsd;
}

export function driverSoftwareAnnualUsd(
  classification: DriverClassification,
  cadence: DriverSoftwareCadence,
): number {
  const fee = driverSoftwareFeeUsd(classification, cadence);
  return money(fee * (cadence === "weekly" ? 52 : 12));
}

/** Earliest delivered-run timestamp for this driver — not signup or first offer. */
export function earliestDeliveredRunAt(
  runs: Array<Pick<DriverRun, "driverId" | "status" | "createdAt">>,
  driverId: string,
): string | null {
  const delivered = runs
    .filter(
      (row) =>
        row.driverId === driverId &&
        row.status === "delivered" &&
        Boolean(row.createdAt),
    )
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const at = delivered[0]?.createdAt;
  if (!at) return null;
  return Number.isNaN(new Date(at).getTime()) ? null : at;
}

/** Persisted first successful drive, else the earliest delivered run. */
export function firstSuccessfulDriveAt(
  ops: Pick<DeliveryOps, "runs" | "drivers">,
  driverId: string,
): string | null {
  const stored = ops.drivers
    .find((row) => row.id === driverId)
    ?.firstDeliveredAt?.trim();
  if (stored && !Number.isNaN(new Date(stored).getTime())) return stored;
  return earliestDeliveredRunAt(ops.runs, driverId);
}

/** End of the 60-day free window, or null if the clock has not started. */
export function driverSoftwareFreeUntil(
  firstDeliveredAt: string | null | undefined,
): string | null {
  if (!firstDeliveredAt) return null;
  const start = new Date(firstDeliveredAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(
    start.getTime() + DRIVER_SOFTWARE_FREE_DAYS * 86_400_000,
  ).toISOString();
}

/**
 * True only while the 60-day window is running. No delivered run means
 * the clock has not started — not in trial, and not in the paid window.
 */
export function driverInFreeTrial(
  driver: { firstDeliveredAt?: string | null },
  now = new Date(),
): boolean {
  const until = driverSoftwareFreeUntil(driver.firstDeliveredAt);
  if (!until) return false;
  return now.getTime() < new Date(until).getTime();
}

/**
 * What the driver is charged now. $0 before the clock starts and during
 * the 60-day free window. After day 60, list $39 / $79 (or weekly).
 */
export function softwareFeeUsd(
  classification: DriverClassification,
  cadence: DriverSoftwareCadence,
  trial?: { firstDeliveredAt?: string | null } | string | null,
  now = new Date(),
): number {
  const firstDeliveredAt =
    typeof trial === "string" || trial == null || trial === undefined
      ? (trial ?? null)
      : trial.firstDeliveredAt;
  if (!firstDeliveredAt) return 0;
  if (driverInFreeTrial({ firstDeliveredAt }, now)) return 0;
  return driverSoftwareFeeUsd(classification, cadence);
}

export function driverInactiveTooLong(
  lastAppOpenAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!lastAppOpenAt) return false;
  const last = new Date(lastAppOpenAt).getTime();
  if (Number.isNaN(last)) return false;
  const days = (now.getTime() - last) / 86_400_000;
  return days >= DRIVER_INACTIVE_SUSPEND_DAYS;
}

const DRIVER_PHOTO_IDS: Record<
  string,
  { photoUrl: string; photoIdNumber: string }
> = {
  "drv-maya": {
    photoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••4481",
  },
  "drv-jordan": {
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••2290",
  },
  "drv-riley": {
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••7714",
  },
  "drv-casey": {
    photoUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••9052",
  },
};

/** Name-card photo + short ID for kitchen handoff verification. */
export function driverPhotoId(
  driver: Pick<DeliveryDriver, "id" | "name" | "photoUrl" | "photoIdNumber">,
): { photoUrl: string; photoIdNumber: string } {
  const seeded = DRIVER_PHOTO_IDS[driver.id];
  const digits = driver.id.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const fallbackNumber = `DL ·••${digits}`;
  const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=0b2e2a&color=fff&size=128`;
  return {
    photoUrl:
      driver.photoUrl && /^https?:\/\//.test(driver.photoUrl)
        ? driver.photoUrl
        : (seeded?.photoUrl ?? fallbackPhoto),
    photoIdNumber:
      driver.photoIdNumber?.trim() || seeded?.photoIdNumber || fallbackNumber,
  };
}

export function availableDispatchDrivers(ops: DeliveryOps): DeliveryDriver[] {
  return ops.drivers.filter((driver) => driverCanDispatch(driver));
}

/** Driver who accepted the run — not the originating scout. */
export function ticketAssignedDriver(
  ops: DeliveryOps,
  ticket: Pick<MerchantTicket, "orderId">,
): DeliveryDriver | null {
  const run = ops.runs.find((row) => row.orderId === ticket.orderId);
  if (run && (run.status === "offered" || run.status === "cancelled")) {
    return null;
  }
  const driverId =
    run?.driverId ??
    ops.ledger.find((row) => row.orderId === ticket.orderId)?.driverId ??
    null;
  if (!driverId) return null;
  return ops.drivers.find((row) => row.id === driverId) ?? null;
}

export function normalizeDeliveryDriver(
  row: DeliveryDriver,
  now = new Date(),
): DeliveryDriver {
  const hoursOpenThisWeek = Math.max(0, Number(row.hoursOpenThisWeek) || 0);
  const hoursOpenLast4Weeks = Math.max(0, Number(row.hoursOpenLast4Weeks) || 0);
  const classification =
    row.classification === "full_time" || row.classification === "part_time"
      ? row.classification
      : classifyDriverHours(hoursOpenThisWeek, hoursOpenLast4Weeks);
  const softwareCadence =
    row.softwareCadence === "weekly" ? "weekly" : "monthly";
  const inactive = driverInactiveTooLong(row.lastAppOpenAt, now);
  let status = row.status;
  if (status === "approved" && inactive) status = "suspended";
  if (status !== "approved" && status !== "pending") {
    // frozen / suspended stay offline
  }
  return {
    ...row,
    classification,
    softwareCadence,
    hoursOpenThisWeek,
    hoursOpenLast4Weeks,
    lastAppOpenAt: row.lastAppOpenAt ?? null,
    softwareUsdPerYear: driverSoftwareAnnualUsd(classification, softwareCadence),
    status,
    online: status === "approved" ? Boolean(row.online) : false,
    connectAccountId:
      row.connectAccountId?.trim() || defaultDriverConnectAccountId(row.id),
    payoutTrigger: row.payoutTrigger === "weekly" ? "weekly" : "min_balance",
    pendingPayoutUsd: money(Math.max(0, Number(row.pendingPayoutUsd) || 0)),
    lastPayoutAt: row.lastPayoutAt ?? null,
    taxFormsSelfManaged: true,
    firstDeliveredAt: row.firstDeliveredAt ?? null,
    existingPlatformActive:
      typeof row.existingPlatformActive === "boolean"
        ? row.existingPlatformActive
        : Boolean(row.licenseOk && row.insuranceOk),
    ...driverPhotoId(row),
  };
}

export function healDriverFirstDeliveredAt(
  driver: DeliveryDriver,
  runs: DriverRun[],
): DeliveryDriver {
  if (driver.firstDeliveredAt) return driver;
  const fromRuns = earliestDeliveredRunAt(runs, driver.id);
  return fromRuns ? { ...driver, firstDeliveredAt: fromRuns } : driver;
}

export function applyDriverSubscriptionPolicies(
  ops: DeliveryOps,
  now = new Date(),
): DeliveryOps {
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      healDriverFirstDeliveredAt(
        normalizeDeliveryDriver(driver, now),
        ops.runs,
      ),
    ),
  };
}

/** 10% restaurant commission → 5% scout + 5% driver. Platform $0 on the order. */
export function splitDeliveryLedger(input: {
  gmvUsd: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  taxUsd: number;
}): DeliveryLedgerSplit {
  const gmvUsd = money(Math.max(0, input.gmvUsd));
  const deliveryFeeUsd = money(Math.max(0, input.deliveryFeeUsd));
  const tipUsd = money(Math.max(0, input.tipUsd));
  const taxUsd = money(Math.max(0, input.taxUsd));
  const restaurantCommissionUsd = money(gmvUsd * RESTAURANT_COMMISSION_RATE);
  const scoutResidualUsd = money(gmvUsd * SCOUT_RESIDUAL_RATE);
  const driverCommissionUsd = money(gmvUsd * DRIVER_COMMISSION_RATE);
  const chargedUsd = money(gmvUsd + taxUsd + deliveryFeeUsd + tipUsd);
  const processorFeeUsd = money(chargedUsd * PROCESSOR_RATE);
  const restaurantNetUsd = money(
    gmvUsd - restaurantCommissionUsd - processorFeeUsd,
  );
  return {
    gmvUsd,
    restaurantCommissionUsd,
    platformGrossUsd: 0,
    scoutResidualUsd,
    driverCommissionUsd,
    deliveryFeeUsd,
    tipUsd,
    taxUsd,
    processorFeeUsd,
    restaurantNetUsd,
    platformNetUsd: 0,
  };
}

/** Restaurant payout: GMV − 10% − ~2.9% processor. */
export function restaurantNetFromSplit(split: DeliveryLedgerSplit): number {
  return money(
    split.restaurantNetUsd ??
      split.gmvUsd - split.restaurantCommissionUsd - split.processorFeeUsd,
  );
}

/** Driver Connect payout: fee + tip + 5% commission share. */
export function driverPayoutFromSplit(split: {
  deliveryFeeUsd: number;
  tipUsd: number;
  driverCommissionUsd?: number;
  gmvUsd: number;
}): number {
  const commission =
    split.driverCommissionUsd ?? money(split.gmvUsd * DRIVER_COMMISSION_RATE);
  return money(split.deliveryFeeUsd + split.tipUsd + commission);
}

/** Who ran the bag — ledger driverId, else the matching run. Scout is not a fallback. */
export function ledgerRunDriverId(
  row: Pick<DeliveryLedgerRow, "orderId" | "driverId">,
  runs: Array<Pick<DriverRun, "orderId" | "driverId">>,
): string | null {
  if (row.driverId) return row.driverId;
  return runs.find((item) => item.orderId === row.orderId)?.driverId ?? null;
}

export function deliveryDriverDisplayName(
  drivers: Array<Pick<DeliveryDriver, "id" | "name">>,
  driverId: string | null,
): string {
  if (!driverId) return "Unassigned";
  return drivers.find((item) => item.id === driverId)?.name ?? driverId;
}

/** Fee + tip + 5% for rows attributed to this driver (not the originating scout). */
export function driverAttributedPayoutUsd(
  ops: DeliveryOps,
  driverId: string,
): number {
  return money(
    ops.ledger
      .filter((row) => ledgerRunDriverId(row, ops.runs) === driverId)
      .reduce((sum, row) => sum + driverPayoutFromSplit(row), 0),
  );
}

/** Scout residual at a weekly GMV input — never implied as a default promise. */
export function scoutResidualForWeeklyGmv(weeklyGmvUsd: number): number {
  return money(Math.max(0, weeklyGmvUsd) * SCOUT_RESIDUAL_RATE);
}

export function weeklyScoutResidualExamples(): Array<{
  weeklyGmvUsd: number;
  residualUsd: number;
}> {
  return WEEKLY_GMV_EXAMPLES.map((weeklyGmvUsd) => ({
    weeklyGmvUsd,
    residualUsd: scoutResidualForWeeklyGmv(weeklyGmvUsd),
  }));
}

export function calendarMonthKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function deliveredRunsInMonth(
  ops: Pick<DeliveryOps, "runs">,
  driverId: string,
  now = new Date(),
  restaurantId?: string,
): DriverRun[] {
  const month = calendarMonthKey(now);
  return ops.runs.filter(
    (row) =>
      row.driverId === driverId &&
      row.status === "delivered" &&
      calendarMonthKey(row.createdAt) === month &&
      (!restaurantId || row.restaurantId === restaurantId),
  );
}

export function deliveriesThisMonth(
  ops: Pick<DeliveryOps, "runs">,
  driverId: string,
  now = new Date(),
): number {
  return deliveredRunsInMonth(ops, driverId, now).length;
}

export function driverHasSignedARestaurant(
  ops: Pick<DeliveryOps, "restaurants">,
  driverId: string,
): boolean {
  return ops.restaurants.some((row) => row.scoutId === driverId);
}

export function driverOwnsARestaurant(
  ops: Pick<DeliveryOps, "restaurants">,
  driverId: string,
): boolean {
  return ops.restaurants.some((row) => row.ownerDriverId === driverId);
}

/** One Hometown delivery this month keeps scout pay / lets a restaurateur scout. */
export function scoutEligibleToBePaid(
  ops: Pick<DeliveryOps, "runs">,
  driverId: string,
  now = new Date(),
): boolean {
  return deliveriesThisMonth(ops, driverId, now) >= SCOUT_MIN_DELIVERIES_PER_MONTH;
}

export function canSignRestaurantAsScout(
  ops: Pick<DeliveryOps, "runs">,
  driverId: string,
  now = new Date(),
): boolean {
  return scoutEligibleToBePaid(ops, driverId, now);
}

/**
 * Originating scout if they dashed once this month; else the next most-active
 * deliverer to that kitchen who has already signed a restaurant, then the next.
 * scout_id does not move. The kitchen owner never collects this 5%.
 */
export function scoutPayoutDriverId(
  ops: Pick<DeliveryOps, "restaurants" | "runs">,
  restaurantId: string,
  now = new Date(),
): string | null {
  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  if (!restaurant?.scoutId?.trim()) return null;
  const ownerId = restaurant.ownerDriverId ?? null;
  const canCollect = (id: string) =>
    Boolean(id) &&
    id !== ownerId &&
    scoutEligibleToBePaid(ops, id, now);
  if (canCollect(restaurant.scoutId)) {
    return restaurant.scoutId;
  }
  const signed = [
    ...new Set(
      ops.restaurants
        .map((row) => row.scoutId)
        .filter((id) => id && id !== restaurant.scoutId),
    ),
  ];
  const ranked = signed
    .filter((id) => canCollect(id))
    .sort((a, b) => {
      const byKitchen =
        deliveredRunsInMonth(ops, b, now, restaurantId).length -
        deliveredRunsInMonth(ops, a, now, restaurantId).length;
      if (byKitchen !== 0) return byKitchen;
      return (
        deliveriesThisMonth(ops, b, now) - deliveriesThisMonth(ops, a, now)
      );
    });
  return ranked[0] ?? null;
}

export function ledgerScoutPaidDriverId(
  row: Pick<DeliveryLedgerRow, "restaurantId" | "scoutId" | "scoutPaidDriverId"> &
    Partial<Pick<DeliveryLedgerRow, "createdAt">>,
  ops: Pick<DeliveryOps, "restaurants" | "runs">,
  now = new Date(row.createdAt ?? Date.now()),
): string {
  const ownerId = kitchenOwnerDriverId(ops, row.restaurantId);
  if (row.scoutPaidDriverId && row.scoutPaidDriverId !== ownerId) {
    return row.scoutPaidDriverId;
  }
  return scoutPayoutDriverId(ops, row.restaurantId, now) ?? "";
}

export function scoutAttributedResidualUsd(
  ops: DeliveryOps,
  driverId: string,
  now = new Date(),
): number {
  return money(
    ops.ledger
      .filter(
        (row) => ledgerScoutPaidDriverId(row, ops, now) === driverId,
      )
      .reduce((sum, row) => sum + row.scoutResidualUsd, 0),
  );
}

export function unsignedRestaurants(
  ops: Pick<DeliveryOps, "restaurants">,
): DeliveryRestaurant[] {
  return ops.restaurants.filter((row) => !row.scoutId?.trim());
}

export function assignRestaurantScout(
  ops: DeliveryOps,
  restaurantId: string,
  driverId: string,
  now = new Date(),
): { ok: true; ops: DeliveryOps } | { ok: false; error: string } {
  if (!canSignRestaurantAsScout(ops, driverId, now)) {
    return {
      ok: false,
      error:
        "Make one delivery this month to sign a kitchen as a scout — same rule for restaurateurs.",
    };
  }
  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  if (!restaurant) return { ok: false, error: "Restaurant not found." };
  if (restaurant.ownerDriverId === driverId) {
    return {
      ok: false,
      error:
        "A restaurateur cannot scout their own kitchen — they do not keep that 5%.",
    };
  }
  if (restaurant.scoutId) {
    return { ok: false, error: "scout_id is locked." };
  }
  return {
    ok: true,
    ops: {
      ...ops,
      restaurants: ops.restaurants.map((row) =>
        row.id === restaurantId ? { ...row, scoutId: driverId } : row,
      ),
    },
  };
}

export function driverCanDispatch(driver: DeliveryDriver): boolean {
  return (
    driver.status === "approved" &&
    driverOnboardingComplete(driver) &&
    driver.online
  );
}

export function restaurantForShopItems(
  ops: DeliveryOps,
  items: Array<{ productId?: string; title?: string }>,
): DeliveryRestaurant {
  for (const item of items) {
    const keyed = item.productId?.split(":")[0];
    const hit = keyed
      ? ops.restaurants.find((row) => row.id === keyed)
      : undefined;
    if (hit) return hit;
  }
  const blob = items
    .map((item) => `${item.productId ?? ""} ${item.title ?? ""}`)
    .join(" ")
    .toLowerCase();
  if (/taco|street/.test(blob)) {
    return (
      ops.restaurants.find((row) => row.id === "rest-tacos") ??
      ops.restaurants[0]
    );
  }
  if (/deli|river/.test(blob)) {
    return (
      ops.restaurants.find((row) => row.id === "rest-deli") ??
      ops.restaurants[0]
    );
  }
  return (
    ops.restaurants.find((row) => row.id === "rest-pilot") ??
    ops.restaurants.find((row) => row.active) ??
    ops.restaurants[0]
  );
}

export function starterDeliveryOps(projectName: string): DeliveryOps {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const createdAt = "2026-09-23T18:00:00.000Z";
  const sampleItems = [
    { title: "Pilot Kitchen · Warm grain bowl", qty: 1, priceUsd: 14 },
    { title: "Pilot Kitchen · Market sandwich", qty: 1, priceUsd: 12 },
  ];
  const split = splitDeliveryLedger({
    gmvUsd: 26,
    deliveryFeeUsd: hometownDeliveryFeeUsd("10001"),
    tipUsd: 4,
    taxUsd: 2.15,
  });
  const orderId = "ord-sample-pilot";
  const deliveredSplit = splitDeliveryLedger({
    gmvUsd: 11,
    deliveryFeeUsd: hometownDeliveryFeeUsd("10003"),
    tipUsd: 3,
    taxUsd: 0.91,
  });
  const deliveredAt = "2026-09-23T19:10:00.000Z";
  return {
    city: `${brand} · one town`,
    restaurants: [
      {
        id: "rest-pilot",
        name: "Pilot Kitchen",
        neighborhood: "Market Street",
        scoutId: "drv-maya",
        ownerDriverId: "drv-jordan",
        connectAccountId: defaultRestaurantConnectAccountId("rest-pilot"),
        active: true,
        paused: false,
        websiteUrl: defaultRestaurantWebsiteUrl("Pilot Kitchen"),
        menu: crawlRestaurantMenuDraft({
          restaurantName: "Pilot Kitchen",
          websiteUrl: defaultRestaurantWebsiteUrl("Pilot Kitchen"),
        }),
        ...STARTER_KITCHEN_COORDS["rest-pilot"],
      },
      {
        id: "rest-tacos",
        name: "Second Street Tacos",
        neighborhood: "Second Street",
        scoutId: "drv-maya",
        connectAccountId: defaultRestaurantConnectAccountId("rest-tacos"),
        active: true,
        paused: false,
        websiteUrl: defaultRestaurantWebsiteUrl("Second Street Tacos"),
        menu: crawlRestaurantMenuDraft({
          restaurantName: "Second Street Tacos",
          websiteUrl: defaultRestaurantWebsiteUrl("Second Street Tacos"),
        }),
        ...STARTER_KITCHEN_COORDS["rest-tacos"],
      },
      {
        id: "rest-deli",
        name: "River Market Deli",
        neighborhood: "Riverwalk",
        scoutId: "drv-riley",
        connectAccountId: defaultRestaurantConnectAccountId("rest-deli"),
        active: true,
        paused: false,
        websiteUrl: defaultRestaurantWebsiteUrl("River Market Deli"),
        menu: crawlRestaurantMenuDraft({
          restaurantName: "River Market Deli",
          websiteUrl: defaultRestaurantWebsiteUrl("River Market Deli"),
        }),
        ...STARTER_KITCHEN_COORDS["rest-deli"],
      },
      {
        id: "rest-bakery",
        name: "Third Street Bakery",
        neighborhood: "Third Street",
        scoutId: "",
        connectAccountId: defaultRestaurantConnectAccountId("rest-bakery"),
        active: true,
        paused: false,
        websiteUrl: defaultRestaurantWebsiteUrl("Third Street Bakery"),
        menu: {
          sourceUrl: defaultRestaurantWebsiteUrl("Third Street Bakery"),
          crawledAt: createdAt,
          items: [
            {
              id: "menu-bakery-loaf",
              title: "Sourdough loaf",
              category: "Bread",
              draftPriceUsd: 8,
              confirmedPriceUsd: null,
              source: "ai_crawl",
              aliases: ["bread", "loaf", "sourdough"],
            },
          ],
        },
        ...STARTER_KITCHEN_COORDS["rest-bakery"],
      },
    ],
    drivers: [
      {
        id: "drv-maya",
        name: "Maya Chen",
        status: "approved",
        licenseOk: true,
        insuranceOk: true,
        existingPlatformActive: true,
        classification: "full_time",
        softwareCadence: "monthly",
        hoursOpenThisWeek: 36,
        hoursOpenLast4Weeks: 140,
        lastAppOpenAt: createdAt,
        softwareUsdPerYear: driverSoftwareAnnualUsd("full_time", "monthly"),
        online: true,
        connectAccountId: defaultDriverConnectAccountId("drv-maya"),
        payoutTrigger: "min_balance",
        pendingPayoutUsd: money(
          Math.max(DRIVER_PAYOUT_MIN_BALANCE_USD, driverPayoutFromSplit(deliveredSplit)),
        ),
        lastPayoutAt: null,
        taxFormsSelfManaged: true,
        firstDeliveredAt: deliveredAt,
      },
      {
        id: "drv-jordan",
        name: "Jordan Hale",
        status: "approved",
        licenseOk: true,
        insuranceOk: true,
        existingPlatformActive: true,
        classification: "part_time",
        softwareCadence: "weekly",
        hoursOpenThisWeek: 12,
        hoursOpenLast4Weeks: 40,
        lastAppOpenAt: createdAt,
        softwareUsdPerYear: driverSoftwareAnnualUsd("part_time", "weekly"),
        online: true,
        connectAccountId: defaultDriverConnectAccountId("drv-jordan"),
        payoutTrigger: "weekly",
        pendingPayoutUsd: 12,
        lastPayoutAt: createdAt,
        taxFormsSelfManaged: true,
        firstDeliveredAt: null,
      },
      {
        id: "drv-riley",
        name: "Riley Frost",
        status: "frozen",
        licenseOk: true,
        insuranceOk: false,
        existingPlatformActive: true,
        classification: "part_time",
        softwareCadence: "monthly",
        hoursOpenThisWeek: 8,
        hoursOpenLast4Weeks: 20,
        lastAppOpenAt: createdAt,
        softwareUsdPerYear: driverSoftwareAnnualUsd("part_time", "monthly"),
        online: false,
        connectAccountId: defaultDriverConnectAccountId("drv-riley"),
        payoutTrigger: "min_balance",
        pendingPayoutUsd: 0,
        lastPayoutAt: null,
        taxFormsSelfManaged: true,
        firstDeliveredAt: null,
      },
      {
        id: "drv-casey",
        name: "Casey Quinn",
        status: "suspended",
        licenseOk: true,
        insuranceOk: true,
        existingPlatformActive: false,
        classification: "part_time",
        softwareCadence: "monthly",
        hoursOpenThisWeek: 0,
        hoursOpenLast4Weeks: 6,
        lastAppOpenAt: "2026-07-20T18:00:00.000Z",
        softwareUsdPerYear: driverSoftwareAnnualUsd("part_time", "monthly"),
        online: false,
        connectAccountId: defaultDriverConnectAccountId("drv-casey"),
        payoutTrigger: "weekly",
        pendingPayoutUsd: 0,
        lastPayoutAt: "2026-07-20T18:00:00.000Z",
        taxFormsSelfManaged: true,
        firstDeliveredAt: null,
      },
    ],
    ledger: [
      {
        ...split,
        id: "led-sample-pilot",
        orderId,
        restaurantId: "rest-pilot",
        scoutId: "drv-maya",
        scoutPaidDriverId: "drv-maya",
        driverId: null,
        customerName: "Alex Rivera",
        createdAt,
      },
      {
        ...deliveredSplit,
        id: "led-sample-deli",
        orderId: "ord-sample-deli",
        restaurantId: "rest-deli",
        scoutId: "drv-riley",
        scoutPaidDriverId: "drv-maya",
        driverId: "drv-maya",
        customerName: "Sam Ortiz",
        createdAt: deliveredAt,
      },
    ],
    tickets: [
      {
        id: "tkt-sample-pilot",
        orderId,
        restaurantId: "rest-pilot",
        customerName: "Alex Rivera",
        items: sampleItems,
        gmvUsd: split.gmvUsd,
        status: "incoming",
        createdAt,
      },
      {
        id: "tkt-sample-deli",
        orderId: "ord-sample-deli",
        restaurantId: "rest-deli",
        customerName: "Sam Ortiz",
        items: [
          {
            title: "River Market Deli · Soup and half",
            qty: 1,
            priceUsd: 11,
          },
        ],
        gmvUsd: deliveredSplit.gmvUsd,
        status: "completed",
        createdAt: deliveredAt,
      },
    ],
    runs: [
      {
        id: "run-sample-pilot",
        orderId,
        restaurantId: "rest-pilot",
        driverId: null,
        customerName: "Alex Rivera",
        dropoffZip: "10001",
        dropoffLat: STARTER_DROPOFF_COORDS["ord-sample-pilot"].lat,
        dropoffLng: STARTER_DROPOFF_COORDS["ord-sample-pilot"].lng,
        deliveryFeeUsd: split.deliveryFeeUsd,
        tipUsd: split.tipUsd,
        driverCommissionUsd: split.driverCommissionUsd,
        status: "offered",
        createdAt,
      },
      {
        id: "run-sample-deli",
        orderId: "ord-sample-deli",
        restaurantId: "rest-deli",
        driverId: "drv-maya",
        customerName: "Sam Ortiz",
        dropoffZip: "10003",
        dropoffLat: STARTER_DROPOFF_COORDS["ord-sample-deli"].lat,
        dropoffLng: STARTER_DROPOFF_COORDS["ord-sample-deli"].lng,
        deliveryFeeUsd: deliveredSplit.deliveryFeeUsd,
        tipUsd: deliveredSplit.tipUsd,
        driverCommissionUsd: deliveredSplit.driverCommissionUsd,
        status: "delivered",
        createdAt: deliveredAt,
      },
    ],
  };
}

/** Stale Seeds often have Pilot only — remint Jordan’s kitchen + the deli cascade sample. */
export function remintHometownScoutPaySamples(ops: DeliveryOps): DeliveryOps {
  const restaurants = ops.restaurants.map((row) =>
    row.id === "rest-pilot" && !row.ownerDriverId
      ? { ...row, ownerDriverId: "drv-jordan" }
      : row,
  );
  const starter = starterDeliveryOps("Hometown Runner");
  if (!restaurants.some((row) => row.id === "rest-bakery")) {
    const bakery = starter.restaurants.find((row) => row.id === "rest-bakery");
    if (bakery) restaurants.push(bakery);
  }
  const hasDeli = restaurants.some((row) => row.id === "rest-deli");
  const hasDeliDelivered = ops.runs.some(
    (row) => row.restaurantId === "rest-deli" && row.status === "delivered",
  );
  if (!hasDeli || hasDeliDelivered) {
    return { ...ops, restaurants };
  }
  const missing = (orderId: string) =>
    !ops.ledger.some((row) => row.orderId === orderId) &&
    !ops.runs.some((row) => row.orderId === orderId);
  return {
    ...ops,
    restaurants,
    ledger: [
      ...ops.ledger,
      ...starter.ledger.filter(
        (row) => row.orderId === "ord-sample-deli" && missing(row.orderId),
      ),
    ],
    tickets: [
      ...ops.tickets,
      ...starter.tickets.filter(
        (row) => row.orderId === "ord-sample-deli" && missing(row.orderId),
      ),
    ],
    runs: [
      ...ops.runs,
      ...starter.runs.filter(
        (row) => row.orderId === "ord-sample-deli" && missing(row.orderId),
      ),
    ],
  };
}

export function parseDeliveryOps(raw: string): DeliveryOps | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as DeliveryOps;
    if (
      !parsed ||
      !Array.isArray(parsed.restaurants) ||
      !Array.isArray(parsed.drivers) ||
      !Array.isArray(parsed.ledger) ||
      !Array.isArray(parsed.tickets) ||
      !Array.isArray(parsed.runs)
    ) {
      return null;
    }
    const remintTripFee = (orderId: string, zip: string | undefined, current: number) => {
      if (zip && (current === 5 || /^ord-sample-/.test(orderId))) {
        return hometownDeliveryFeeUsd(zip);
      }
      return money(Math.max(0, current));
    };
    const ledger = parsed.ledger.map((row) => {
      const run = parsed.runs.find((item) => item.orderId === row.orderId);
      const remint = splitDeliveryLedger({
        gmvUsd: row.gmvUsd,
        deliveryFeeUsd: remintTripFee(
          row.orderId,
          run?.dropoffZip,
          row.deliveryFeeUsd,
        ),
        tipUsd: row.tipUsd,
        taxUsd: row.taxUsd ?? 0,
      });
      return {
        ...row,
        ...remint,
        driverId: row.driverId ?? run?.driverId ?? null,
      };
    });
    const runs = parsed.runs.map((row) => {
      const led = ledger.find((item) => item.orderId === row.orderId);
      const restaurant = parsed.restaurants.find(
        (item) => item.id === row.restaurantId,
      );
      const dropoff = runDropoffGeo(row, restaurant);
      return {
        ...row,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        deliveryFeeUsd: remintTripFee(
          row.orderId,
          row.dropoffZip,
          row.deliveryFeeUsd,
        ),
        driverCommissionUsd:
          typeof row.driverCommissionUsd === "number" && row.deliveryFeeUsd !== 5
            ? row.driverCommissionUsd
            : money((led?.gmvUsd ?? 0) * DRIVER_COMMISSION_RATE),
      };
    });
    const ops: DeliveryOps = remintHometownScoutPaySamples({
      city: parsed.city || "One town",
      restaurants: parsed.restaurants.map((row) =>
        normalizeDeliveryRestaurant(row),
      ),
      drivers: parsed.drivers.map((row) =>
        normalizeDeliveryDriver({
          ...row,
          online:
            typeof row.online === "boolean"
              ? row.online
              : row.status === "approved",
        }),
      ),
      ledger,
      tickets: parsed.tickets,
      runs,
    });
    return {
      ...ops,
      ledger: ops.ledger.map((row) => ({
        ...row,
        scoutPaidDriverId:
          row.scoutPaidDriverId ??
          scoutPayoutDriverId(ops, row.restaurantId, new Date(row.createdAt)),
      })),
      drivers: ops.drivers.map((driver) => {
        const healed = healDriverFirstDeliveredAt(driver, ops.runs);
        const attributed = driverAttributedPayoutUsd(ops, driver.id);
        if (
          (healed.pendingPayoutUsd ?? 0) === 0 &&
          !healed.lastPayoutAt &&
          attributed > 0
        ) {
          return { ...healed, pendingPayoutUsd: attributed };
        }
        return healed;
      }),
    };
  } catch {
    return null;
  }
}

export function deliveryOpsJson(ops: DeliveryOps): string {
  return `${JSON.stringify(ops, null, 2)}\n`;
}

/** Freeze stops dispatch only — scout_id on restaurants does not move. */
export function freezeDeliveryDriver(
  ops: DeliveryOps,
  driverId: string,
): DeliveryOps {
  const scoutLocks = ops.restaurants.map((row) => row.scoutId);
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      driver.id === driverId
        ? { ...driver, status: "frozen" as const, online: false }
        : driver,
    ),
    restaurants: ops.restaurants.map((row, index) => ({
      ...row,
      scoutId: scoutLocks[index] ?? row.scoutId,
    })),
  };
}

export function approveDeliveryDriver(
  ops: DeliveryOps,
  driverId: string,
): DeliveryOps {
  const scoutLocks = ops.restaurants.map((row) => row.scoutId);
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      driver.id === driverId
        ? {
            ...driver,
            status: "approved" as const,
            licenseOk: true,
            insuranceOk: true,
            existingPlatformActive: true,
            lastAppOpenAt: new Date().toISOString(),
          }
        : driver,
    ),
    restaurants: ops.restaurants.map((row, index) => ({
      ...row,
      scoutId: scoutLocks[index] ?? row.scoutId,
    })),
  };
}

export function recordDeliveryOrder(
  ops: DeliveryOps,
  input: {
    ledgerId: string;
    ticketId: string;
    runId: string;
    orderId: string;
    customerName: string;
    dropoffZip: string;
    dropoffLat?: number;
    dropoffLng?: number;
    items: Array<{
      productId?: string;
      title: string;
      qty: number;
      priceUsd: number;
    }>;
    gmvUsd: number;
    deliveryFeeUsd: number;
    tipUsd: number;
    taxUsd: number;
    createdAt?: string;
  },
): DeliveryOps {
  const restaurant = restaurantForShopItems(ops, input.items);
  const kitchen = restaurantGeo(restaurant);
  const dropoff =
    typeof input.dropoffLat === "number" && typeof input.dropoffLng === "number"
      ? { lat: input.dropoffLat, lng: input.dropoffLng }
      : defaultDropoffNearRestaurant(restaurant, input.dropoffZip);
  if (!dropoffWithinMerchantRadius(kitchen, dropoff)) {
    return ops;
  }
  const split = splitDeliveryLedger({
    gmvUsd: input.gmvUsd,
    deliveryFeeUsd: input.deliveryFeeUsd,
    tipUsd: input.tipUsd,
    taxUsd: input.taxUsd,
  });
  const createdAt = input.createdAt ?? new Date().toISOString();
  const row: DeliveryLedgerRow = {
    ...split,
    id: input.ledgerId,
    orderId: input.orderId,
    restaurantId: restaurant.id,
    scoutId: restaurant.scoutId,
    scoutPaidDriverId: scoutPayoutDriverId(
      ops,
      restaurant.id,
      new Date(createdAt),
    ),
    driverId: null,
    customerName: input.customerName,
    createdAt,
  };
  const ticket: MerchantTicket = {
    id: input.ticketId,
    orderId: input.orderId,
    restaurantId: restaurant.id,
    customerName: input.customerName,
    items: input.items.map((item) => ({
      title: item.title,
      qty: item.qty,
      priceUsd: item.priceUsd,
    })),
    gmvUsd: split.gmvUsd,
    status: "incoming",
    createdAt,
  };
  const run: DriverRun = {
    id: input.runId,
    orderId: input.orderId,
    restaurantId: restaurant.id,
    driverId: null,
    customerName: input.customerName,
    dropoffZip: input.dropoffZip,
    dropoffLat: dropoff.lat,
    dropoffLng: dropoff.lng,
    deliveryFeeUsd: split.deliveryFeeUsd,
    tipUsd: split.tipUsd,
    driverCommissionUsd: split.driverCommissionUsd,
    status: "offered",
    createdAt,
  };
  return {
    ...ops,
    ledger: [row, ...ops.ledger].slice(0, 200),
    tickets: [ticket, ...ops.tickets].slice(0, 200),
    runs: [run, ...ops.runs].slice(0, 200),
  };
}

export function setRestaurantPaused(
  ops: DeliveryOps,
  restaurantId: string,
  paused: boolean,
): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId ? { ...row, paused } : row,
    ),
  };
}

export function setDriverOnline(
  ops: DeliveryOps,
  driverId: string,
  online: boolean,
): DeliveryOps {
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      driver.id === driverId
        ? {
            ...driver,
            online: online && driver.status === "approved",
            lastAppOpenAt:
              online && driver.status === "approved"
                ? new Date().toISOString()
                : driver.lastAppOpenAt,
          }
        : driver,
    ),
  };
}

export function setMerchantTicketStatus(
  ops: DeliveryOps,
  ticketId: string,
  status: MerchantTicketStatus,
): DeliveryOps {
  const ticket = ops.tickets.find((row) => row.id === ticketId);
  return {
    ...ops,
    tickets: ops.tickets.map((row) =>
      row.id === ticketId ? { ...row, status } : row,
    ),
    runs:
      status === "declined" && ticket
        ? ops.runs.map((run) =>
            run.orderId === ticket.orderId && run.status === "offered"
              ? { ...run, status: "cancelled" as const }
              : run,
          )
        : ops.runs,
  };
}

export function acceptDriverRun(
  ops: DeliveryOps,
  runId: string,
  driverId: string,
): { ok: true; ops: DeliveryOps } | { ok: false; error: string } {
  const driver = ops.drivers.find((row) => row.id === driverId);
  if (!driver) return { ok: false, error: "Driver not on this town’s board." };
  if (!driverCanDispatch(driver)) {
    return {
      ok: false,
      error:
        "Dispatch is blocked. License, insurance, and an active DoorDash / Uber Eats status are required — a freeze does not move scout residuals.",
    };
  }
  const run = ops.runs.find((row) => row.id === runId);
  if (!run || run.status !== "offered") {
    return { ok: false, error: "That run is no longer offered." };
  }
  return {
    ok: true,
    ops: {
      ...ops,
      runs: ops.runs.map((row) =>
        row.id === runId
          ? { ...row, driverId, status: "accepted" as const }
          : row,
      ),
      ledger: ops.ledger.map((row) =>
        row.orderId === run.orderId ? { ...row, driverId } : row,
      ),
    },
  };
}

export function ticketDriverArrived(
  ops: DeliveryOps,
  ticket: Pick<MerchantTicket, "orderId" | "driverArrivedAt">,
): boolean {
  if (ticket.driverArrivedAt) return true;
  return ops.runs.some(
    (row) =>
      row.orderId === ticket.orderId && row.status === "driver_arrived",
  );
}

export function advanceDriverArrived(
  ops: DeliveryOps,
  runId: string,
  driverId: string,
  location: GeoPoint,
): { ok: true; ops: DeliveryOps } | { ok: false; error: string } {
  const run = ops.runs.find((row) => row.id === runId);
  if (!run || run.driverId !== driverId) {
    return { ok: false, error: "This run is not assigned to you." };
  }
  if (run.status !== "accepted") {
    return { ok: false, error: "Accept the run before you arrive." };
  }
  const restaurant = ops.restaurants.find((row) => row.id === run.restaurantId);
  if (!restaurant) return { ok: false, error: "Kitchen pin is missing." };
  const distanceMeters = haversineMeters(location, restaurantGeo(restaurant));
  if (!driverInsideKitchenGeofence(distanceMeters)) {
    return {
      ok: false,
      error:
        "Drive into the 300 meter kitchen geofence so the bag can be staged.",
    };
  }
  const arrivedAt = new Date().toISOString();
  return {
    ok: true,
    ops: {
      ...ops,
      runs: ops.runs.map((row) =>
        row.id === runId
          ? { ...row, status: "driver_arrived" as const }
          : row,
      ),
      tickets: ops.tickets.map((row) =>
        row.orderId === run.orderId
          ? { ...row, driverArrivedAt: arrivedAt }
          : row,
      ),
    },
  };
}

export function advanceDriverRun(
  ops: DeliveryOps,
  runId: string,
  driverId: string,
  next: Extract<DriverRunStatus, "picked_up" | "delivered">,
  location?: GeoPoint | null,
): { ok: true; ops: DeliveryOps } | { ok: false; error: string } {
  const run = ops.runs.find((row) => row.id === runId);
  if (!run || run.driverId !== driverId) {
    return { ok: false, error: "This run is not assigned to you." };
  }
  if (
    next === "picked_up" &&
    run.status !== "accepted" &&
    run.status !== "driver_arrived"
  ) {
    return { ok: false, error: "Accept the run before pickup." };
  }
  if (next === "delivered" && run.status !== "picked_up") {
    return { ok: false, error: "Mark pickup before you deliver." };
  }
  if (next === "delivered") {
    const restaurant = ops.restaurants.find(
      (row) => row.id === run.restaurantId,
    );
    const dropoff = runDropoffGeo(run, restaurant);
    if (!location) {
      return { ok: false, error: DROPOFF_WRONG_LOCATION_COPY };
    }
    const distanceMeters = haversineMeters(location, dropoff);
    if (!driverInsideDropoffGeofence(distanceMeters)) {
      return { ok: false, error: DROPOFF_WRONG_LOCATION_COPY };
    }
  }
  const deliveredAt = new Date().toISOString();
  return {
    ok: true,
    ops: {
      ...ops,
      runs: ops.runs.map((row) =>
        row.id === runId ? { ...row, status: next } : row,
      ),
      drivers:
        next === "delivered"
          ? ops.drivers.map((driver) =>
              driver.id === driverId && !driver.firstDeliveredAt
                ? { ...driver, firstDeliveredAt: deliveredAt }
                : driver,
            )
          : ops.drivers,
    },
  };
}

export function summarizeDeliveryLedger(ops: DeliveryOps): {
  gmvUsd: number;
  restaurantCommissionUsd: number;
  restaurantNetUsd: number;
  platformGrossUsd: number;
  scoutResidualUsd: number;
  driverCommissionUsd: number;
  driverPayoutUsd: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  processorFeeUsd: number;
  platformNetUsd: number;
} {
  return ops.ledger.reduce(
    (sum, row) => ({
      gmvUsd: money(sum.gmvUsd + row.gmvUsd),
      restaurantCommissionUsd: money(
        sum.restaurantCommissionUsd + row.restaurantCommissionUsd,
      ),
      restaurantNetUsd: money(
        sum.restaurantNetUsd + restaurantNetFromSplit(row),
      ),
      platformGrossUsd: 0,
      scoutResidualUsd: money(sum.scoutResidualUsd + row.scoutResidualUsd),
      driverCommissionUsd: money(
        sum.driverCommissionUsd +
          (row.driverCommissionUsd ?? money(row.gmvUsd * DRIVER_COMMISSION_RATE)),
      ),
      driverPayoutUsd: money(
        sum.driverPayoutUsd + driverPayoutFromSplit(row),
      ),
      deliveryFeeUsd: money(sum.deliveryFeeUsd + row.deliveryFeeUsd),
      tipUsd: money(sum.tipUsd + row.tipUsd),
      processorFeeUsd: money(sum.processorFeeUsd + row.processorFeeUsd),
      platformNetUsd: 0,
    }),
    {
      gmvUsd: 0,
      restaurantCommissionUsd: 0,
      restaurantNetUsd: 0,
      platformGrossUsd: 0,
      scoutResidualUsd: 0,
      driverCommissionUsd: 0,
      driverPayoutUsd: 0,
      deliveryFeeUsd: 0,
      tipUsd: 0,
      processorFeeUsd: 0,
      platformNetUsd: 0,
    },
  );
}

