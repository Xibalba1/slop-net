import { NextResponse } from "next/server";

import { getReleaseMetadata } from "@/lib/release";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getReleaseMetadata(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
