/**
 * W-9 status that is safe to keep on a driver record.
 * The tax ID itself never lives here — only the last four digits.
 */

export const DRIVER_W9_LABEL = "Tax info (W-9) for your 1099";

export const DRIVER_W9_NOTE =
  "Hometown Runner keeps this for your 1099. This is not filed with the IRS from here.";

export const DRIVER_TAX_CLASSES = [
  { id: "individual", label: "Individual / sole proprietor" },
  { id: "c-corp", label: "C corporation" },
  { id: "s-corp", label: "S corporation" },
  { id: "partnership", label: "Partnership" },
  { id: "llc", label: "LLC" },
  { id: "other", label: "Other" },
] as const;

export type DriverTaxClass = (typeof DRIVER_TAX_CLASSES)[number]["id"];
export type DriverTinKind = "ssn" | "ein";

export type DriverW9Status = {
  legalName: string;
  businessName?: string;
  classification: DriverTaxClass;
  address: string;
  tinKind: DriverTinKind;
  tinLast4: string;
  certifiedName: string;
  certifiedAt: string;
};

export type DriverW9Private = DriverW9Status & {
  tin: string;
};

export function isDriverTaxClass(value: string): value is DriverTaxClass {
  return DRIVER_TAX_CLASSES.some((row) => row.id === value);
}

export function maskDriverTin(kind: DriverTinKind, last4: string): string {
  const tail = last4.replace(/\D/g, "").slice(-4);
  if (tail.length !== 4) return "••••";
  return kind === "ein" ? `**-***${tail}` : `***-**-${tail}`;
}

export function driverW9Summary(input: {
  packetRequired?: boolean;
  w9?: DriverW9Status | null;
}): string | null {
  if (input.w9) return `W-9 ${maskDriverTin(input.w9.tinKind, input.w9.tinLast4)}`;
  if (input.packetRequired) return "W-9 missing";
  return null;
}

export function sanitizeDriverW9(value: unknown): DriverW9Status | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const legalName = typeof row.legalName === "string" ? row.legalName.trim() : "";
  const businessName =
    typeof row.businessName === "string" ? row.businessName.trim() : "";
  const classification =
    typeof row.classification === "string" ? row.classification : "";
  const address = typeof row.address === "string" ? row.address.trim() : "";
  const tinKind = row.tinKind === "ein" ? "ein" : row.tinKind === "ssn" ? "ssn" : "";
  const tinLast4 =
    typeof row.tinLast4 === "string" ? row.tinLast4.replace(/\D/g, "").slice(-4) : "";
  const certifiedName =
    typeof row.certifiedName === "string" ? row.certifiedName.trim() : "";
  const certifiedAt =
    typeof row.certifiedAt === "string" ? row.certifiedAt.trim() : "";
  if (
    legalName.length < 2 ||
    !isDriverTaxClass(classification) ||
    address.length < 5 ||
    !tinKind ||
    tinLast4.length !== 4 ||
    certifiedName.length < 2 ||
    !certifiedAt
  ) {
    return undefined;
  }
  const status: DriverW9Status = {
    legalName: legalName.slice(0, 120),
    classification,
    address: address.slice(0, 200),
    tinKind,
    tinLast4,
    certifiedName: certifiedName.slice(0, 120),
    certifiedAt,
  };
  if (businessName) status.businessName = businessName.slice(0, 120);
  return status;
}

export function parseDriverW9Input(input: {
  legalName: string;
  businessName?: string;
  classification: string;
  address: string;
  tinKind: string;
  tin: string;
  certifiedName: string;
  certifiedOn: string;
  certified: boolean;
}): { ok: true; record: DriverW9Private } | { ok: false; error: string } {
  if (!input.certified) {
    return { ok: false, error: "Certify the W-9 before saving it." };
  }
  const legalName = input.legalName.trim();
  const address = input.address.trim();
  const certifiedName = input.certifiedName.trim();
  const certifiedOn = input.certifiedOn.trim();
  const digits = input.tin.replace(/\D/g, "");
  if (legalName.length < 2) return { ok: false, error: "Enter the legal name." };
  if (!isDriverTaxClass(input.classification)) {
    return { ok: false, error: "Choose a federal tax classification." };
  }
  if (address.length < 5) return { ok: false, error: "Enter the address on the W-9." };
  if (input.tinKind !== "ssn" && input.tinKind !== "ein") {
    return { ok: false, error: "Choose SSN or EIN." };
  }
  if (digits.length !== 9) {
    return { ok: false, error: "Enter the 9-digit SSN or EIN." };
  }
  if (certifiedName.length < 2) return { ok: false, error: "Sign with your full name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(certifiedOn)) {
    return { ok: false, error: "Add the date." };
  }
  const status = sanitizeDriverW9({
    legalName,
    businessName: input.businessName?.trim() ?? "",
    classification: input.classification,
    address,
    tinKind: input.tinKind,
    tinLast4: digits.slice(-4),
    certifiedName,
    certifiedAt: new Date(`${certifiedOn}T00:00:00.000Z`).toISOString(),
  });
  if (!status) return { ok: false, error: "Check the W-9 and try again." };
  return { ok: true, record: { ...status, tin: digits } };
}
