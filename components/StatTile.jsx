// Shared by SummaryStats (main dashboard) and MemberStatCards (member
// profile page) so the two stat-card grids stay visually consistent.
export default function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</div>
      )}
    </div>
  );
}
