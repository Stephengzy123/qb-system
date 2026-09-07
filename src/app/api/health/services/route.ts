import { NextResponse } from "next/server";
import { checkDatabase, checkR2 } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, r2] = await Promise.all([checkDatabase(), checkR2()]);

  return NextResponse.json(
    { database, r2, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
