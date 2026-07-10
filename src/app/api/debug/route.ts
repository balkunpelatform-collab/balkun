// مسیر: src/app/api/debug/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { success: false, error: "این مسیر در دسترس نیست" },
    { status: 404 }
  );
}