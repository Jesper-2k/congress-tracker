// Shared by Filters (main dashboard), MemberTradeHistory (member profile),
// and LeaderboardTable — three independent filter bars using the same
// segmented-control pattern.
export default function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
