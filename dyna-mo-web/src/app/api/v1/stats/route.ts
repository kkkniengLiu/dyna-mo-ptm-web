import { NextResponse } from "next/server";

import { getStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getStats(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
