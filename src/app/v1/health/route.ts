import { NextResponse } from "next/server";
import { recordHeartbeat, type ToolHealthReport } from "@/lib/seed-watch";
import { verifyConnectRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export async function POST(request: Request) {
  let body: {
    seed?: string;
    key?: string;
    platform?: string;
    href?: string;
    ua?: string;
    tools?: ToolHealthReport[];
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const auth = await verifyConnectRequest(body.seed, body.key);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: cors },
    );
  }

  const beat = await recordHeartbeat({
    seedId: auth.project.id,
    platform: body.platform,
    href: body.href,
    ua: body.ua,
    tools: body.tools,
  });

  const failing = beat.tools.filter((tool) => !tool.ok);

  return NextResponse.json(
    {
      ok: true,
      id: beat.id,
      receivedAt: beat.receivedAt,
      toolsChecked: beat.tools.length,
      toolsFailing: failing.length,
    },
    { headers: cors },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
