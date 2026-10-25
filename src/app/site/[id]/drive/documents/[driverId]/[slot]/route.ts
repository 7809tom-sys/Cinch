import { NextResponse } from "next/server";
import { requireDriverActor } from "@/lib/hometown-kitchen-session";
import { isMasterEmail } from "@/lib/master-auth";
import {
  driverDocKey,
  getDriverDocStore,
} from "@/lib/hometown-driver-doc-store";
import {
  canReadDriverDocument,
  isDriverDocSlot,
} from "@/lib/hometown-driver-docs";

export const dynamic = "force-dynamic";

/**
 * The only way to read a driver document. The private blob URL is never
 * sent to the browser.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; driverId: string; slot: string }> },
) {
  const { id, driverId, slot } = await context.params;
  const fileName = isDriverDocSlot(slot) ? slot : slot === "signature" ? slot : null;
  if (!fileName) {
    return new NextResponse("Not found", { status: 404 });
  }
  const loaded = await requireDriverActor(id);
  if (!loaded.ok || !loaded.actor) {
    return new NextResponse("Sign in as a driver.", { status: 401 });
  }
  const driver = loaded.ops.drivers.find((row) => row.id === driverId);
  if (!driver) return new NextResponse("Not found", { status: 404 });
  const allowed = canReadDriverDocument({
    viewerEmail: loaded.actor.email,
    viewerIsMaster: isMasterEmail(loaded.actor.email),
    driverEmail: driver.email,
  });
  if (!allowed) return new NextResponse("Not found", { status: 404 });
  const stored = await getDriverDocStore().read(
    driverDocKey(driver.email || driver.id),
    fileName,
  );
  if (!stored) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(stored.bytes), {
    headers: {
      "content-type": stored.mime,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
