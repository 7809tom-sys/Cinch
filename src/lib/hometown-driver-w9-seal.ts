import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import type { DriverW9Private } from "./hometown-driver-w9";
import { sanitizeDriverW9 } from "./hometown-driver-w9";

const FALLBACK_SECRET = "dev-insecure-cinch-master-secret";

function sealKey(): Buffer {
  const secret = process.env.AUTH_SECRET?.trim() || FALLBACK_SECRET;
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. The tax ID is not readable without AUTH_SECRET. */
export function sealDriverW9(record: DriverW9Private): Uint8Array {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(record), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]);
}

export function openDriverW9(bytes: Uint8Array): DriverW9Private | null {
  if (bytes.byteLength < 12 + 16 + 2) return null;
  const iv = bytes.subarray(0, 12);
  const tag = bytes.subarray(12, 28);
  const body = bytes.subarray(28);
  try {
    const decipher = createDecipheriv("aes-256-gcm", sealKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const status = sanitizeDriverW9(parsed);
    const tin = typeof parsed.tin === "string" ? parsed.tin.replace(/\D/g, "") : "";
    if (!status || tin.length !== 9) return null;
    return { ...status, tin };
  } catch {
    return null;
  }
}
