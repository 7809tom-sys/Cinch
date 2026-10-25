import { createHash } from "crypto";
import {
  normalizeDeliveryDriver,
  type DeliveryDriver,
  type DeliveryOps,
} from "./seed-delivery";

export function normalizeDriverEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Stable id so a second sign-in with the same email reopens the same driver. */
export function signedInDriverId(email: string): string {
  const hash = createHash("sha256")
    .update(normalizeDriverEmail(email))
    .digest("hex")
    .slice(0, 12);
  return `drv-acct-${hash}`;
}

export function driverForEmail(
  ops: Pick<DeliveryOps, "drivers">,
  email: string,
): DeliveryDriver | null {
  const owner = normalizeDriverEmail(email);
  if (!owner.includes("@")) return null;
  return (
    ops.drivers.find((row) => (row.email ?? "").trim().toLowerCase() === owner) ??
    null
  );
}

/**
 * A sign-up only knows the email. License, insurance, and platform
 * activity stay false until that driver finishes the packet.
 */
export function blankSignedInDriver(email: string, now = new Date()): DeliveryDriver {
  const address = normalizeDriverEmail(email);
  return normalizeDeliveryDriver(
    {
      id: signedInDriverId(address),
      name: address,
      email: address,
      status: "pending",
      licenseOk: false,
      insuranceOk: false,
      existingPlatformActive: false,
      classification: "part_time",
      softwareCadence: "monthly",
      hoursOpenThisWeek: 0,
      hoursOpenLast4Weeks: 0,
      lastAppOpenAt: now.toISOString(),
      softwareUsdPerYear: 0,
      online: false,
      payoutTrigger: "min_balance",
      pendingPayoutUsd: 0,
      lastPayoutAt: null,
      taxFormsSelfManaged: true,
      firstDeliveredAt: null,
      packetRequired: true,
    },
    now,
  );
}

export function ensureSignedInDriver(
  ops: DeliveryOps,
  email: string,
  now = new Date(),
): { ops: DeliveryOps; driver: DeliveryDriver | null; created: boolean } {
  const existing = driverForEmail(ops, email);
  if (existing) return { ops, driver: existing, created: false };
  const address = normalizeDriverEmail(email);
  if (!address.includes("@")) return { ops, driver: null, created: false };
  const driver = blankSignedInDriver(address, now);
  return {
    ops: { ...ops, drivers: [...ops.drivers, driver] },
    driver,
    created: true,
  };
}
