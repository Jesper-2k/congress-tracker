import Link from "next/link";
import { getLatestTrades } from "@/lib/trades";
import { buildLeaderboardCandidates } from "@/lib/leaderboard";
import LeaderboardTable from "@/components/LeaderboardTable";
import SetupNotice from "@/components/SetupNotice";

// Cached for a day: this page fetches the full trades dataset and
// precomputes return stats for every qualifying member up front, so
// re-rendering it on every request would be wasteful for data that only
// updates upstream at most hourly. This route doesn't read searchParams,
// cookies, or headers (the filter bar is client-side — see
// LeaderboardTable), so it's eligible for this route-level caching rather
// than being forced into per-request dynamic rendering.
export const revalidate = 86400;

export default async function LeaderboardPage() {
  // Matches this route's own revalidate window (see comment on
  // getLatestTrades in lib/trades.js for why these need to agree).
  const { trades: allTrades, error } = await getLatestTrades({ revalidateSeconds: 86400 });

  if (error) {
    return (
      <main className="min-h-full flex-1 bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <SetupNotice error={error} />
        </div>
      </main>
    );
  }

  const now = new Date();
  const candidates = buildLeaderboardCandidates(allTrades, now);

  return (
    <main className="min-h-full flex-1 bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
        >
          ← Dashboard
        </Link>

        <header className="mb-8 mt-2">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Leaderboard — Top performing members
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Ranked by return vs S&amp;P 500 on disclosed trades
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            Data refreshes daily
          </p>
        </header>

        <LeaderboardTable candidates={candidates} />

        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
          Returns estimated from disclosed transaction ranges using midpoint values. Disclosure
          delay of up to 45 days means realistic returns may differ. Not investment advice.
        </p>
      </div>
    </main>
  );
}
