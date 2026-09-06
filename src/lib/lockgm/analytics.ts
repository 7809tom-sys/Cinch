import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/kv-store";
import {
  isLockgmAnalyticsEventName,
  normalizeLockgmAnalyticsTouch,
  touchDimension,
  type LockgmAnalyticsEventName,
  type LockgmAnalyticsGeo,
  type LockgmAnalyticsTouch,
} from "./analytics-types";

export type LockgmAnalyticsEvent = {
  id: string;
  eventName: LockgmAnalyticsEventName;
  /** GM ID when signed in; otherwise a consented, browser-local random ID. */
  subjectId: string;
  gmId: string | null;
  firstTouch: LockgmAnalyticsTouch | null;
  latestTouch: LockgmAnalyticsTouch | null;
  geo: LockgmAnalyticsGeo;
  occurredAt: string;
};

type AnalyticsStore = { events: LockgmAnalyticsEvent[] };

export type AnalyticsCustomer = {
  id: string;
  createdAt: string;
  updatedAt: string;
  lockgmProfile?: {
    gmId: string;
    displayName: string;
    updatedAt: string;
    attribution:
      | {
          source: string | null;
          referralCode: string | null;
          campaign: string | null;
          capturedAt: string;
        }
      | null;
    attributionConsentAt: string | null;
  };
};

export type LockgmAnalyticsFilters = {
  from?: string;
  to?: string;
  source?: string;
  campaign?: string;
  country?: string;
  region?: string;
};

export type LockgmAnalyticsSnapshot = {
  eventCount: number;
  activeGms: number;
  profileCompletion: { completed: number; eligible: number; rate: number };
  draftParticipation: number;
  funnel: Array<{
    stage: LockgmAnalyticsEventName;
    count: number;
    conversionRate: number;
  }>;
  acquisition: Array<{
    source: string;
    campaign: string;
    visitors: number;
    signupsStarted: number;
  }>;
  geography: Array<{
    country: string;
    region: string;
    visitors: number;
  }>;
};

const STORE_KEY = "lockgm-analytics";
const RETENTION_DAYS = 180;
const FUNNEL_STAGES: LockgmAnalyticsEventName[] = [
  "visit",
  "signup_started",
  "signup_completed",
  "profile_completed",
  "first_draft",
  "first_sim",
  "first_report",
];

function cleanSubjectId(value: string): string {
  return value.trim().slice(0, 100);
}

function cleanGeo(
  geo: Partial<LockgmAnalyticsGeo> | null | undefined,
): LockgmAnalyticsGeo {
  return {
    country:
      typeof geo?.country === "string"
        ? geo.country.trim().toUpperCase().slice(0, 2) || null
        : null,
    region:
      typeof geo?.region === "string"
        ? geo.region.trim().toUpperCase().slice(0, 12) || null
        : null,
  };
}

export function createLockgmAnalyticsEvent(input: {
  eventName: LockgmAnalyticsEventName;
  gmId?: string | null;
  anonymousId?: string | null;
  firstTouch?: Partial<Record<keyof LockgmAnalyticsTouch, unknown>> | null;
  latestTouch?: Partial<Record<keyof LockgmAnalyticsTouch, unknown>> | null;
  geo?: Partial<LockgmAnalyticsGeo> | null;
  occurredAt?: string;
}): LockgmAnalyticsEvent | null {
  const gmId = input.gmId?.trim().slice(0, 40) || null;
  const anonymousId = input.anonymousId
    ? cleanSubjectId(input.anonymousId)
    : null;
  if (
    anonymousId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      anonymousId,
    )
  ) {
    return null;
  }
  const subjectId = gmId || anonymousId;
  if (!subjectId) return null;
  return {
    id: randomUUID(),
    eventName: input.eventName,
    subjectId,
    gmId,
    firstTouch: normalizeLockgmAnalyticsTouch(input.firstTouch),
    latestTouch: normalizeLockgmAnalyticsTouch(input.latestTouch),
    geo: cleanGeo(input.geo),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

async function readAnalyticsStore(): Promise<AnalyticsStore> {
  const store = await readJsonStore<AnalyticsStore>(STORE_KEY, { events: [] });
  return { events: Array.isArray(store.events) ? store.events : [] };
}

export async function recordLockgmAnalyticsEvent(
  event: LockgmAnalyticsEvent,
): Promise<void> {
  const store = await readAnalyticsStore();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  store.events = [...store.events, event]
    .filter((item) => Date.parse(item.occurredAt) >= cutoff)
    .slice(-20_000);
  await writeJsonStore(STORE_KEY, store);
}

export async function listLockgmAnalyticsEvents(): Promise<
  LockgmAnalyticsEvent[]
> {
  const store = await readAnalyticsStore();
  return store.events;
}

function normalizedFilter(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function inDateRange(
  timestamp: string,
  filters: LockgmAnalyticsFilters,
): boolean {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return false;
  if (filters.from) {
    const from = Date.parse(`${filters.from}T00:00:00.000Z`);
    if (Number.isFinite(from) && time < from) return false;
  }
  if (filters.to) {
    const to = Date.parse(`${filters.to}T23:59:59.999Z`);
    if (Number.isFinite(to) && time > to) return false;
  }
  return true;
}

function touchMatches(
  touch: LockgmAnalyticsTouch | null | undefined,
  filters: LockgmAnalyticsFilters,
): boolean {
  const source = normalizedFilter(filters.source);
  const campaign = normalizedFilter(filters.campaign);
  if (source && touchDimension(touch, "source").toLowerCase() !== source) {
    return false;
  }
  if (
    campaign &&
    touchDimension(touch, "campaign").toLowerCase() !== campaign
  ) {
    return false;
  }
  return true;
}

function eventMatches(
  event: LockgmAnalyticsEvent,
  filters: LockgmAnalyticsFilters,
): boolean {
  const source = normalizedFilter(filters.source);
  const campaign = normalizedFilter(filters.campaign);
  const country = normalizedFilter(filters.country);
  const region = normalizedFilter(filters.region);
  const touchMatched =
    !source && !campaign
      ? true
      : touchMatches(event.firstTouch, filters) ||
        touchMatches(event.latestTouch, filters);
  return (
    inDateRange(event.occurredAt, filters) &&
    touchMatched &&
    (!country || event.geo.country?.toLowerCase() === country) &&
    (!region || event.geo.region?.toLowerCase() === region)
  );
}

function customerTouch(
  customer: AnalyticsCustomer,
): LockgmAnalyticsTouch | null {
  const attribution = customer.lockgmProfile?.attribution;
  if (!attribution) return null;
  return normalizeLockgmAnalyticsTouch({
    source: attribution.source,
    referralCode: attribution.referralCode,
    campaign: attribution.campaign,
  });
}

function customerMatches(
  customer: AnalyticsCustomer,
  filters: LockgmAnalyticsFilters,
): boolean {
  if (filters.country || filters.region) return false;
  return (
    inDateRange(customer.createdAt, filters) &&
    touchMatches(customerTouch(customer), filters)
  );
}

function stageSubjects(
  events: LockgmAnalyticsEvent[],
  stage: LockgmAnalyticsEventName,
): Set<string> {
  return new Set(
    events
      .filter((event) => event.eventName === stage)
      .map((event) => event.subjectId),
  );
}

function customerSubject(customer: AnalyticsCustomer): string {
  return customer.lockgmProfile?.gmId || customer.id;
}

export function buildLockgmAnalyticsSnapshot(
  events: LockgmAnalyticsEvent[],
  customers: AnalyticsCustomer[],
  filters: LockgmAnalyticsFilters = {},
): LockgmAnalyticsSnapshot {
  const filteredEvents = events.filter((event) => eventMatches(event, filters));
  const visitSubjects = stageSubjects(filteredEvents, "visit");
  const activeGms = new Set(
    filteredEvents
      .map((event) => event.gmId)
      .filter((gmId): gmId is string => Boolean(gmId)),
  ).size;
  const eligibleCustomers = customers.filter((customer) =>
    customerMatches(customer, filters),
  );
  const completedCustomers = eligibleCustomers.filter(
    (customer) =>
      Boolean(customer.lockgmProfile?.gmId) &&
      Boolean(customer.lockgmProfile?.displayName.trim()) &&
      customer.lockgmProfile.updatedAt !== customer.createdAt,
  );
  const stageCounts = new Map<LockgmAnalyticsEventName, Set<string>>();
  for (const stage of FUNNEL_STAGES) {
    stageCounts.set(stage, stageSubjects(filteredEvents, stage));
  }
  for (const customer of eligibleCustomers) {
    stageCounts.get("signup_completed")?.add(customerSubject(customer));
  }
  for (const customer of completedCustomers) {
    stageCounts.get("profile_completed")?.add(customerSubject(customer));
  }

  const acquisition = new Map<
    string,
    {
      source: string;
      campaign: string;
      visitors: Set<string>;
      signups: Set<string>;
    }
  >();
  for (const event of filteredEvents) {
    if (event.eventName !== "visit" && event.eventName !== "signup_started") {
      continue;
    }
    const touch = event.firstTouch ?? event.latestTouch;
    const source = touchDimension(touch, "source");
    const campaign = touchDimension(touch, "campaign");
    const key = `${source}\u0000${campaign}`;
    const row = acquisition.get(key) ?? {
      source,
      campaign,
      visitors: new Set<string>(),
      signups: new Set<string>(),
    };
    if (event.eventName === "visit") row.visitors.add(event.subjectId);
    if (event.eventName === "signup_started") row.signups.add(event.subjectId);
    acquisition.set(key, row);
  }

  const geography = new Map<
    string,
    { country: string; region: string; visitors: Set<string> }
  >();
  for (const event of filteredEvents) {
    if (event.eventName !== "visit" || !event.geo.country) continue;
    const country = event.geo.country;
    const region = event.geo.region ?? "Unspecified";
    const key = `${country}\u0000${region}`;
    const row = geography.get(key) ?? {
      country,
      region,
      visitors: new Set<string>(),
    };
    row.visitors.add(event.subjectId);
    geography.set(key, row);
  }

  const visitorCount = visitSubjects.size;
  return {
    eventCount: filteredEvents.length,
    activeGms,
    profileCompletion: {
      completed: completedCustomers.length,
      eligible: eligibleCustomers.length,
      rate: eligibleCustomers.length
        ? completedCustomers.length / eligibleCustomers.length
        : 0,
    },
    draftParticipation: stageCounts.get("first_draft")?.size ?? 0,
    funnel: FUNNEL_STAGES.map((stage) => {
      const count = stageCounts.get(stage)?.size ?? 0;
      return {
        stage,
        count,
        conversionRate: visitorCount ? count / visitorCount : 0,
      };
    }),
    acquisition: [...acquisition.values()]
      .map((row) => ({
        source: row.source,
        campaign: row.campaign,
        visitors: row.visitors.size,
        signupsStarted: row.signups.size,
      }))
      .sort(
        (a, b) =>
          b.visitors - a.visitors || a.source.localeCompare(b.source),
      ),
    geography: [...geography.values()]
      .map((row) => ({
        country: row.country,
        region: row.region,
        visitors: row.visitors.size,
      }))
      .sort(
        (a, b) =>
          b.visitors - a.visitors || a.country.localeCompare(b.country),
      ),
  };
}

export function isSupportedAnalyticsEvent(
  value: unknown,
): value is LockgmAnalyticsEventName {
  return isLockgmAnalyticsEventName(value);
}
