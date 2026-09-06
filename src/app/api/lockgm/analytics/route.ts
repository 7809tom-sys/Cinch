import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  buildLockgmAnalyticsSnapshot,
  createLockgmAnalyticsEvent,
  isSupportedAnalyticsEvent,
  listLockgmAnalyticsEvents,
  recordLockgmAnalyticsEvent,
} from "@/lib/lockgm/analytics";
import { listCustomers, type CustomerAccount } from "@/lib/customers";
import { getMasterSession } from "@/lib/master-auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requestFilters(request: Request) {
  const params = new URL(request.url).searchParams;
  return {
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    source: params.get("source") || undefined,
    campaign: params.get("campaign") || undefined,
    country: params.get("country") || undefined,
    region: params.get("region") || undefined,
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function aggregateCsv(snapshot: ReturnType<typeof buildLockgmAnalyticsSnapshot>) {
  const rows = [
    ["section", "label", "secondary", "count", "conversion_rate"],
    ...snapshot.funnel.map((row) => [
      "funnel",
      row.stage,
      "",
      row.count,
      row.conversionRate.toFixed(4),
    ]),
    ...snapshot.acquisition.map((row) => [
      "acquisition",
      row.source,
      row.campaign,
      row.visitors,
      "",
    ]),
    ...snapshot.geography.map((row) => [
      "geography",
      row.country,
      row.region,
      row.visitors,
      "",
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function customersForAnalytics(customers: CustomerAccount[]) {
  return customers.map((customer) => ({
    id: customer.id,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    lockgmProfile: customer.lockgmProfile,
  }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || body.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Analytics consent is required." },
      { status: 400 },
    );
  }
  if (!isSupportedAnalyticsEvent(body.eventName)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported analytics event." },
      { status: 400 },
    );
  }

  const customer = await getCurrentCustomer();
  const gmId = customer?.lockgmProfile?.gmId ?? null;
  const anonymousId =
    typeof body.anonymousId === "string" ? body.anonymousId : null;
  const headers = new Headers(request.headers);
  const event = createLockgmAnalyticsEvent({
    eventName: body.eventName,
    gmId,
    anonymousId,
    firstTouch: isRecord(body.firstTouch) ? body.firstTouch : null,
    latestTouch: isRecord(body.latestTouch) ? body.latestTouch : null,
    // Only coarse edge/server headers are read. IP, user-agent, and exact
    // location are intentionally never persisted.
    geo: {
      country: headers.get("x-vercel-ip-country"),
      region: headers.get("x-vercel-ip-country-region"),
    },
  });
  if (!event) {
    return NextResponse.json(
      { ok: false, error: "A signed-in GM or consented visitor ID is required." },
      { status: 400 },
    );
  }
  await recordLockgmAnalyticsEvent(event);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const master = await getMasterSession();
  if (!master) {
    return NextResponse.json(
      { ok: false, error: "Admin sign-in required." },
      { status: 401 },
    );
  }

  const [events, customers] = await Promise.all([
    listLockgmAnalyticsEvents(),
    listCustomers(),
  ]);
  const filters = requestFilters(request);
  const snapshot = buildLockgmAnalyticsSnapshot(
    events,
    customersForAnalytics(customers),
    filters,
  );
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    return new NextResponse(aggregateCsv(snapshot), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="lockgm-analytics.csv"',
      },
    });
  }
  return NextResponse.json({
    ok: true,
    filters,
    snapshot,
    privacy: {
      aggregateOnly: true,
      rawPrivateIdentityIncluded: false,
      preciseIpIncluded: false,
    },
  });
}
