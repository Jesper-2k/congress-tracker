import { NextResponse } from "next/server";
import { getLatestTrades } from "@/lib/trades";

// A file named route.js (instead of page.js) inside app/ defines an API
// endpoint instead of a page — this one responds to GET requests at
// /api/trades. The Refresh button in the browser calls this to re-fetch
// the latest trades on demand, without reloading the whole page.
export async function GET() {
  const { trades, error } = await getLatestTrades({ fresh: true });

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  return NextResponse.json({ trades });
}
