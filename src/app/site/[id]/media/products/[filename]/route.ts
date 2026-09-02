import { NextResponse } from "next/server";
import { readSeedProductPhoto } from "@/lib/seed-product-media";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string; filename: string }>;
};

/** Serve a product photo grown into the Seed source tree. */
export async function GET(_request: Request, { params }: RouteProps) {
  const { id, filename } = await params;
  const photo = await readSeedProductPhoto({
    projectId: id,
    filename,
  });
  if (!photo) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.bytes), {
    status: 200,
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
