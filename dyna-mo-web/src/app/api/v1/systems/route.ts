import { NextResponse } from "next/server";

import { getSystems } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const offset = Number(searchParams.get("offset") ?? "0");
  const systems = getSystems();
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const safeOffset = Math.max(offset, 0);

  return json({
    total: systems.length,
    limit: safeLimit,
    offset: safeOffset,
    data: systems.slice(safeOffset, safeOffset + safeLimit),
  });
}

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
