import Link from "next/link";
import { getLatestTrades } from "@/lib/trades";
import { getTradeDateRange } from "@/lib/dateRange";
import Dashboard from "@/components/Dashboard";
import SetupNotice from "@/components/SetupNotice";

// Re-fetch the trades dataset at most once an hour instead of on every page load.
export const revalidate = 3600;

function formatDate(dateStr) {
  // timeZone: "UTC" avoids the classic off-by-one where a "YYYY-MM-DD"
  // string parses to UTC midnight but renders in the server's local zone.
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// This is a Server Component (no "use client" at the top) — it runs on the
// server and can call getLatestTrades() directly with await. It just
// renders plain HTML plus the data, which we hand off to a Client Component
// below for the interactive parts (search, filters).
export default async function Home() {
  const { trades, error } = await getLatestTrades();
  const { from, to } = getTradeDateRange(trades);

  return (
    <main className="min-h-full flex-1 bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              Congressional Trade Tracker
            </h1>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-50"
            >
              Leaderboard →
            </Link>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Stock trades disclosed by U.S. House and Senate members under the STOCK Act.
          </p>
          {from && to && (
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
              Showing trades from {formatDate(from)} to {formatDate(to)}, refreshed daily from the
              upstream dataset.
            </p>
          )}
        </header>

        {error ? <SetupNotice error={error} /> : <Dashboard trades={trades} />}
      </div>
    </main>
  );
}
