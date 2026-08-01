// Shown automatically by Next.js while app/leaderboard/page.js's async work
// (the dataset fetch + per-member return calculations) resolves — a real
// loading boundary tied to real work, not a simulated delay. calculateMemberReturn()
// is synchronous and doesn't hit Yahoo Finance (see lib/simulator.js), so
// there's no per-member network step to reveal rows progressively against;
// the fifteen skeleton rows below (with a slight stagger) stand in for the
// eventual top-15 table as a single unit finishes loading together.
export default function LeaderboardLoading() {
  return (
    <main className="min-h-full flex-1 bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />

        <div className="mb-8 mt-4">
          <div className="h-7 w-96 max-w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-2 h-3 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="h-9 w-28 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-9 w-40 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-b border-neutral-100 bg-neutral-100/80 last:border-b-0 dark:border-neutral-800 dark:bg-neutral-900/80"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
