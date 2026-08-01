// Shown instead of the dashboard when we can't get real data yet, so the
// app fails helpfully rather than rendering an empty table with no explanation.
export default function SetupNotice({ error }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <h2 className="font-semibold">Couldn&apos;t load trade data</h2>
      <p className="mt-2 text-sm leading-6">{error}</p>
    </div>
  );
}
